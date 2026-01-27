// backend/routes/public.routes.js
const express = require("express");
const Tour = require("../models/Tour");

const router = express.Router();

/**
 * GET /api/public/home
 * Returnerer "featured" tur og hytte (nyeste publiserte)
 *
 * Tour: hentes fra Tour collectionen.
 * Cabin: kan legges til senere (returnerer null nå).
 */
router.get("/home", async (_req, res) => {
  try {
    // Nyeste publiserte (eller FULL) tour
    const t = await Tour.findOne({ status: { $in: ["PUBLISHED", "FULL"] } })
      .sort({ createdAt: -1 })
      .select(
        "title coverImage shortDescription startLocation endLocation startDateTime price difficulty fitnessLevel createdAt"
      );

    const trip = t
      ? {
          _id: t._id,
          title: t.title || "Tur",

          // Home.jsx bruker item.imageUrl. Vi map-er coverImage -> imageUrl
          imageUrl: t.coverImage || "",

          // Ekstra felter (valgfritt å bruke i UI)
          shortDescription: t.shortDescription || "",
          startName: t.startLocation?.name || "",
          endName: t.endLocation?.name || "",
          startDateTime: t.startDateTime || null,
          priceAmount: t.price?.amount ?? 0,
          currency: t.price?.currency || "NOK",
          difficulty: t.difficulty || "",
          fitnessLevel: t.fitnessLevel || ""
        }
      : null;

    // Cabin kan du implementere senere
    const cabin = null;

    return res.json({
      ok: true,
      featured: { trip, cabin }
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
