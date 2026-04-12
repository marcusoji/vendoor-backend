// src/routes/product.routes.js
const express = require("express");
const router  = express.Router();
const {
  getAllProducts, getProductById, createProduct, updateProduct, deleteProduct,
} = require("../controllers/product.controller");
const authenticate = require("../middleware/authenticate");
const authorize    = require("../middleware/authorize");
const validate     = require("../middleware/validate");
const { createProductSchema, updateProductSchema } = require("../utils/schemas");

router.get("/",    getAllProducts);
router.get("/:id", getProductById);
router.post("/",   authenticate, authorize("VENDOR", "ADMIN"), validate(createProductSchema), createProduct);
router.put("/:id", authenticate, authorize("VENDOR", "ADMIN"), validate(updateProductSchema), updateProduct);
router.delete("/:id", authenticate, authorize("VENDOR", "ADMIN"), deleteProduct);

module.exports = router;
