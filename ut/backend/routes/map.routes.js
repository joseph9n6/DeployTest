const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const MapDocument = require("../models/MapDocument");

// Public: hent publiserte hytter/turer
router.get("/", async (_req, res) => {
  try {
    const docs = await MapDocument.find({ status: "published" })
      .select("docType geometry properties status updatedAt")
      .limit(2000);

    res.json({ ok: true, docs });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * TEMP: Seed test data (GET for nettleser)
 * Åpne: http://localhost:5000/api/map/seed
 * NB: Denne sletter ALLE MapDocument først.
 */
router.get("/seed", async (_req, res) => {
  try {
    await MapDocument.deleteMany({});

    const createdBy = new mongoose.Types.ObjectId();

    const cabin = await MapDocument.create({
      docType: "CABIN",
      geometry: {
        type: "Point",
        coordinates: [10.7461, 59.9127] // Oslo (lng, lat)
      },
      properties: {
        name: "Testhytte",
        description: "Dette er en testhytte"
      },
      status: "published",
      access: {
        editors: [],
        createdBy
      },
      versions: []
    });

    const tour = await MapDocument.create({
      docType: "TOUR",
      geometry: {
        type: "LineString",
        coordinates: [
          [10.7461, 59.9127],
          [10.752, 59.916],
          [10.76, 59.92]
        ]
      },
      properties: {
        name: "Testtur",
        difficulty: "Enkel",
        description: "Kort testtur i nærheten av Oslo"
      },
      status: "published",
      access: {
        editors: [],
        createdBy
      },
      versions: []
    });

    res.json({ ok: true, cabin, tour });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * TEMP: Seed test data (POST for API-klienter)
 * Kjør: POST http://localhost:5000/api/map/seed
 * NB: Denne sletter ALLE MapDocument først.
 */
router.post("/seed", async (_req, res) => {
  try {
    await MapDocument.deleteMany({});

    const createdBy = new mongoose.Types.ObjectId();

    const cabin = await MapDocument.create({
      docType: "CABIN",
      geometry: {
        type: "Point",
        coordinates: [10.7461, 59.9127]
      },
      properties: {
        name: "Testhytte",
        description: "Dette er en testhytte"
      },
      status: "published",
      access: {
        editors: [],
        createdBy
      },
      versions: []
    });

    const tour = await MapDocument.create({
      docType: "TOUR",
      geometry: {
        type: "LineString",
        coordinates: [
          [10.7461, 59.9127],
          [10.752, 59.916],
          [10.76, 59.92]
        ]
      },
      properties: {
        name: "Testtur",
        difficulty: "Enkel",
        description: "Kort testtur i nærheten av Oslo"
      },
      status: "published",
      access: {
        editors: [],
        createdBy
      },
      versions: []
    });

    res.json({ ok: true, cabin, tour });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * TEMP: Publiser alt (hvis du har data men status ikke er "published")
 * Kjør: POST http://localhost:5000/api/map/publish-all
 */
router.post("/publish-all", async (_req, res) => {
  try {
    const result = await MapDocument.updateMany(
      { status: { $ne: "published" } },
      { $set: { status: "published" } }
    );

    res.json({ ok: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Public: hent én doc (kun hvis published)
// Legg denne NEDERST så den ikke “tar” /seed som :id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, message: "Ugyldig id" });
    }

    const doc = await MapDocument.findOne({ _id: id, status: "published" }).select(
      "docType geometry properties status updatedAt"
    );

    if (!doc) return res.status(404).json({ ok: false, message: "Ikke funnet" });

    res.json({ ok: true, doc });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
