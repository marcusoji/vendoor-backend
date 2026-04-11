// src/routes/vendor.routes.js

const express = require("express");
const router = express.Router();
const {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  verifyVendor,
} = require("../controllers/vendor.controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const { createVendorSchema, updateVendorSchema } = require("../services/vendor.schema");

// GET /api/vendors — Public
router.get("/", getAllVendors);

// GET /api/vendors/:idOrSlug — Public
router.get("/:idOrSlug", getVendorById);

// POST /api/vendors — Authenticated users
router.post("/", authenticate, validate(createVendorSchema), createVendor);

// PUT /api/vendors/:id — Vendor or Admin
router.put("/:id", authenticate, authorize("VENDOR", "ADMIN"), validate(updateVendorSchema), updateVendor);

// DELETE /api/vendors/:id — Admin only
router.delete("/:id", authenticate, authorize("ADMIN"), deleteVendor);

// PATCH /api/vendors/:id/verify — Admin only
router.patch("/:id/verify", authenticate, authorize("ADMIN"), verifyVendor);

module.exports = router;
