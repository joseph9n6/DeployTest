const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tourId: { type: mongoose.Schema.Types.ObjectId, ref: "Tour", required: true, index: true },

    status: { type: String, enum: ["CONFIRMED", "CANCELLED"], default: "CONFIRMED" }
  },
  { timestamps: true }
);

// Kritisk: hindrer dobbel-booking på DB-nivå
bookingSchema.index({ userId: 1, tourId: 1 }, { unique: true });

module.exports = mongoose.model("Booking", bookingSchema);
