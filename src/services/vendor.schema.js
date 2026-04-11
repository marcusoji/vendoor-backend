// src/services/vendor.schema.js — Joi schemas for vendor endpoints

const Joi = require("joi");

const VALID_CATEGORIES = ["Restaurant", "Fast Food", "Bakery", "Drinks", "Groceries", "Others"];
const VALID_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VALID_PREP_TIMES = ["10 mins", "15 mins", "20 mins", "25 mins", "30 mins", "45 mins", "60 mins"];

const createVendorSchema = Joi.object({
  businessName: Joi.string().min(2).max(150).required(),
  categories: Joi.array().items(Joi.string().valid(...VALID_CATEGORIES)).min(1).required(),
  description: Joi.string().min(10).max(1000).required(),
  address: Joi.string().min(5).max(300).required(),
  phone: Joi.string()
    .pattern(/^(\+234|0)[789][01]\d{8}$/)
    .required()
    .messages({ "string.pattern.base": "Phone must be a valid Nigerian number." }),
  email: Joi.string().email().lowercase().required(),
  state: Joi.string().required(),
  city: Joi.string().required(),
  operatingDays: Joi.array().items(Joi.string().valid(...VALID_DAYS)).min(1).required(),
  openTime: Joi.string()
    .pattern(/^\d{2}:\d{2}$/)
    .required()
    .messages({ "string.pattern.base": "Open time must be in HH:MM format." }),
  closeTime: Joi.string()
    .pattern(/^\d{2}:\d{2}$/)
    .required()
    .messages({ "string.pattern.base": "Close time must be in HH:MM format." }),
  deliveryRadius: Joi.number().integer().min(1).max(100).default(5),
  prepTime: Joi.string().valid(...VALID_PREP_TIMES).default("20 mins"),
  offersPickup: Joi.boolean().default(false),
  offersScheduled: Joi.boolean().default(false),
  bizRegNo: Joi.string().allow("", null).optional(),
  bankName: Joi.string().allow("", null).optional(),
  accountName: Joi.string().allow("", null).optional(),
  accountNumber: Joi.string()
    .pattern(/^\d{10}$/)
    .allow("", null)
    .optional()
    .messages({ "string.pattern.base": "Account number must be exactly 10 digits." }),
});

const updateVendorSchema = Joi.object({
  businessName: Joi.string().min(2).max(150),
  categories: Joi.array().items(Joi.string().valid(...VALID_CATEGORIES)).min(1),
  description: Joi.string().min(10).max(1000),
  address: Joi.string().min(5).max(300),
  phone: Joi.string()
    .pattern(/^(\+234|0)[789][01]\d{8}$/)
    .messages({ "string.pattern.base": "Phone must be a valid Nigerian number." }),
  email: Joi.string().email().lowercase(),
  state: Joi.string(),
  city: Joi.string(),
  operatingDays: Joi.array().items(Joi.string().valid(...VALID_DAYS)).min(1),
  openTime: Joi.string().pattern(/^\d{2}:\d{2}$/),
  closeTime: Joi.string().pattern(/^\d{2}:\d{2}$/),
  deliveryRadius: Joi.number().integer().min(1).max(100),
  prepTime: Joi.string().valid(...VALID_PREP_TIMES),
  offersPickup: Joi.boolean(),
  offersScheduled: Joi.boolean(),
  bizRegNo: Joi.string().allow("", null),
  bankName: Joi.string().allow("", null),
  accountName: Joi.string().allow("", null),
  accountNumber: Joi.string()
    .pattern(/^\d{10}$/)
    .allow("", null)
    .messages({ "string.pattern.base": "Account number must be exactly 10 digits." }),
}).min(1);

module.exports = { createVendorSchema, updateVendorSchema };
