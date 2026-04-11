// src/controllers/order.controller.js — Order management

const prisma = require("../config/prisma");
const { sendSuccess, sendError } = require("../utils/response");

/**
 * POST /api/orders
 * Protected (USER) — place a new order.
 * Uses a transaction to ensure price integrity and atomic creation.
 */
const createOrder = async (req, res, next) => {
  try {
    const { vendorId, deliveryAddress, notes, items } = req.body;
    const userId = req.user.id;

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId, isActive: true } });
    if (!vendor) return sendError(res, "Vendor not found or unavailable.", 404);

    // Fetch all requested products in one query for server-side price validation
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, vendorId, isAvailable: true },
    });

    if (products.length !== productIds.length) {
      return sendError(res, "One or more products are unavailable or do not belong to this vendor.", 400);
    }

    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    let totalAmount = 0;
    const orderItemsData = items.map(({ productId, quantity }) => {
      const product = productMap[productId];
      const price = product.price;
      totalAmount += price * quantity;
      return { productId, quantity, price };
    });

    const deliveryFee = totalAmount >= 5000 ? 0 : 500;
    totalAmount += deliveryFee;

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          vendorId,
          deliveryAddress,
          notes,
          totalAmount,
          deliveryFee,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: { product: { select: { id: true, name: true, price: true } } },
          },
          vendor: { select: { id: true, businessName: true, prepTime: true } },
        },
      });
      return newOrder;
    });

    return sendSuccess(res, { order }, "Order placed successfully.", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/orders
 * Protected — Users see their own orders; Admins see all.
 */
const getAllOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const where = req.user.role === "ADMIN" ? {} : { userId: req.user.id };
    if (req.query.status) where.status = req.query.status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: { product: { select: { id: true, name: true, price: true, imageUrl: true } } },
          },
          vendor: { select: { id: true, businessName: true, slug: true, logoUrl: true } },
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return sendSuccess(res, {
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/orders/:id
 * Protected — retrieve a single order.
 */
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, price: true, imageUrl: true } } },
        },
        vendor: { select: { id: true, businessName: true, slug: true, address: true, phone: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!order) return sendError(res, "Order not found.", 404);

    // Users can only view their own orders
    if (req.user.role !== "ADMIN" && order.userId !== req.user.id) {
      return sendError(res, "Access denied.", 403);
    }

    return sendSuccess(res, { order });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/orders/:id/status
 * Protected (VENDOR, ADMIN) — update order status.
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return sendError(res, "Order not found.", 404);

    // Prevent updating already-terminal orders
    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      return sendError(res, `Cannot update an order that is already ${order.status}.`, 400);
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        vendor: { select: { id: true, businessName: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    return sendSuccess(res, { order: updated }, "Order status updated.");
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/orders/:id/cancel
 * Protected (USER) — cancel own pending order.
 */
const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return sendError(res, "Order not found.", 404);

    if (order.userId !== req.user.id) {
      return sendError(res, "Access denied.", 403);
    }

    if (order.status !== "PENDING") {
      return sendError(res, "Only pending orders can be cancelled.", 400);
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return sendSuccess(res, { order: updated }, "Order cancelled successfully.");
  } catch (err) {
    next(err);
  }
};

module.exports = { createOrder, getAllOrders, getOrderById, updateOrderStatus, cancelOrder };
