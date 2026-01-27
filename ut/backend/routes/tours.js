// backend/routes/tours.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const mongoose = require("mongoose");

const Tour = require("../models/Tour");
const Booking = require("../models/Booking");
const { requireAuth } = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

// ---------------- multer setup ----------------
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

// Ensure uploads dir exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeOriginal = (file.originalname || "image").replace(/[^\w.\-]/g, "_");
    cb(null, `${Date.now()}-${safeOriginal}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter: (req, file, cb) => {
    const ok = /^image\//.test(file.mimetype);
    if (!ok) return cb(new Error("Only image files are allowed"), false);
    cb(null, true);
  }
});

// Expect BOTH fields
const uploadTourImages = upload.fields([
  { name: "coverImage", maxCount: 1 },
  { name: "galleryImages", maxCount: 10 }
]);

// ---------- helpers ----------
function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

function toNumberOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

function cleanString(v, max = 500) {
  if (v === null || v === undefined) return "";
  return String(v).trim().slice(0, max);
}

// For JSON payload: body.startLocation = {name,lat,lng}
// For multipart: startLat/startLng/startName etc.
function ensureLocationFromBody(body, prefix /* "start" | "end" */) {
  // JSON-style
  const objKey = prefix === "start" ? "startLocation" : "endLocation";
  const loc = body && typeof body[objKey] === "object" ? body[objKey] : null;
  if (loc) {
    const lat = toNumberOrNull(loc.lat);
    const lng = toNumberOrNull(loc.lng);
    const name = cleanString(loc.name, 120);
    if (lat === null || lng === null) return null;
    return { name, lat, lng };
  }

  // multipart-style
  const name = cleanString(body?.[`${prefix}Name`], 120);
  const lat = toNumberOrNull(body?.[`${prefix}Lat`]);
  const lng = toNumberOrNull(body?.[`${prefix}Lng`]);

  if (lat === null || lng === null) return null;
  return { name, lat, lng };
}

/**
 * coverImage: stored as STRING in MongoDB (Tour schema expects String).
 * Accepts file upload via req.files.coverImage[0]
 */
function coverImageUrlFromFiles(req) {
  const f = req.files?.coverImage?.[0];
  if (!f) return null;
  return `/uploads/${f.filename}`;
}

/**
 * galleryImages:
 * - If sent as uploaded files: req.files.galleryImages[]
 * - If sent as JSON array of URLs: body.galleryImages (optional)
 *
 * Store as string[] URLs
 */
function buildGalleryImages(body, req) {
  const out = [];

  // 1) Uploaded files
  const files = Array.isArray(req.files?.galleryImages) ? req.files.galleryImages : [];
  for (const f of files) {
    if (f?.filename) out.push(`/uploads/${f.filename}`);
  }

  // 2) Optional URL strings
  if (Array.isArray(body?.galleryImages)) {
    const urls = body.galleryImages.map((x) => cleanString(x, 500)).filter(Boolean);
    out.push(...urls);
  }

  return Array.from(new Set(out));
}

function buildTourPayloadFromReq(req) {
  const body = req.body || {};

  const title = cleanString(body.title, 120);
  const startLocation = ensureLocationFromBody(body, "start");
  const endLocation = ensureLocationFromBody(body, "end");

  const startDateTime = toDateOrNull(body.startDateTime);
  const endDateTime = toDateOrNull(body.endDateTime);

  const maxParticipants = toNumberOrNull(body.maxParticipants);
  const estimatedDurationHours = toNumberOrNull(body.estimatedDurationHours);
  const ageLimit = toNumberOrNull(body.ageLimit);

  // price:
  // JSON: { price: {amount,currency} }
  // multipart: priceAmount + currency
  let price = null;

  if (body.price && typeof body.price === "object") {
    const amount = toNumberOrNull(body.price.amount);
    const currency = cleanString(body.price.currency || "NOK", 8) || "NOK";
    price = amount === null ? null : { amount, currency };
  } else if (body.priceAmount !== undefined || body.currency !== undefined) {
    const amount = toNumberOrNull(body.priceAmount);
    const currency = cleanString(body.currency || "NOK", 8) || "NOK";
    price = amount === null ? null : { amount, currency };
  }

  return {
    title,
    shortDescription: cleanString(body.shortDescription, 300),
    fullDescription: cleanString(body.fullDescription, 5000),

    startLocation,
    endLocation,

    startDateTime,
    endDateTime,
    estimatedDurationHours,

    maxParticipants,
    price,

    includes: Array.isArray(body.includes) ? body.includes.map((x) => cleanString(x, 200)) : [],
    notIncluded: Array.isArray(body.notIncluded) ? body.notIncluded.map((x) => cleanString(x, 200)) : [],

    difficulty: cleanString(body.difficulty, 30) || "EASY",
    fitnessLevel: cleanString(body.fitnessLevel, 30) || "LOW",
    ageLimit,
    equipmentRequired: Array.isArray(body.equipmentRequired)
      ? body.equipmentRequired.map((x) => cleanString(x, 200))
      : [],

    // STRING ONLY (from uploaded file)
    coverImage: coverImageUrlFromFiles(req),

    // array of strings
    galleryImages: buildGalleryImages(body, req),

    status: cleanString(body.status, 20) || "DRAFT"
  };
}

function validateCreatePayload(p) {
  if (!p.title) return "title is required";
  if (!p.startLocation) return "startLocation (lat,lng) is required";
  if (!p.endLocation) return "endLocation (lat,lng) is required";
  if (!p.startDateTime) return "startDateTime is required";
  if (!p.endDateTime) return "endDateTime is required";
  if (!p.maxParticipants) return "maxParticipants is required";
  if (p.maxParticipants <= 0) return "maxParticipants must be > 0";
  if (p.endDateTime <= p.startDateTime) return "endDateTime must be after startDateTime";
  if (!p.coverImage) return "coverImage file is required";
  return null;
}

// Safe file cleanup for BOTH cover + gallery
function safeDeleteUploadedFiles(req) {
  try {
    const files = [];

    const cover = req.files?.coverImage?.[0];
    if (cover?.path) files.push(cover.path);

    const gallery = Array.isArray(req.files?.galleryImages) ? req.files.galleryImages : [];
    for (const g of gallery) {
      if (g?.path) files.push(g.path);
    }

    for (const p of files) {
      if (p && fs.existsSync(p)) fs.unlinkSync(p);
    }
  } catch (_) {}
}

function isAdminUser(req) {
  return Array.isArray(req.user?.roles) && req.user.roles.includes("ADMIN");
}

// ---------- routes ----------

/**
 * POST /api/tours
 * Create a tour (Tour Leader/Admin)
 */
router.post(
  "/",
  requireAuth,
  requireRole("TOUR_LEADER", "ADMIN"),
  uploadTourImages,
  async (req, res, next) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        safeDeleteUploadedFiles(req);
        return res.status(401).json({ ok: false, error: "Not authenticated" });
      }

      const payload = buildTourPayloadFromReq(req);
      const validationError = validateCreatePayload(payload);
      if (validationError) {
        safeDeleteUploadedFiles(req);
        return res.status(400).json({ ok: false, error: validationError });
      }

      const tour = await Tour.create({
        ...payload,
        participantsCount: 0,
        createdBy: userId
      });

      return res.status(201).json({ ok: true, tour });
    } catch (err) {
      safeDeleteUploadedFiles(req);
      return next(err);
    }
  }
);

/**
 * GET /api/tours/mine
 * List tours created by me (Tour Leader/Admin)
 */
router.get("/mine", requireAuth, requireRole("TOUR_LEADER", "ADMIN"), async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const isAdmin = isAdminUser(req);

    const q = isAdmin ? {} : { createdBy: userId };
    const tours = await Tour.find(q).sort({ createdAt: -1 }).limit(200).select("-__v");

    return res.json({ ok: true, tours });
  } catch (err) {
    return next(err);
  }
});

/**
 * ✅ GET /api/tours/:id/bookings
 * Owner tour leader (or admin) can see who booked the tour
 *
 * IMPORTANT: must be defined BEFORE router.get("/:id", ...) below
 */
router.get(
  "/:id/bookings",
  requireAuth,
  requireRole("TOUR_LEADER", "ADMIN"),
  async (req, res, next) => {
    try {
      const tourId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(tourId)) {
        return res.status(400).json({ ok: false, message: "Invalid tour id" });
      }

      const userId = getUserId(req);
      const isAdmin = isAdminUser(req);

      const tour = await Tour.findById(tourId).select("createdBy title").lean();
      if (!tour) return res.status(404).json({ ok: false, message: "Tour not found" });

      if (!isAdmin && String(tour.createdBy) !== String(userId)) {
        return res.status(403).json({ ok: false, message: "Forbidden: not owner" });
      }

      const bookings = await Booking.find({ tourId })
        .sort({ createdAt: -1 })
        .select("userId tourId status createdAt")
        .populate({
          path: "userId",
          select: "username profile.fullName profile.avatarUrl"
        })
        .lean();

      // Normalize for frontend
      const out = bookings.map((b) => ({
        _id: b._id,
        tourId: b.tourId,
        status: b.status,
        createdAt: b.createdAt,
        user: b.userId
          ? {
              username: b.userId.username,
              profile: b.userId.profile || {}
            }
          : null
      }));

      return res.json({ ok: true, tour: { _id: tourId, title: tour.title }, bookings: out });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /api/tours/:id
 * Update tour (owner tour leader or admin)
 */
router.patch(
  "/:id",
  requireAuth,
  requireRole("TOUR_LEADER", "ADMIN"),
  uploadTourImages,
  async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const isAdmin = isAdminUser(req);

      const tour = await Tour.findById(req.params.id);
      if (!tour) {
        safeDeleteUploadedFiles(req);
        return res.status(404).json({ ok: false, error: "Not found" });
      }

      if (!isAdmin && String(tour.createdBy) !== String(userId)) {
        safeDeleteUploadedFiles(req);
        return res.status(403).json({ ok: false, error: "Forbidden: not owner" });
      }

      const patch = buildTourPayloadFromReq(req);
      const up = req.body || {};

      // apply patch (only fields sent)
      if ("title" in up) tour.title = patch.title;
      if ("shortDescription" in up) tour.shortDescription = patch.shortDescription;
      if ("fullDescription" in up) tour.fullDescription = patch.fullDescription;

      const hasStartLocMultipart = "startLat" in up || "startLng" in up || "startName" in up;
      const hasEndLocMultipart = "endLat" in up || "endLng" in up || "endName" in up;

      if ("startLocation" in up || hasStartLocMultipart) {
        if (!patch.startLocation) {
          safeDeleteUploadedFiles(req);
          return res.status(400).json({ ok: false, error: "startLocation must include lat,lng" });
        }
        tour.startLocation = patch.startLocation;
      }

      if ("endLocation" in up || hasEndLocMultipart) {
        if (!patch.endLocation) {
          safeDeleteUploadedFiles(req);
          return res.status(400).json({ ok: false, error: "endLocation must include lat,lng" });
        }
        tour.endLocation = patch.endLocation;
      }

      if ("startDateTime" in up) tour.startDateTime = patch.startDateTime;
      if ("endDateTime" in up) tour.endDateTime = patch.endDateTime;
      if ("estimatedDurationHours" in up) tour.estimatedDurationHours = patch.estimatedDurationHours;

      if ("maxParticipants" in up) tour.maxParticipants = patch.maxParticipants;

      const hasPriceMultipart = "priceAmount" in up || "currency" in up;
      if ("price" in up || hasPriceMultipart) tour.price = patch.price;

      if ("includes" in up) tour.includes = patch.includes;
      if ("notIncluded" in up) tour.notIncluded = patch.notIncluded;

      if ("difficulty" in up) tour.difficulty = patch.difficulty;
      if ("fitnessLevel" in up) tour.fitnessLevel = patch.fitnessLevel;
      if ("ageLimit" in up) tour.ageLimit = patch.ageLimit;
      if ("equipmentRequired" in up) tour.equipmentRequired = patch.equipmentRequired;

      // replace cover if uploaded
      if (patch.coverImage) tour.coverImage = patch.coverImage;

      // gallery update strategy
      const uploadedGallery = Array.isArray(req.files?.galleryImages) ? req.files.galleryImages : [];
      const hasGalleryInBody = Object.prototype.hasOwnProperty.call(up, "galleryImages");

      if (hasGalleryInBody) {
        tour.galleryImages = patch.galleryImages;
      } else if (uploadedGallery.length > 0) {
        const merged = Array.from(new Set([...(tour.galleryImages || []), ...patch.galleryImages]));
        tour.galleryImages = merged;
      }

      if ("status" in up) tour.status = patch.status;

      // consistency
      if (tour.startDateTime && tour.endDateTime && tour.endDateTime <= tour.startDateTime) {
        safeDeleteUploadedFiles(req);
        return res.status(400).json({ ok: false, error: "endDateTime must be after startDateTime" });
      }

      await tour.save();
      return res.json({ ok: true, tour });
    } catch (err) {
      safeDeleteUploadedFiles(req);
      return next(err);
    }
  }
);

/**
 * POST /api/tours/:id/publish
 */
router.post("/:id/publish", requireAuth, requireRole("TOUR_LEADER", "ADMIN"), async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const isAdmin = isAdminUser(req);

    const tour = await Tour.findById(req.params.id);
    if (!tour) return res.status(404).json({ ok: false, error: "Not found" });

    if (!isAdmin && String(tour.createdBy) !== String(userId)) {
      return res.status(403).json({ ok: false, error: "Forbidden: not owner" });
    }

    const payload = {
      title: cleanString(tour.title, 120),
      startLocation: tour.startLocation,
      endLocation: tour.endLocation,
      startDateTime: tour.startDateTime ? new Date(tour.startDateTime) : null,
      endDateTime: tour.endDateTime ? new Date(tour.endDateTime) : null,
      maxParticipants:
        typeof tour.maxParticipants === "number" ? tour.maxParticipants : toNumberOrNull(tour.maxParticipants),
      coverImage: typeof tour.coverImage === "string" ? tour.coverImage : null
    };

    const validationError = validateCreatePayload(payload);
    if (validationError) return res.status(400).json({ ok: false, error: `Cannot publish: ${validationError}` });

    if ((tour.participantsCount || 0) >= (tour.maxParticipants || 0) && (tour.maxParticipants || 0) > 0) {
      tour.status = "FULL";
    } else {
      tour.status = "PUBLISHED";
    }

    await tour.save();
    return res.json({ ok: true, tour });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/tours/:id/unpublish
 */
router.post("/:id/unpublish", requireAuth, requireRole("TOUR_LEADER", "ADMIN"), async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const isAdmin = isAdminUser(req);

    const tour = await Tour.findById(req.params.id);
    if (!tour) return res.status(404).json({ ok: false, error: "Not found" });

    if (!isAdmin && String(tour.createdBy) !== String(userId)) {
      return res.status(403).json({ ok: false, error: "Forbidden: not owner" });
    }

    tour.status = "DRAFT";
    await tour.save();

    return res.json({ ok: true, tour });
  } catch (err) {
    return next(err);
  }
});

/**
 * DELETE /api/tours/:id
 */
router.delete("/:id", requireAuth, requireRole("TOUR_LEADER", "ADMIN"), async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const isAdmin = isAdminUser(req);

    const tour = await Tour.findById(req.params.id);
    if (!tour) return res.status(404).json({ ok: false, error: "Not found" });

    if (!isAdmin && String(tour.createdBy) !== String(userId)) {
      return res.status(403).json({ ok: false, error: "Forbidden: not owner" });
    }

    await Booking.deleteMany({ tourId: tour._id });
    await Tour.deleteOne({ _id: tour._id });

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/tours/:id/my-booking
 * For UI: check if logged in user already booked
 */
router.get("/:id/my-booking", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const tourId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return res.status(400).json({ ok: false, error: "Invalid tour id" });
    }

    const booking = await Booking.findOne({ userId, tourId, status: "CONFIRMED" })
      .select("_id status createdAt")
      .lean();

    return res.json({
      ok: true,
      booked: !!booking,
      bookingId: booking?._id || null
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || "Server error" });
  }
});

/**
 * POST /api/tours/:id/book
 * Book 1 spot – cannot book multiple times
 */
router.post("/:id/book", requireAuth, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const userId = getUserId(req);
    const tourId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return res.status(400).json({ ok: false, error: "Invalid tour id" });
    }

    let updatedTour = null;

    await session.withTransaction(async () => {
      const tour = await Tour.findById(tourId).session(session);
      if (!tour) throw new Error("Not found");

      if (tour.status !== "PUBLISHED") {
        throw new Error("Tour is not bookable");
      }

      const max = Number(tour.maxParticipants || 0);
      const count = Number(tour.participantsCount || 0);

      if (max > 0 && count >= max) {
        tour.status = "FULL";
        await tour.save({ session });
        throw new Error("Tour is already full");
      }

      const existing = await Booking.findOne({ userId, tourId, status: "CONFIRMED" })
        .session(session)
        .lean();

      if (existing) {
        const e = new Error("Already booked");
        e.code = "ALREADY_BOOKED";
        throw e;
      }

      await Booking.create([{ userId, tourId, status: "CONFIRMED" }], { session });

      tour.participantsCount = count + 1;

      if (max > 0 && tour.participantsCount >= max) {
        tour.status = "FULL";
      }

      await tour.save({ session });
      updatedTour = tour.toObject();
    });

    return res.json({ ok: true, message: "Booking successful", tour: updatedTour });
  } catch (err) {
    if (err?.code === 11000 || err?.code === "ALREADY_BOOKED") {
      return res.status(409).json({ ok: false, error: "Du har allerede booket denne turen." });
    }
    return res.status(400).json({ ok: false, error: err.message || "Could not book" });
  } finally {
    session.endSession();
  }
});

/**
 * DELETE /api/tours/:id/book
 * Unbook current user (cancel own booking)
 */
router.delete("/:id/book", requireAuth, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const userId = getUserId(req);
    const tourId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(tourId)) {
      return res.status(400).json({ ok: false, error: "Invalid tour id" });
    }

    let updatedTour = null;

    await session.withTransaction(async () => {
      const tour = await Tour.findById(tourId).session(session);
      if (!tour) throw new Error("Not found");

      const booking = await Booking.findOne({ userId, tourId, status: "CONFIRMED" }).session(session);
      if (!booking) {
        const e = new Error("Not booked");
        e.code = "NOT_BOOKED";
        throw e;
      }

      booking.status = "CANCELLED";
      await booking.save({ session });

      const count = Number(tour.participantsCount || 0);
      tour.participantsCount = Math.max(0, count - 1);

      const max = Number(tour.maxParticipants || 0);
      if (tour.status === "FULL" && (max === 0 || tour.participantsCount < max)) {
        tour.status = "PUBLISHED";
      }

      await tour.save({ session });
      updatedTour = tour.toObject();
    });

    return res.json({ ok: true, message: "Unbook successful", tour: updatedTour });
  } catch (err) {
    if (err?.code === "NOT_BOOKED") {
      return res.status(409).json({ ok: false, error: "Du er ikke booket på denne turen." });
    }
    return res.status(400).json({ ok: false, error: err.message || "Could not unbook" });
  } finally {
    session.endSession();
  }
});

/**
 * GET /api/tours
 * Public list (published/full only)
 */
router.get("/", async (req, res, next) => {
  try {
    const { from, to, nearLat, nearLng, radiusKm } = req.query;

    const q = { status: { $in: ["PUBLISHED", "FULL"] } };

    if (from || to) {
      q.startDateTime = {};
      if (from) q.startDateTime.$gte = new Date(from);
      if (to) q.startDateTime.$lte = new Date(to);
    }

    if (nearLat && nearLng && radiusKm) {
      const lat = Number(nearLat);
      const lng = Number(nearLng);
      const r = Number(radiusKm);

      const latDelta = r / 111;
      const lngDelta = r / (111 * Math.cos((lat * Math.PI) / 180) || 1);

      q["startLocation.lat"] = { $gte: lat - latDelta, $lte: lat + latDelta };
      q["startLocation.lng"] = { $gte: lng - lngDelta, $lte: lng + lngDelta };
    }

    const tours = await Tour.find(q).sort({ startDateTime: 1 }).limit(200).select("-__v");
    return res.json({ ok: true, tours });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/tours/:id
 * Public single (published/full only)
 */
router.get("/:id", async (req, res, next) => {
  try {
    const tour = await Tour.findOne({
      _id: req.params.id,
      status: { $in: ["PUBLISHED", "FULL"] }
    }).select("-__v");

    if (!tour) return res.status(404).json({ ok: false, error: "Not found" });

    return res.json({ ok: true, tour });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
