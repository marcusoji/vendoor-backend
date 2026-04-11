// src/middleware/authorize.js — Role-based access control

const { sendError } = require("../utils/response");

/**
 * Factory: returns middleware that allows only specified roles.
 * Must be used AFTER the authenticate middleware.
 * @param {...string} roles - Allowed roles (e.g. "ADMIN", "VENDOR")
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, "Authentication required.", 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Required role(s): ${roles.join(", ")}.`,
        403
      );
    }

    next();
  };
};

module.exports = authorize;
