const express = require("express");
const router  = express.Router();
const { uploadImage, deleteImage } = require("../controllers/upload.controller");
const authenticate = require("../middleware/authenticate");
const { upload, handleUploadError } = require("../middleware/upload");

router.post("/image", upload.single("image"), handleUploadError, uploadImage);
router.delete("/image", authenticate, deleteImage);

module.exports = router;