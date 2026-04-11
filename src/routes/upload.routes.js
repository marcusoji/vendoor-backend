// src/routes/upload.routes.js

const express = require("express");
const router = express.Router();
const { uploadImage, deleteImage } = require("../controllers/upload.controller");
const authenticate = require("../middleware/authenticate");
const { upload, handleUploadError } = require("../middleware/upload");

// All upload routes require authentication
router.use(authenticate);

// POST /api/upload/image?folder=logos|products|documents
// Body: multipart/form-data, field name: "image"
router.post(
  "/image",
  upload.single("image"),
  handleUploadError,
  uploadImage
);

// DELETE /api/upload/image
// Body: { "path": "logos/uuid.jpg" }
router.delete("/image", deleteImage);

module.exports = router;
