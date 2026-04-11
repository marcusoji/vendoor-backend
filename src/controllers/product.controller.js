// src/controllers/product.controller.js — Product CRUD

const prisma = require("../config/prisma");
const { sendSuccess, sendError } = require("../utils/response");

/**
 * GET /api/products
 * Public — list products with optional vendor filter and pagination.
 */
const getAllProducts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const { vendorId, search, minPrice, maxPrice } = req.query;

    const where = { isAvailable: true };

    if (vendorId) where.vendorId = vendorId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          vendor: {
            select: { id: true, businessName: true, slug: true, city: true, state: true },
          },
          reviews: {
            select: { rating: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Attach average rating to each product
    const productsWithRating = products.map((p) => {
      const avgRating =
        p.reviews.length > 0
          ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length
          : null;
      const { reviews, ...rest } = p;
      return { ...rest, averageRating: avgRating ? parseFloat(avgRating.toFixed(1)) : null, reviewCount: reviews.length };
    });

    return sendSuccess(res, {
      products: productsWithRating,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/products/:id
 * Public — get a single product with vendor info and reviews.
 */
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true, businessName: true, slug: true, city: true,
            state: true, prepTime: true, isVerified: true,
          },
        },
        reviews: {
          include: {
            user: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!product) return sendError(res, "Product not found.", 404);

    const avgRating =
      product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
        : null;

    return sendSuccess(res, {
      product: {
        ...product,
        averageRating: avgRating ? parseFloat(avgRating.toFixed(1)) : null,
        reviewCount: product.reviews.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/products
 * Protected (VENDOR, ADMIN) — create a product.
 */
const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, vendorId, isAvailable } = req.body;

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) return sendError(res, "Vendor not found.", 404);

    const product = await prisma.product.create({
      data: { name, description, price, vendorId, isAvailable },
      include: {
        vendor: { select: { id: true, businessName: true, slug: true } },
      },
    });

    return sendSuccess(res, { product }, "Product created successfully.", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/products/:id
 * Protected (VENDOR, ADMIN) — update a product.
 */
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return sendError(res, "Product not found.", 404);

    const updated = await prisma.product.update({
      where: { id },
      data: req.body,
      include: {
        vendor: { select: { id: true, businessName: true, slug: true } },
      },
    });

    return sendSuccess(res, { product: updated }, "Product updated successfully.");
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/products/:id
 * Protected (VENDOR, ADMIN) — delete a product.
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return sendError(res, "Product not found.", 404);

    await prisma.product.delete({ where: { id } });

    return sendSuccess(res, null, "Product deleted successfully.");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct };
