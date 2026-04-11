// src/middleware/errorHandler.js — Global error handler + 404 catcher

/**
 * 404 handler — called when no route matched.
 */
const notFoundHandler = (req, res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
};

/**
 * Global error handler — Express calls this when next(err) is invoked.
 * Must have exactly 4 parameters for Express to recognise it as an error handler.
 */
const globalErrorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Prisma known errors
  if (err.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "A record with this value already exists.",
      field: err.meta?.target,
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Record not found.",
    });
  }

  // CORS error
  if (err.message && err.message.startsWith("CORS policy")) {
    return res.status(403).json({ success: false, message: err.message });
  }

  if (process.env.NODE_ENV === "development") {
    console.error("❌ Error:", err);
    return res.status(statusCode).json({
      success: false,
      message,
      stack: err.stack,
    });
  }

  return res.status(statusCode).json({ success: false, message });
};

module.exports = { notFoundHandler, globalErrorHandler };
