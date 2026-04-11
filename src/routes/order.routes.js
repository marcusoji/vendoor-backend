// src/routes/order.routes.js

const express = require("express");
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
} = require("../controllers/order.controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const { createOrderSchema, updateOrderStatusSchema } = require("../services/order.schema");

// All order routes require authentication
router.use(authenticate);

// POST /api/orders — Authenticated users
router.post("/", validate(createOrderSchema), createOrder);

// GET /api/orders — Users see own; Admin sees all
router.get("/", getAllOrders);

// GET /api/orders/:id — Owner or Admin
router.get("/:id", getOrderById);

// PATCH /api/orders/:id/status — Vendor or Admin
router.patch("/:id/status", authorize("VENDOR", "ADMIN"), validate(updateOrderStatusSchema), updateOrderStatus);

// PATCH /api/orders/:id/cancel — User cancels own pending order
router.patch("/:id/cancel", cancelOrder);

module.exports = router;
