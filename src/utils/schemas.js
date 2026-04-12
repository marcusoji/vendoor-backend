// src/utils/schemas.js — All Joi validation schemas

const Joi = require("joi");

// ─── Auth ─────────────────────────────────────────────────────────────────────

const registerSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).required().messages({
    "string.empty": "Full name is required.",
    "string.min": "Full name must be at least 2 characters.",
  }),
  email: Joi.string().email().lowercase().required().messages({
    "string.email": "A valid email is required.",
    "string.empty": "Email is required.",
  }),
  password: Joi.string().min(8).max(72).required().messages({
    "string.min": "Password must be at least 8 characters.",
    "string.empty": "Password is required.",
  }),
  role: Joi.string().valid("USER", "VENDOR", "ADMIN").default("USER"),
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
});

// ─── Vendor ───────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = ["Restaurant", "Fast Food", "Bakery", "Drinks", "Groceries", "Others"];
const VALID_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VALID_PREP_TIMES = ["10 mins", "15 mins", "20 mins", "25 mins", "30 mins", "45 mins", "60 mins"];

const createVendorSchema = Joi.object({
  businessName: Joi.string().min(2).max(150).required(),
  categories: Joi.array().items(Joi.string().valid(...VALID_CATEGORIES)).min(1).required(),
  description: Joi.string().min(10).max(1000).required(),
  logoUrl: Joi.string().uri().allow("", null).optional(),
  address: Joi.string().min(5).max(300).required(),
  phone: Joi.string()
    .pattern(/^(\+234|0)[789][01]\d{8}$/)
    .required()
    .messages({ "string.pattern.base": "Phone must be a valid Nigerian number." }),
  email: Joi.string().email().lowercase().required(),
  state: Joi.string().required(),
  city: Joi.string().required(),
  operatingDays: Joi.array().items(Joi.string().valid(...VALID_DAYS)).min(1).required(),
  openTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  closeTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  deliveryRadius: Joi.number().integer().min(1).max(100).default(5),
  prepTime: Joi.string().valid(...VALID_PREP_TIMES).default("20 mins"),
  offersPickup: Joi.boolean().default(false),
  offersScheduled: Joi.boolean().default(false),
  bizRegNo: Joi.string().allow("", null).optional(),
  bankName: Joi.string().allow("", null).optional(),
  accountName: Joi.string().allow("", null).optional(),
  accountNumber: Joi.string().pattern(/^\d{10}$/).allow("", null).optional()
    .messages({ "string.pattern.base": "Account number must be exactly 10 digits." }),
});

const updateVendorSchema = Joi.object({
  businessName: Joi.string().min(2).max(150),
  categories: Joi.array().items(Joi.string().valid(...VALID_CATEGORIES)).min(1),
  description: Joi.string().min(10).max(1000),
  logoUrl: Joi.string().uri().allow("", null),
  address: Joi.string().min(5).max(300),
  phone: Joi.string().pattern(/^(\+234|0)[789][01]\d{8}$/),
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
  accountNumber: Joi.string().pattern(/^\d{10}$/).allow("", null),
}).min(1);

// ─── Product ──────────────────────────────────────────────────────────────────

const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(1000).allow("", null).optional(),
  price: Joi.number().positive().precision(2).required(),
  vendorId: Joi.string().uuid().required(),
  imageUrl: Joi.string().uri().allow("", null).optional(),
  isAvailable: Joi.boolean().default(true),
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(200),
  description: Joi.string().max(1000).allow("", null),
  price: Joi.number().positive().precision(2),
  imageUrl: Joi.string().uri().allow("", null),
  isAvailable: Joi.boolean(),
}).min(1);

// ─── Order ────────────────────────────────────────────────────────────────────

const createOrderSchema = Joi.object({
  vendorId: Joi.string().uuid().required(),
  deliveryAddress: Joi.string().min(5).max(500).required(),
  notes: Joi.string().max(500).allow("", null).optional(),
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().uuid().required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required(),
});

const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid("PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED")
    .required(),
});

// ─── Review ───────────────────────────────────────────────────────────────────

const createReviewSchema = Joi.object({
  productId: Joi.string().uuid().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(1000).allow("", null).optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  createVendorSchema,
  updateVendorSchema,
  createProductSchema,
  updateProductSchema,
  createOrderSchema,
  updateOrderStatusSchema,
  createReviewSchema,
};
