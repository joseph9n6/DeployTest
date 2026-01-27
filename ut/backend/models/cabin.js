// backend/models/Cabin.js
const mongoose = require("mongoose");

const cabinSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    location: { type: String, required: true, trim: true, maxlength: 200 },

    pricePerNight: { type: Number, default: 0, min: 0 },

    // owner = user som eier hytta (CABIN_OWNER)
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // (valgfritt) hvis du vil ha bilder senere
    coverImage: { type: String, default: "" },
    galleryImages: { type: [String], default: [] },

    status: { type: String, enum: ["DRAFT", "PUBLISHED"], default: "DRAFT" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cabin", cabinSchema);
