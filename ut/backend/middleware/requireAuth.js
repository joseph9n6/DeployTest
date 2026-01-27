// backend/middleware/requireAuth.js
function requireAuth(req, res, next) {
  try {
    // Hvis middleware blir brukt feil et sted, få stack via server.js
    if (typeof next !== "function") {
      const err = new Error("next is not a function");
      err.status = 500;
      err.details = {
        where: "requireAuth",
        path: req?.originalUrl,
        method: req?.method
      };
      throw err;
    }

    // Passport session-auth
    if (typeof req.isAuthenticated === "function" && req.isAuthenticated()) {
      return next();
    }

    // Fallback hvis req.user allerede er satt (f.eks. JWT i fremtiden)
    if (req.user) {
      return next();
    }

    return res.status(401).json({ ok: false, error: "Not authenticated" });
  } catch (err) {
    console.error("❌ requireAuth error:", err?.message || err, err?.details || "");
    return next(err); // <-- viktig: send videre til error handler
  }
}

module.exports = { requireAuth };
