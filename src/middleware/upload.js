// src/middleware/upload.js
const multer = require("multer");
const { sendError } = require("../utils/response");

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_MB = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Only JPEG, PNG, WEBP and GIF images are allowed."), false);
  },
  limits: { fileSize: MAX_MB * 1024 * 1024 },
});

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return sendError(res, `File too large. Max size is ${MAX_MB}MB.`, 413);
    }
    return sendError(res, err.message, 400);
  }
  if (err) return sendError(res, err.message, 400);
  next();
};

module.exports = { upload, handleUploadError };
