// models/MapDocument.js
const mongoose = require("mongoose");

const VersionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    geometry: { type: Object, required: true },   // GeoJSON snapshot
    properties: { type: Object, default: {} },    // snapshot av felter
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedAt: { type: Date, default: Date.now },
    note: { type: String, default: "" }
  },
  { _id: false }
);

const AccessSchema = new mongoose.Schema(
  {
    editors: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // ledere som kan redigere
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { _id: false }
);

const MapDocumentSchema = new mongoose.Schema(
  {
    docType: { type: String, enum: ["CABIN", "TOUR"], required: true },

    // GeoJSON
    geometry: { type: Object, required: true },

    // Alle “feltene” for visning
    properties: { type: Object, default: {} },

    // Publiseringsflyt
    status: { type: String, enum: ["draft", "pending", "published", "archived"], default: "draft" },

    // Hvem kan redigere
    access: { type: AccessSchema, required: true },

    // Historikk (Word Online-lignende revisjon)
    versions: { type: [VersionSchema], default: [] },

    // For “låsing” så to ledere ikke redigerer samtidig
    editLock: {
      lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      lockedAt: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

// Viktig for kart-queries
MapDocumentSchema.index({ geometry: "2dsphere" });
MapDocumentSchema.index({ docType: 1, status: 1 });

module.exports = mongoose.model("MapDocument", MapDocumentSchema);
