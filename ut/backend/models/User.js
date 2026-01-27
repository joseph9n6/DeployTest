const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    avatarUrl: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },

    // ✅ legg til dette:
    roles: { type: [String], default: ["customer"] },

    profile: { type: profileSchema, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

