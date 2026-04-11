// src/controllers/vendor.controller.js — Vendor CRUD

const prisma = require("../config/prisma");
const { generateUniqueVendorSlug } = require("../utils/slug");
const { sendSuccess, sendError } = require("../utils/response");

/**
 * GET /api/vendors
 * Public — list vendors with optional filters and pagination.
 */
const getAllVendors = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const { state, city, category, search } = req.query;

    const where = { isActive: true };

    if (state) where.state = state;
    if (city) where.city = city;
    if (category) where.categories = { has: category };
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, businessName: true, slug: true, categories: true,
          description: true, logoUrl: true, address: true, city: true,
          state: true, phone: true, email: true, prepTime: true,
          deliveryRadius: true, isVerified: true, openTime: true, closeTime: true,
          operatingDays: true, offersPickup: true, offersScheduled: true, createdAt: true,
        },
      }),
      prisma.vendor.count({ where }),
    ]);

    return sendSuccess(res, {
      vendors,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/vendors/:idOrSlug
 * Public — get a single vendor by ID or slug.
 */
const getVendorById = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;

    const vendor = await prisma.vendor.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        isActive: true,
      },
      include: {
        products: {
          where: { isAvailable: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!vendor) return sendError(res, "Vendor not found.", 404);

    return sendSuccess(res, { vendor });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/vendors
 * Protected (USER, VENDOR, ADMIN) — register a new vendor.
 */
const createVendor = async (req, res, next) => {
  try {
    const slug = await generateUniqueVendorSlug(req.body.businessName);

    const existing = await prisma.vendor.findUnique({ where: { email: req.body.email } });
    if (existing) {
      return sendError(res, "A vendor with this email already exists.", 409);
    }

    const vendor = await prisma.vendor.create({
      data: { ...req.body, slug },
    });

    return sendSuccess(res, { vendor }, "Vendor registered successfully.", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/vendors/:id
 * Protected (VENDOR, ADMIN) — update a vendor.
 */
const updateVendor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) return sendError(res, "Vendor not found.", 404);

    const updateData = { ...req.body };

    // Regenerate slug if business name changed
    if (req.body.businessName && req.body.businessName !== vendor.businessName) {
      updateData.slug = await generateUniqueVendorSlug(req.body.businessName);
    }

    const updated = await prisma.vendor.update({
      where: { id },
      data: updateData,
    });

    return sendSuccess(res, { vendor: updated }, "Vendor updated successfully.");
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/vendors/:id
 * Admin only — soft-delete (deactivate) a vendor.
 */
const deleteVendor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) return sendError(res, "Vendor not found.", 404);

    await prisma.vendor.update({ where: { id }, data: { isActive: false } });

    return sendSuccess(res, null, "Vendor deactivated successfully.");
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/vendors/:id/verify
 * Admin only — verify a vendor.
 */
const verifyVendor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) return sendError(res, "Vendor not found.", 404);

    const updated = await prisma.vendor.update({
      where: { id },
      data: { isVerified: true },
    });

    return sendSuccess(res, { vendor: updated }, "Vendor verified successfully.");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllVendors, getVendorById, createVendor, updateVendor, deleteVendor, verifyVendor };
