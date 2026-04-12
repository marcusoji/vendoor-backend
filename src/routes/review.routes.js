// src/routes/review.routes.js
const express = require("express");
const router  = express.Router();
const { getReviews, createReview, deleteReview } = require("../controllers/review.controller");
const authenticate = require("../middleware/authenticate");
const validate     = require("../middleware/validate");
const { createReviewSchema } = require("../utils/schemas");

router.get("/",    getReviews);
router.post("/",   authenticate, validate(createReviewSchema), createReview);
router.delete("/:id", authenticate, deleteReview);

module.exports = router;
