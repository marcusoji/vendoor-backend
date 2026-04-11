// src/middleware/authenticate.js — JWT auth guard

const { verifyToken } = require("../utils/jwt");
const { sendError } = require("../utils/response");

/**
 * Middleware: verify Bearer token and attach decoded user to req.user.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, "Authentication required. Please provide a Bearer token.", 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { id, email, role, iat, exp }
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return sendError(res, "Token expired. Please log in again.", 401);
    }
    return sendError(res, "Invalid token. Please log in again.", 401);
  }
};

module.exports = authenticate;
