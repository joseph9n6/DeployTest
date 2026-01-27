// backend/middleware/requireRole.js
const User = require("../models/User");

function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

async function loadRoles(req) {
  // 1) Already on req.user (JWT or populated session)
  if (Array.isArray(req.user?.roles)) {
    return req.user.roles;
  }

  // 2) Fallback to DB
  const userId = getUserId(req);
  if (!userId) return [];

  const fresh = await User.findById(userId).select("roles");
  const roles = Array.isArray(fresh?.roles) ? fresh.roles : [];

  // Cache back onto req.user for rest of request
  if (!req.user) req.user = {};
  req.user._id = req.user._id || userId;
  req.user.roles = roles;

  return roles;
}

function isAuthenticated(req) {
  // Passport session
  if (typeof req.isAuthenticated === "function") {
    return req.isAuthenticated();
  }
  // JWT-style (requireAuth already ran)
  return !!req.user;
}

function normalizeArgs(args) {
  // Støtt requireRole(["A","B"])
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}

/**
 * requireRole(...allowedRoles) OR requireRole([allowedRoles])
 * OR-logic: user must have AT LEAST ONE role
 */
function requireRole(...allowedRoles) {
  allowedRoles = normalizeArgs(allowedRoles);

  return async (req, res, next) => {
    try {
      // Hvis middleware brukes feil et sted, vil dette gi stack via server.js
      if (typeof next !== "function") {
        const err = new Error("next is not a function");
        err.status = 500;
        err.details = { where: "requireRole", allowedRoles, path: req?.originalUrl };
        throw err;
      }

      if (!isAuthenticated(req)) {
        return res.status(401).json({ ok: false, error: "Not authenticated" });
      }

      if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
        return res.status(500).json({
          ok: false,
          error: "Server misconfiguration: no allowed roles"
        });
      }

      const roles = await loadRoles(req);

      const hasRole = allowedRoles.some((role) => roles.includes(role));
      if (!hasRole) {
        return res.status(403).json({
          ok: false,
          error: "Forbidden: insufficient permissions",
          required: allowedRoles,
          have: roles
        });
      }

      return next();
    } catch (err) {
      console.error("❌ requireRole error:", err?.message || err, err?.details || "");
      return next(err); // <-- viktig: lar server.js error handler sende stack i dev
    }
  };
}

/**
 * requireAllRoles(...requiredRoles) OR requireAllRoles([requiredRoles])
 * AND-logic: user must have ALL roles
 */
function requireAllRoles(...requiredRoles) {
  requiredRoles = normalizeArgs(requiredRoles);

  return async (req, res, next) => {
    try {
      if (typeof next !== "function") {
        const err = new Error("next is not a function");
        err.status = 500;
        err.details = { where: "requireAllRoles", requiredRoles, path: req?.originalUrl };
        throw err;
      }

      if (!isAuthenticated(req)) {
        return res.status(401).json({ ok: false, error: "Not authenticated" });
      }

      if (!Array.isArray(requiredRoles) || requiredRoles.length === 0) {
        return res.status(500).json({
          ok: false,
          error: "Server misconfiguration: no required roles"
        });
      }

      const roles = await loadRoles(req);

      const hasAll = requiredRoles.every((role) => roles.includes(role));
      if (!hasAll) {
        return res.status(403).json({
          ok: false,
          error: "Forbidden: missing required permissions",
          required: requiredRoles,
          have: roles
        });
      }

      return next();
    } catch (err) {
      console.error("❌ requireAllRoles error:", err?.message || err, err?.details || "");
      return next(err);
    }
  };
}

module.exports = { requireRole, requireAllRoles };
