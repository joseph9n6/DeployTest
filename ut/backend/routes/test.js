const express = require("express");
const TestDoc = require("../models/TestDoc");

const router = express.Router();

// POST /api/test/create
router.post("/create", async (req, res) => {
  try {
    const { message, createdBy } = req.body;

    const doc = await TestDoc.create({
      message: message || "Hello from backend!",
      createdBy: createdBy || "local-dev",
    });

    res.status(201).json({ ok: true, doc });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// GET /api/test/all
router.get("/all", async (_req, res) => {
  try {
    const docs = await TestDoc.find().sort({ createdAt: -1 }).limit(50);
    res.json({ ok: true, count: docs.length, docs });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// DELETE /api/test/all (valgfritt)
router.delete("/all", async (_req, res) => {
  try {
    const result = await TestDoc.deleteMany({});
    res.json({ ok: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
