const express = require("express");
const RoleRequest = require("../models/RoleRequest");
const User = require("../models/User");
const { requireAuth } = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

function getAdminId(req) {
  return req.user?._id || req.user?.id || null;
}

// GET /api/admin/role-requests?status=PENDING
router.get("/role-requests", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const status = req.query.status || "PENDING";

    const requests = await RoleRequest.find({ status })
      .populate("userId", "username email roles profile")
      .sort({ createdAt: -1 });

    res.json({ ok: true, requests });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// PATCH /api/admin/role-requests/:id/approve
router.patch("/role-requests/:id/approve", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const adminId = getAdminId(req);
    if (!adminId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const { adminNote } = req.body || {};

    const request = await RoleRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ ok: false, message: "Not found" });
    if (request.status !== "PENDING") {
      return res.status(400).json({ ok: false, message: "Already reviewed" });
    }

    const user = await User.findById(request.userId).select("roles");
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });

    const role = request.requestedRole;
    const roles = Array.isArray(user.roles) ? user.roles : [];
    if (!roles.includes(role)) roles.push(role);

    user.roles = roles;
    await user.save();

    request.status = "APPROVED";
    request.adminNote = adminNote ?? "";
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    await request.save();

    res.json({ ok: true, request });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// PATCH /api/admin/role-requests/:id/reject
router.patch("/role-requests/:id/reject", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const adminId = getAdminId(req);
    if (!adminId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const { adminNote } = req.body || {};

    const request = await RoleRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ ok: false, message: "Not found" });
    if (request.status !== "PENDING") {
      return res.status(400).json({ ok: false, message: "Already reviewed" });
    }

    request.status = "REJECTED";
    request.adminNote = adminNote ?? "";
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    await request.save();

    res.json({ ok: true, request });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
