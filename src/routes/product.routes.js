// src/routes/product.routes.js

const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/product.controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const { createProductSchema, updateProductSchema } = require("../services/product.schema");

// GET /api/products — Public
router.get("/", getAllProducts);

// GET /api/products/:id — Public
router.get("/:id", getProductById);

// POST /api/products — Vendor or Admin
router.post("/", authenticate, authorize("VENDOR", "ADMIN"), validate(createProductSchema), createProduct);

// PUT /api/products/:id — Vendor or Admin
router.put("/:id", authenticate, authorize("VENDOR", "ADMIN"), validate(updateProductSchema), updateProduct);

// DELETE /api/products/:id — Vendor or Admin
router.delete("/:id", authenticate, authorize("VENDOR", "ADMIN"), deleteProduct);

module.exports = router;
