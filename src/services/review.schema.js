// src/services/review.schema.js — Joi schemas for review endpoints

const Joi = require("joi");

const createReviewSchema = Joi.object({
  productId: Joi.string().uuid().required().messages({
    "string.guid": "productId must be a valid UUID.",
    "any.required": "productId is required.",
  }),
  rating: Joi.number().integer().min(1).max(5).required().messages({
    "number.min": "Rating must be between 1 and 5.",
    "number.max": "Rating must be between 1 and 5.",
    "any.required": "Rating is required.",
  }),
  comment: Joi.string().max(1000).allow("", null).optional(),
});

module.exports = { createReviewSchema };
