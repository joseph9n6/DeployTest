// backend/models/Tour.js
const mongoose = require("mongoose");

const pointSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 }
  },
  { _id: false }
);

const priceSchema = new mongoose.Schema(
  {
    amount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "NOK", uppercase: true, trim: true }
  },
  { _id: false }
);

/**
 * OBS:
 * Frontend-payloaden din sender ofte:
 * - coverImage: null  (OK)
 * - coverImage: "https://..." (string)
 * - galleryImages: ["https://...","https://..."] (strings)
 *
 * Derfor må schema støtte string-URLer direkte.
 */
const tourSchema = new mongoose.Schema(
  {
    // Core
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    shortDescription: { type: String, trim: true, maxlength: 300, default: "" },
    fullDescription: { type: String, trim: true, maxlength: 8000, default: "" },

    // Locations
    startLocation: { type: pointSchema, required: true },
    endLocation: { type: pointSchema, required: true },

    // Time
    startDateTime: { type: Date, required: true },
    endDateTime: { type: Date, required: true },
    estimatedDurationHours: { type: Number, min: 0, default: 0 },

    // Capacity
    maxParticipants: { type: Number, required: true, min: 1, max: 200 },
    participantsCount: { type: Number, default: 0, min: 0 },

    // Selling points
    price: { type: priceSchema, default: () => ({ amount: 0, currency: "NOK" }) },
    includes: { type: [String], default: [] },
    notIncluded: { type: [String], default: [] },

    difficulty: { type: String, enum: ["EASY", "MODERATE", "HARD"], default: "MODERATE" },
    fitnessLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], default: "MEDIUM" },
    ageLimit: { type: Number, min: 0, max: 100, default: 0 },
    equipmentRequired: { type: [String], default: [] },

    // Images (string URLs)
    coverImage: { type: String, trim: true, default: null },
    galleryImages: { type: [String], default: [] },

    // Ownership
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Publishing
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "FULL", "CANCELLED"],
      default: "DRAFT"
    }
  },
  { timestamps: true }
);

// Virtual: availableSpots
tourSchema.virtual("availableSpots").get(function () {
  const left = (this.maxParticipants || 0) - (this.participantsCount || 0);
  return left < 0 ? 0 : left;
});

// ---- Robust validations (NO next()) ----
tourSchema.pre("validate", function () {
  if (this.endDateTime && this.startDateTime && this.endDateTime <= this.startDateTime) {
    throw new Error("endDateTime must be after startDateTime");
  }
  if (this.participantsCount != null && this.maxParticipants != null) {
    if (this.participantsCount > this.maxParticipants) {
      throw new Error("participantsCount cannot exceed maxParticipants");
    }
  }

  // Normaliser bilder:
  // - fjern tomme strings
  if (Array.isArray(this.galleryImages)) {
    this.galleryImages = this.galleryImages.map((s) => String(s || "").trim()).filter(Boolean);
  }

  if (this.coverImage !== null && this.coverImage !== undefined) {
    const ci = String(this.coverImage || "").trim();
    this.coverImage = ci ? ci : null;
  }
});

// Keep status synced to capacity (NO next())
tourSchema.pre("save", function () {
  if (this.status === "PUBLISHED" && this.availableSpots === 0) {
    this.status = "FULL";
  }
});

tourSchema.set("toJSON", { virtuals: true });
tourSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Tour", tourSchema);
