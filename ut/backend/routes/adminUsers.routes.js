const express = require("express");
const User = require("../models/User");
const { requireAuth } = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

/**
 * GET /api/admin/users?q=...
 * - Søk på username eller email
 * - Returnerer liste (begrenset)
 */
router.get("/users", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    const filter = q
      ? {
          $or: [
            { username: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } }
          ]
        }
      : {};

    const users = await User.find(filter)
      .select("username email roles createdAt")
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ ok: true, users });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * body: { role: "CUSTOMER"|"CABIN_OWNER"|"TOUR_LEADER"|"ADMIN" }
 *
 * UI velger 1 "hovedrolle". Vi lagrer som array:
 * - CUSTOMER alltid med (baseline)
 * - + evt CABIN_OWNER / TOUR_LEADER / ADMIN
 */
router.patch("/users/:id/role", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const targetId = req.params.id;
    const myId = String(req.user?._id || req.user?.id || "");

    const { role } = req.body || {};
    const allowed = ["CUSTOMER", "CABIN_OWNER", "TOUR_LEADER", "ADMIN"];
    if (!allowed.includes(role)) {
      return res.status(400).json({ ok: false, message: "Invalid role" });
    }

    // Ikke la admin endre seg selv til noe farlig ved uhell (valgfritt, men tryggere)
    // Her lar vi endring, men vi stopper "siste admin"-scenario under.

    const user = await User.findById(targetId).select("roles");
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    const prevRoles = Array.isArray(user.roles) ? user.roles : [];
    const wasAdmin = prevRoles.includes("ADMIN");

    // Bygg nye roller
    let next = ["CUSTOMER"];
    if (role !== "CUSTOMER") next.push(role);

    // Hvis vi fjerner ADMIN fra en admin, sjekk at det finnes minst én admin igjen
    const willBeAdmin = next.includes("ADMIN");
    if (wasAdmin && !willBeAdmin) {
      const adminCount = await User.countDocuments({ roles: "ADMIN" });
      if (adminCount <= 1) {
        return res.status(400).json({ ok: false, message: "Kan ikke fjerne siste ADMIN" });
      }
    }

    user.roles = next;
    await user.save();

    return res.json({ ok: true, user: { id: String(user._id), roles: user.roles } });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * DELETE /api/admin/users/:id
 * - Ikke la admin slette seg selv
 * - Ikke la admin slette siste admin
 */
router.delete("/users/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const targetId = req.params.id;
    const myId = String(req.user?._id || req.user?.id || "");

    if (String(targetId) === String(myId)) {
      return res.status(400).json({ ok: false, message: "Du kan ikke slette din egen admin-bruker" });
    }

    const target = await User.findById(targetId).select("roles");
    if (!target) return res.status(404).json({ ok: false, message: "User not found" });

    const isAdmin = Array.isArray(target.roles) && target.roles.includes("ADMIN");
    if (isAdmin) {
      const adminCount = await User.countDocuments({ roles: "ADMIN" });
      if (adminCount <= 1) {
        return res.status(400).json({ ok: false, message: "Kan ikke slette siste ADMIN" });
      }
    }

    await User.findByIdAndDelete(targetId);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
