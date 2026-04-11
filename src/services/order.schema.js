// src/services/order.schema.js — Joi schemas for order endpoints

const Joi = require("joi");

const createOrderSchema = Joi.object({
  vendorId: Joi.string().uuid().required().messages({
    "string.guid": "vendorId must be a valid UUID.",
    "any.required": "vendorId is required.",
  }),
  deliveryAddress: Joi.string().min(5).max(500).required().messages({
    "string.empty": "Delivery address is required.",
  }),
  notes: Joi.string().max(500).allow("", null).optional(),
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().uuid().required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one item is required.",
      "any.required": "items is required.",
    }),
});

const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid("PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED")
    .required()
    .messages({
      "any.only": "Invalid order status.",
      "any.required": "Status is required.",
    }),
});

module.exports = { createOrderSchema, updateOrderStatusSchema };
