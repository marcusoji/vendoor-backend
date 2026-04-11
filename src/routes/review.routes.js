// src/routes/review.routes.js

const express = require("express");
const router = express.Router();
const { getReviews, createReview, deleteReview } = require("../controllers/review.controller");
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");
const { createReviewSchema } = require("../services/review.schema");

// GET /api/reviews?productId=... — Public
router.get("/", getReviews);

// POST /api/reviews — Authenticated users (must have delivered order)
router.post("/", authenticate, validate(createReviewSchema), createReview);

// DELETE /api/reviews/:id — Owner or Admin
router.delete("/:id", authenticate, deleteReview);

module.exports = router;
