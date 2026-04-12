// src/routes/order.routes.js
const express = require("express");
const router  = express.Router();
const {
  createOrder, getAllOrders, getOrderById, updateOrderStatus, cancelOrder,
} = require("../controllers/order.controller");
const authenticate = require("../middleware/authenticate");
const authorize    = require("../middleware/authorize");
const validate     = require("../middleware/validate");
const { createOrderSchema, updateOrderStatusSchema } = require("../utils/schemas");

router.use(authenticate);

router.post("/",              validate(createOrderSchema),                                    createOrder);
router.get("/",                                                                               getAllOrders);
router.get("/:id",                                                                            getOrderById);
router.patch("/:id/status",   authorize("VENDOR", "ADMIN"), validate(updateOrderStatusSchema), updateOrderStatus);
router.patch("/:id/cancel",                                                                   cancelOrder);

module.exports = router;
