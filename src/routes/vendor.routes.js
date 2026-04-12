// src/routes/vendor.routes.js
const express = require("express");
const router  = express.Router();
const {
  getAllVendors, getVendorById, createVendor,
  updateVendor, deleteVendor, verifyVendor,
} = require("../controllers/vendor.controller");
const authenticate = require("../middleware/authenticate");
const authorize    = require("../middleware/authorize");
const validate     = require("../middleware/validate");
const { createVendorSchema, updateVendorSchema } = require("../utils/schemas");

router.get("/",           getAllVendors);
router.get("/:idOrSlug",  getVendorById);
router.post("/",          authenticate, validate(createVendorSchema),                          createVendor);
router.put("/:id",        authenticate, authorize("VENDOR", "ADMIN"), validate(updateVendorSchema), updateVendor);
router.delete("/:id",     authenticate, authorize("ADMIN"),                                    deleteVendor);
router.patch("/:id/verify", authenticate, authorize("ADMIN"),                                  verifyVendor);

module.exports = router;
