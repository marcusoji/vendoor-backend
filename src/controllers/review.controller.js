// src/controllers/review.controller.js — Product reviews

const prisma = require("../config/prisma");
const { sendSuccess, sendError } = require("../utils/response");

/**
 * GET /api/reviews?productId=...
 * Public — list reviews for a product.
 */
const getReviews = async (req, res, next) => {
  try {
    const { productId } = req.query;
    if (!productId) return sendError(res, "productId query param is required.", 400);

    const reviews = await prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, fullName: true } },
        product: { select: { id: true, name: true } },
      },
    });

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : null;

    return sendSuccess(res, {
      reviews,
      averageRating: avgRating ? parseFloat(avgRating.toFixed(1)) : null,
      reviewCount: reviews.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reviews
 * Protected (USER) — submit a review (one per user per product).
 */
const createReview = async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user.id;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return sendError(res, "Product not found.", 404);

    // Enforce: user must have a delivered order containing this product
    const eligibleOrder = await prisma.order.findFirst({
      where: {
        userId,
        status: "DELIVERED",
        items: { some: { productId } },
      },
    });

    if (!eligibleOrder) {
      return sendError(res, "You can only review products you have ordered and received.", 403);
    }

    const existing = await prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      return sendError(res, "You have already reviewed this product.", 409);
    }

    const review = await prisma.review.create({
      data: { userId, productId, rating, comment },
      include: {
        user: { select: { id: true, fullName: true } },
        product: { select: { id: true, name: true } },
      },
    });

    return sendSuccess(res, { review }, "Review submitted successfully.", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/reviews/:id
 * Protected — user deletes own review; admin can delete any.
 */
const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return sendError(res, "Review not found.", 404);

    if (req.user.role !== "ADMIN" && review.userId !== req.user.id) {
      return sendError(res, "Access denied.", 403);
    }

    await prisma.review.delete({ where: { id } });

    return sendSuccess(res, null, "Review deleted successfully.");
  } catch (err) {
    next(err);
  }
};

module.exports = { getReviews, createReview, deleteReview };
