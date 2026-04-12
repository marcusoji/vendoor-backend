// src/middleware/errorHandler.js

const notFoundHandler = (req, res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
};

const globalErrorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // PostgreSQL unique violation
  if (err.code === "23505") {
    return res.status(409).json({
      success: false,
      message: "A record with this value already exists.",
      detail: err.detail,
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === "23503") {
    return res.status(400).json({
      success: false,
      message: "Referenced record does not exist.",
    });
  }

  // CORS
  if (err.message && err.message.startsWith("CORS policy")) {
    return res.status(403).json({ success: false, message: err.message });
  }

  if (process.env.NODE_ENV === "development") {
    console.error("❌", err);
    return res.status(statusCode).json({
      success: false,
      message: err.message,
      stack: err.stack,
    });
  }

  return res.status(statusCode).json({ success: false, message: err.message || "Internal Server Error" });
};

module.exports = { notFoundHandler, globalErrorHandler };
