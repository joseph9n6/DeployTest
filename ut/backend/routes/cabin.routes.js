// backend/routes/cabin.routes.js
const router = require("express").Router();
const { requireAuth } = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");
const Cabin = require("../models/Cabin");

function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

// GET /api/cabins/mine (CABIN_OWNER eller ADMIN)
router.get("/mine", requireAuth, requireRole("CABIN_OWNER", "ADMIN"), async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const isAdmin = Array.isArray(req.user?.roles) && req.user.roles.includes("ADMIN");

    const q = isAdmin ? {} : { owner: userId };

    const cabins = await Cabin.find(q).sort({ createdAt: -1 }).limit(200);
    res.json({ ok: true, cabins });
  } catch (err) {
    next(err);
  }
});

// POST /api/cabins (CABIN_OWNER eller ADMIN)
router.post("/", requireAuth, requireRole("CABIN_OWNER", "ADMIN"), async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { title, location, pricePerNight } = req.body;

    const cabin = await Cabin.create({
      title,
      location,
      pricePerNight,
      owner: userId
    });

    res.status(201).json({ ok: true, cabin });
  } catch (err) {
    next(err);
  }
});

// PUT /api/cabins/:id (CABIN_OWNER eller ADMIN) - oppdater egne (admin kan oppdatere alle)
router.put("/:id", requireAuth, requireRole("CABIN_OWNER", "ADMIN"), async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const isAdmin = Array.isArray(req.user?.roles) && req.user.roles.includes("ADMIN");

    const filter = isAdmin ? { _id: req.params.id } : { _id: req.params.id, owner: userId };

    const updated = await Cabin.findOneAndUpdate(filter, req.body, { new: true, runValidators: true });

    if (!updated) {
      return res.status(404).json({ ok: false, error: "Cabin not found" });
    }

    res.json({ ok: true, cabin: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
