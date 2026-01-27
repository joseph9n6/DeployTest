// backend/routes/auth.routes.js
const express = require("express");
const bcrypt = require("bcrypt");
const passport = require("passport");
const User = require("../models/User");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

function toSafeUser(u) {
  if (!u) return null;

  const roles = Array.isArray(u.roles) && u.roles.length ? u.roles : ["CUSTOMER"];

  return {
    _id: u._id,
    id: String(u._id),
    username: u.username,
    email: u.email,
    roles,
    profile: u.profile || null
  };
}

/**
 * POST /api/auth/register
 * Oppretter bruker + logger inn automatisk
 */
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body || {};

    if (!username || !email || !password) {
      return res.status(400).json({ ok: false, message: "Mangler felter" });
    }

    const u = String(username).toLowerCase().trim();
    const e = String(email).toLowerCase().trim();

    const exists = await User.findOne({ $or: [{ username: u }, { email: e }] });
    if (exists) {
      return res.status(409).json({
        ok: false,
        message: "Brukernavn eller e-post er allerede i bruk"
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const created = await User.create({
      username: u,
      email: e,
      passwordHash,
      roles: ["CUSTOMER"]
    });

    req.login(created, async (err) => {
      if (err) {
        return res.status(500).json({ ok: false, message: "Kunne ikke logge inn etter register" });
      }

      const fresh = await User.findById(created._id).select("username email roles profile");
      return res.status(201).json({ ok: true, user: toSafeUser(fresh) });
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * POST /api/auth/login
 * body: { identifier, password }
 */
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: info?.message || "Feil innlogging"
      });
    }

    req.login(user, async (err2) => {
      if (err2) return next(err2);

      try {
        const fresh = await User.findById(user._id).select("username email roles profile");
        return res.json({ ok: true, user: toSafeUser(fresh) });
      } catch (e) {
        return res.status(500).json({ ok: false, message: e.message });
      }
    });
  })(req, res, next);
});

/**
 * POST /api/auth/logout
 */
router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);

    const clearOpts = { path: "/" };

    if (req.session) {
      req.session.destroy(() => {
        res.clearCookie("sid", clearOpts);
        res.clearCookie("connect.sid", clearOpts);
        res.json({ ok: true });
      });
    } else {
      res.clearCookie("sid", clearOpts);
      res.clearCookie("connect.sid", clearOpts);
      res.json({ ok: true });
    }
  });
});

/**
 * GET /api/auth/me
 * Returnerer innlogget bruker (eller null)
 */
router.get("/me", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.json({ ok: true, user: null });
    }

    const userId = req.user?._id || req.user?.id;
    const fresh = await User.findById(userId).select("username email roles profile");
    return res.json({ ok: true, user: toSafeUser(fresh) });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * DEBUG: raw req.user (fra session)
 */
router.get("/debug-session", (req, res) => {
  res.json({ ok: true, user: req.user || null });
});

/**
 * DEBUG: leser DB-user direkte (krever innlogging)
 */
router.get("/db-me", requireAuth, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const dbUser = await User.findById(userId).select("username email roles profile");
    res.json({ ok: true, dbUser });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
