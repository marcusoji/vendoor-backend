// src/services/auth.schema.js — Joi schemas for auth endpoints

const Joi = require("joi");

const registerSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).required().messages({
    "string.empty": "Full name is required.",
    "string.min": "Full name must be at least 2 characters.",
  }),
  email: Joi.string().email().lowercase().required().messages({
    "string.email": "A valid email address is required.",
    "string.empty": "Email is required.",
  }),
  password: Joi.string().min(8).max(72).required().messages({
    "string.min": "Password must be at least 8 characters.",
    "string.empty": "Password is required.",
  }),
  role: Joi.string().valid("USER", "VENDOR", "ADMIN").default("USER"),
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required().messages({
    "string.email": "A valid email address is required.",
    "string.empty": "Email is required.",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required.",
  }),
});

module.exports = { registerSchema, loginSchema };
