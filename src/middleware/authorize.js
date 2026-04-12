// src/middleware/authorize.js
const { sendError } = require("../utils/response");

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return sendError(res, "Authentication required.", 401);
  if (!roles.includes(req.user.role)) {
    return sendError(res, `Access denied. Required: ${roles.join(", ")}.`, 403);
  }
  next();
};

module.exports = authorize;
