// src/controllers/review.controller.js
const { v4: uuidv4 } = require("uuid");
const { query } = require("../db/pool");
const { sendSuccess, sendError } = require("../utils/response");

// GET /api/reviews?productId=... — Public
const getReviews = async (req, res, next) => {
  try {
    const { productId } = req.query;
    if (!productId) return sendError(res, "productId query param is required.", 400);

    const { rows: reviews } = await query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.id AS user_id, u.full_name AS user_name,
              p.id AS product_id, p.name AS product_name
         FROM reviews r
         JOIN users u ON u.id = r.user_id
         JOIN products p ON p.id = r.product_id
        WHERE r.product_id = $1
        ORDER BY r.created_at DESC`,
      [productId]
    );

    const { rows: avgRows } = await query(
      `SELECT ROUND(AVG(rating)::numeric, 1) AS average_rating, COUNT(*)::int AS review_count
         FROM reviews WHERE product_id = $1`,
      [productId]
    );

    return sendSuccess(res, {
      reviews,
      averageRating: avgRows[0].average_rating ? parseFloat(avgRows[0].average_rating) : null,
      reviewCount: avgRows[0].review_count,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/reviews — Authenticated
const createReview = async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user.id;

    const { rows: pRows } = await query("SELECT id FROM products WHERE id = $1", [productId]);
    if (pRows.length === 0) return sendError(res, "Product not found.", 404);

    // Must have a delivered order containing this product
    const { rows: eligible } = await query(
      `SELECT o.id FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = $1 AND o.status = 'DELIVERED' AND oi.product_id = $2
        LIMIT 1`,
      [userId, productId]
    );
    if (eligible.length === 0) {
      return sendError(res, "You can only review products you have ordered and received.", 403);
    }

    // One review per user per product (enforced by DB unique constraint too)
    const { rows: existing } = await query(
      "SELECT id FROM reviews WHERE user_id = $1 AND product_id = $2",
      [userId, productId]
    );
    if (existing.length > 0) {
      return sendError(res, "You have already reviewed this product.", 409);
    }

    const id = uuidv4();
    const { rows } = await query(
      `INSERT INTO reviews (id, user_id, product_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, userId, productId, rating, comment || null]
    );

    return sendSuccess(res, { review: rows[0] }, "Review submitted successfully.", 201);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/reviews/:id — Owner or Admin
const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await query("SELECT id, user_id FROM reviews WHERE id = $1", [id]);
    if (rows.length === 0) return sendError(res, "Review not found.", 404);

    if (req.user.role !== "ADMIN" && rows[0].user_id !== req.user.id) {
      return sendError(res, "Access denied.", 403);
    }

    await query("DELETE FROM reviews WHERE id = $1", [id]);
    return sendSuccess(res, null, "Review deleted successfully.");
  } catch (err) {
    next(err);
  }
};

module.exports = { getReviews, createReview, deleteReview };
