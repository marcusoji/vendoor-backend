// src/services/product.schema.js — Joi schemas for product endpoints

const Joi = require("joi");

const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).required().messages({
    "string.empty": "Product name is required.",
  }),
  description: Joi.string().max(1000).allow("", null).optional(),
  price: Joi.number().positive().precision(2).required().messages({
    "number.base": "Price must be a number.",
    "number.positive": "Price must be greater than zero.",
    "any.required": "Price is required.",
  }),
  vendorId: Joi.string().uuid().required().messages({
    "string.guid": "vendorId must be a valid UUID.",
    "any.required": "vendorId is required.",
  }),
  isAvailable: Joi.boolean().default(true),
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(200),
  description: Joi.string().max(1000).allow("", null),
  price: Joi.number().positive().precision(2),
  isAvailable: Joi.boolean(),
}).min(1);

module.exports = { createProductSchema, updateProductSchema };
