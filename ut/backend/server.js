// backend/server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const session = require("express-session");
const connectMongo = require("connect-mongo");
const passport = require("passport");
const path = require("path");
require("dotenv").config();

const { setupPassport } = require("./config/passport");

console.log("✅ BACKEND SERVER RUNNING FROM:", __filename);

// ---- SAFE LOAD ROUTES ----
function safeRequire(p, opts = {}) {
  const { optional = false, label = p } = opts;

  try {
    const mod = require(p);

    const candidate =
      typeof mod === "function"
        ? mod
        : typeof mod?.default === "function"
        ? mod.default
        : typeof mod?.router === "function"
        ? mod.router
        : mod?.router
        ? mod.router
        : null;

    const typeLabel =
      candidate
        ? typeof candidate === "function"
          ? "function(router)"
          : "router(object)"
        : typeof mod;

    console.log(`✅ Loaded ${label} (${p}) -> ${typeLabel}`);
    return candidate || null;
  } catch (err) {
    const isMissingModule =
      err?.code === "MODULE_NOT_FOUND" &&
      String(err.message || "").includes(`'${p}'`);

    if (optional && isMissingModule) {
      console.warn(
        `⚠️ Optional route not found yet: ${label} (${p}). Skipping mount for now.`
      );
      return null;
    }

    console.error(`❌ Could not load ${label} (${p}):`, err.message);
    return null;
  }
}

const app = express();
app.set("trust proxy", 1);

// Identify THIS backend instance on every response
app.use((req, res, next) => {
  res.setHeader("X-Backend-Id", `utopia-backend:${process.env.PORT || 5000}`);
  next();
});

// ----------------- STATIC UPLOADS -----------------
// ✅ Viktig: IKKE bruk fallthrough:false her, ellers blir manglende filer til "errors" (ENOENT) og spammer loggen.
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    maxAge: "7d", // cache i nettleser
  })
);

// ----------------- BODY PARSING -----------------
app.use(express.json({ limit: "2mb" }));

// ---- CORS ----
const envOrigins = (process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = envOrigins.length
  ? envOrigins
  : ["http://localhost:5173", "http://localhost:5174"];

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// ---- SESSION + DB CHECK ----
if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI mangler i backend/.env");
  process.exit(1);
}

const MongoStore =
  connectMongo?.MongoStore || connectMongo?.default?.MongoStore || connectMongo;

const createStore =
  typeof MongoStore?.create === "function"
    ? MongoStore.create.bind(MongoStore)
    : null;

if (!createStore) {
  console.error(
    "❌ connect-mongo: Could not find MongoStore.create(). Check connect-mongo version/import."
  );
  process.exit(1);
}

app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET || "dev_secret_change_me",
    resave: false,
    saveUninitialized: false,
    store: createStore({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 60 * 60 * 24 * 14,
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 14,
    },
  })
);

// ---- PASSPORT ----
setupPassport();
app.use(passport.initialize());
app.use(passport.session());

// ---- HEALTH ----
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "Backend is running" });
});

// Debug endpoints (optional)
app.get("/api/debug/whoami", (_req, res) => {
  res.json({
    ok: true,
    backendFile: __filename,
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || null,
  });
});

app.get("/api/debug/db", (_req, res) => {
  const uri = process.env.MONGODB_URI || "";
  const host = (uri.match(/@([^/?]+)/) || [])[1] || "unknown";
  const dbname = (uri.split("/").pop() || "").split("?")[0] || "unknown";

  res.json({
    ok: true,
    envDb: dbname,
    envHost: host,
    mongooseDb: mongoose.connection.name || null,
    mongooseHost: mongoose.connection.host || null,
  });
});

// ---- LOAD ROUTES ----
const authRoutes = safeRequire("./routes/auth.routes", { label: "auth" });
const profileRoutes = safeRequire("./routes/profile.routes", { label: "profile" });
const mapRoutes = safeRequire("./routes/map.routes", { label: "map" });
const adminRoutes = safeRequire("./routes/admin.routes", { label: "admin" });
const roleRequestRoutes = safeRequire("./routes/roleRequests.routes", { label: "roleRequests" });
const adminRoleRequestRoutes = safeRequire("./routes/adminRoleRequests.routes", { label: "adminRoleRequests" });
const adminUsersRoutes = safeRequire("./routes/adminUsers.routes", { label: "adminUsers" });
const publicRoutes = safeRequire("./routes/public.routes", { label: "public" });

const toursRoutes = safeRequire("./routes/tours", { label: "tours" });

// ✅ HER: riktig filnavn: cabin.routes.js
const cabinsRoutes = safeRequire("./routes/cabin.routes", { label: "cabins", optional: true });

// ---- MOUNT ROUTES ----
if (authRoutes) app.use("/api/auth", authRoutes);
else console.error("❌ /api/auth NOT mounted");

if (profileRoutes) app.use("/api/profile", profileRoutes);
else console.error("❌ /api/profile NOT mounted");

if (mapRoutes) app.use("/api/map", mapRoutes);
else console.error("❌ /api/map NOT mounted");

if (adminRoutes) app.use("/api/admin", adminRoutes);
else console.error("❌ /api/admin NOT mounted");

if (roleRequestRoutes) app.use("/api/role-requests", roleRequestRoutes);
else console.warn("⚠️ /api/role-requests NOT mounted");

if (adminRoleRequestRoutes) app.use("/api/admin", adminRoleRequestRoutes);
else console.warn("⚠️ /api/admin (role-requests) NOT mounted");

if (adminUsersRoutes) app.use("/api/admin", adminUsersRoutes);
else console.warn("⚠️ /api/admin (users) NOT mounted");

if (publicRoutes) app.use("/api/public", publicRoutes);
else console.warn("⚠️ /api/public NOT mounted");

if (toursRoutes) app.use("/api/tours", toursRoutes);
else console.warn("⚠️ /api/tours NOT mounted");

// ✅ Mount cabins hvis filen finnes
if (cabinsRoutes) app.use("/api/cabins", cabinsRoutes);
else console.warn("⚠️ /api/cabins NOT mounted (optional)");

// ---- DEBUG: LIST ROUTES ----
app.get("/api/debug/routes", (_req, res) => {
  const out = [];
  const stack = app._router?.stack || [];

  for (const layer of stack) {
    if (layer.route?.path) {
      const methods = Object.keys(layer.route.methods || {}).filter(Boolean);
      out.push({ methods, path: layer.route.path });
    } else if (layer.name === "router" && layer.handle?.stack) {
      for (const r of layer.handle.stack) {
        if (r.route?.path) {
          const methods = Object.keys(r.route.methods || {}).filter(Boolean);
          out.push({ methods, path: r.route.path });
        }
      }
    }
  }

  res.json({ ok: true, count: out.length, routes: out });
});

// ---- 404 ----
app.use((req, res) => {
  // ✅ Ikke send JSON for statiske bilde-URLer
  if (req.path.startsWith("/uploads/")) return res.status(404).end();

  res.status(404).json({ ok: false, error: `Not found: ${req.method} ${req.path}` });
});

// ---- ERROR HANDLER ----
app.use((err, req, res, _next) => {
  const isDev = process.env.NODE_ENV !== "production";

  // ✅ Ikke spam loggen for manglende filer i /uploads (normal 404)
  if ((err?.code === "ENOENT" || err?.statusCode === 404) && req.path.startsWith("/uploads/")) {
    return res.status(404).end();
  }

  console.error("❌ Error:", err);

  if (String(err.message || "").startsWith("CORS blocked for origin:")) {
    return res.status(403).json({ ok: false, error: err.message });
  }

  const status = err.status || 500;
  return res.status(status).json({
    ok: false,
    error: err.message || "Server error",
    ...(isDev ? { stack: err.stack, path: req.originalUrl } : {}),
  });
});

// ---- STARTUP ----
const PORT = process.env.PORT || 5000;

async function start() {
  const uri = process.env.MONGODB_URI || "";
  console.log("MONGODB_URI host:", (uri.match(/@([^/?]+)/) || [])[1] || "unknown");
  console.log("MONGODB_URI dbname:", (uri.split("/").pop() || "").split("?")[0] || "unknown");

  await mongoose.connect(process.env.MONGODB_URI);

  console.log("✅ MongoDB connected");
  console.log("DB NAME (mongoose):", mongoose.connection.name);
  console.log("DB HOST (mongoose):", mongoose.connection.host);

  app.listen(PORT, () => {
    console.log(`✅ API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("❌ Startup error:", err);
  process.exit(1);
});

