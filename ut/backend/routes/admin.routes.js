const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");

const { requireAuth } = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");

const ALLOWED_ROLES = ["CUSTOMER", "TOUR_LEADER", "CABIN_OWNER", "ADMIN"];

// Test-endepunkt (for å sjekke at route fungerer)
router.get("/ping", (_req, res) => {
  res.json({ ok: true, message: "admin ok" });
});

// ADMIN: liste brukere (enkelt søk)
router.get("/users", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();

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
      .limit(50);

    res.json({ ok: true, users });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ADMIN: sett roller på en bruker (overskriver rollene)
router.put("/users/:id/roles", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, message: "Ugyldig id" });
    }

    const roles = req.body?.roles;

    if (!Array.isArray(roles) || roles.length === 0) {
      return res
        .status(400)
        .json({ ok: false, message: "roles må være en array med minst én rolle" });
    }

    for (const r of roles) {
      if (!ALLOWED_ROLES.includes(r)) {
        return res.status(400).json({ ok: false, message: `Ugyldig rolle: ${r}` });
      }
    }

    const uniqueRoles = [...new Set(roles)];

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { roles: uniqueRoles } },
      { new: true, select: "username email roles" }
    );

    if (!user) return res.status(404).json({ ok: false, message: "Bruker ikke funnet" });

    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
