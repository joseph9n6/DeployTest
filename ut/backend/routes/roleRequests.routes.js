const express = require("express");
const RoleRequest = require("../models/RoleRequest");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

/**
 * POST /api/role-requests
 * Kunde søker om CABIN_OWNER eller TOUR_LEADER
 * body: { requestedRole: "CABIN_OWNER" | "TOUR_LEADER", message?: string }
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const { requestedRole, message } = req.body || {};

    if (!["CABIN_OWNER", "TOUR_LEADER"].includes(requestedRole)) {
      return res.status(400).json({ ok: false, message: "Invalid requestedRole" });
    }

    // Ikke la bruker søke på rolle de allerede har
    const roles = Array.isArray(req.user.roles) ? req.user.roles : [];
    if (roles.includes(requestedRole)) {
      return res.status(400).json({ ok: false, message: "User already has this role" });
    }

    // Hvis du bruker den "partial unique index" i modellen,
    // vil DB stoppe duplikat PENDING automatisk.
    const created = await RoleRequest.create({
      userId,
      requestedRole,
      message: message || ""
    });

    res.status(201).json({ ok: true, request: created });
  } catch (err) {
    // Duplicate key (pending finnes allerede)
    if (err?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Request already pending" });
    }
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * GET /api/role-requests/me
 * Kunde ser sine søknader
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const requests = await RoleRequest.find({ userId }).sort({ createdAt: -1 });
    res.json({ ok: true, requests });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
