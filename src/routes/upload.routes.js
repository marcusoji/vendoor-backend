// src/routes/upload.routes.js
const express = require("express");
const router  = express.Router();
const { uploadImage, deleteImage } = require("../controllers/upload.controller");
const authenticate            = require("../middleware/authenticate");
const { upload, handleUploadError } = require("../middleware/upload");


// POST /api/upload/image?folder=logos|products|documents|general
router.post("/image", upload.single("image"), handleUploadError, uploadImage);

// DELETE /api/upload/image   body: { path }
router.delete("/image",authenticate, deleteImage);

module.exports = router;
