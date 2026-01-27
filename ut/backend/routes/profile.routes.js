// backend/routes/profile.routes.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const User = require("../models/User");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

// ---------------- multer setup (avatar) ----------------
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

// Ensure uploads dir exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeOriginal = (file.originalname || "avatar").replace(/[^\w.\-]/g, "_");
    cb(null, `${Date.now()}-${safeOriginal}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ok = /^image\//.test(file.mimetype);
    if (!ok) return cb(new Error("Only image files are allowed"), false);
    cb(null, true);
  }
});

// helper: delete file safely
function safeUnlink(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) {}
}

// helper: get user id from req.user
function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

// ---------------- routes ----------------

// GET /api/profile
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const user = await User.findById(userId).select("profile username email roles");
    if (!user) return res.status(404).json({ ok: false, error: "User not found" });

    res.json({
      ok: true,
      profile: user.profile || { fullName: "", bio: "", location: "", avatarUrl: "" },
      user: { username: user.username, email: user.email, roles: user.roles }
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile (create/update)
router.put("/", requireAuth, async (req, res, next) => {
  try {
    const userId = getUserId(req);

    // støtter både {profile:{...}} og {...}
    const patch = req.body?.profile ?? req.body ?? {};

    // vi lar avatarUrl være styrt av avatar-endepunktene (upload/delete),
    // men om du vil tillate manuell setting, fjern denne linjen:
    if ("avatarUrl" in patch) delete patch.avatarUrl;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { profile: { ...patch } } },
      { new: true, runValidators: true, select: "profile" }
    );

    if (!user) return res.status(404).json({ ok: false, error: "User not found" });

    res.json({ ok: true, profile: user.profile });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/profile/avatar
 * Upload avatar image (multipart/form-data) field name: "avatar"
 * Saves to /uploads/<filename> and stores in user.profile.avatarUrl
 */
router.post("/avatar", requireAuth, upload.single("avatar"), async (req, res, next) => {
  try {
    const userId = getUserId(req);

    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    const newUrl = `/uploads/${req.file.filename}`;

    // find existing avatar to delete if it is a local upload
    const user = await User.findById(userId).select("profile");
    if (!user) {
      safeUnlink(req.file.path);
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    const oldUrl = user?.profile?.avatarUrl || "";
    const oldIsLocal = typeof oldUrl === "string" && oldUrl.startsWith("/uploads/");

    // update user avatarUrl
    user.profile = user.profile || {};
    user.profile.avatarUrl = newUrl;
    await user.save();

    // delete old file (if local)
    if (oldIsLocal) {
      const oldPath = path.join(UPLOAD_DIR, path.basename(oldUrl));
      safeUnlink(oldPath);
    }

    return res.json({ ok: true, avatarUrl: newUrl, profile: user.profile });
  } catch (err) {
    // if something fails, remove newly uploaded file to avoid orphan files
    safeUnlink(req.file?.path);
    return next(err);
  }
});

/**
 * DELETE /api/profile/avatar
 * Removes avatar from profile and deletes local file if stored in /uploads
 */
router.delete("/avatar", requireAuth, async (req, res, next) => {
  try {
    const userId = getUserId(req);

    const user = await User.findById(userId).select("profile");
    if (!user) return res.status(404).json({ ok: false, error: "User not found" });

    const oldUrl = user?.profile?.avatarUrl || "";
    const oldIsLocal = typeof oldUrl === "string" && oldUrl.startsWith("/uploads/");

    // clear avatarUrl
    user.profile = user.profile || {};
    user.profile.avatarUrl = "";
    await user.save();

    // delete local file
    if (oldIsLocal) {
      const oldPath = path.join(UPLOAD_DIR, path.basename(oldUrl));
      safeUnlink(oldPath);
    }

    return res.json({ ok: true, avatarUrl: "", profile: user.profile });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/profile (delete profile only)
router.delete("/", requireAuth, async (req, res, next) => {
  try {
    const userId = getUserId(req);

    // valgfritt: også fjern avatarfil når du sletter profilinfo
    const user = await User.findById(userId).select("profile");
    if (user?.profile?.avatarUrl && String(user.profile.avatarUrl).startsWith("/uploads/")) {
      const oldPath = path.join(UPLOAD_DIR, path.basename(user.profile.avatarUrl));
      safeUnlink(oldPath);
    }

    await User.findByIdAndUpdate(userId, { $set: { profile: null } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/profile/account (delete user)
router.delete("/account", requireAuth, async (req, res, next) => {
  try {
    const userId = getUserId(req);

    // valgfritt: fjern avatarfil før sletting
    const user = await User.findById(userId).select("profile");
    if (user?.profile?.avatarUrl && String(user.profile.avatarUrl).startsWith("/uploads/")) {
      const oldPath = path.join(UPLOAD_DIR, path.basename(user.profile.avatarUrl));
      safeUnlink(oldPath);
    }

    await User.findByIdAndDelete(userId);

    // passport logout
    req.logout(() => res.json({ ok: true }));
  } catch (err) {
    next(err);
  }
});

// DEBUG – hvem er innlogget bruker (midlertidig)
router.get("/debug/me", requireAuth, (req, res) => {
  res.json(req.user);
});

module.exports = router;
