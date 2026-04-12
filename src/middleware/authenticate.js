// src/middleware/authenticate.js
const { verifyToken } = require("../utils/jwt");
const { sendError } = require("../utils/response");

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, "Authentication required. Provide a Bearer token.", 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    req.user = verifyToken(token); // { id, email, role, iat, exp }
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return sendError(res, "Token expired. Please log in again.", 401);
    }
    return sendError(res, "Invalid token.", 401);
  }
};

module.exports = authenticate;
