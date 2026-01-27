const mongoose = require("mongoose");

const roleRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    requestedRole: {
      type: String,
      required: true,
      enum: ["CABIN_OWNER", "TOUR_LEADER"]
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING"
    },
    message: { type: String, trim: true, default: "" },
    adminNote: { type: String, trim: true, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// Optional (ikke kritisk): index for raskere spørringer
roleRequestSchema.index({ userId: 1, requestedRole: 1, status: 1 });

// VIKTIG: eksporter MODELLEN direkte (ikke objekt, ikke schema)
module.exports = mongoose.models.RoleRequest || mongoose.model("RoleRequest", roleRequestSchema);
