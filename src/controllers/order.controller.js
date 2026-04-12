// src/controllers/order.controller.js
const { v4: uuidv4 } = require("uuid");
const { query, getClient } = require("../db/pool");
const { sendSuccess, sendError } = require("../utils/response");

// POST /api/orders — Authenticated
const createOrder = async (req, res, next) => {
  const client = await getClient();
  try {
    const { vendorId, deliveryAddress, notes, items } = req.body;
    const userId = req.user.id;

    // Validate vendor exists and is active
    const { rows: vRows } = await client.query(
      "SELECT id, business_name, prep_time FROM vendors WHERE id = $1 AND is_active = TRUE",
      [vendorId]
    );
    if (vRows.length === 0) return sendError(res, "Vendor not found or unavailable.", 404);

    // Fetch all requested products in one query — server-side price validation
    const productIds = items.map((i) => i.productId);
    const placeholders = productIds.map((_, i) => `$${i + 2}`).join(", ");
    const { rows: products } = await client.query(
      `SELECT id, name, price FROM products
        WHERE id IN (${placeholders}) AND vendor_id = $1 AND is_available = TRUE`,
      [vendorId, ...productIds]
    );

    if (products.length !== productIds.length) {
      return sendError(res, "One or more products are unavailable or don't belong to this vendor.", 400);
    }

    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const orderItemsData = items.map(({ productId, quantity }) => {
      const product = productMap[productId];
      subtotal += product.price * quantity;
      return { productId, quantity, price: product.price };
    });

    const deliveryFee = subtotal >= 5000 ? 0 : 500;
    const totalAmount = subtotal + deliveryFee;
    const orderId = uuidv4();

    // Begin transaction
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO orders (id, user_id, vendor_id, delivery_address, notes, total_amount, delivery_fee)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [orderId, userId, vendorId, deliveryAddress, notes || null, totalAmount, deliveryFee]
    );

    for (const item of orderItemsData) {
      await client.query(
        `INSERT INTO order_items (id, order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), orderId, item.productId, item.quantity, item.price]
      );
    }

    await client.query("COMMIT");

    // Fetch the complete order to return
    const { rows: orderRows } = await query(
      `SELECT o.*,
              v.business_name AS vendor_name, v.prep_time AS vendor_prep_time,
              u.full_name AS user_name, u.email AS user_email
         FROM orders o
         JOIN vendors v ON v.id = o.vendor_id
         JOIN users u ON u.id = o.user_id
        WHERE o.id = $1`,
      [orderId]
    );

    const { rows: itemRows } = await query(
      `SELECT oi.*, p.name AS product_name, p.image_url AS product_image
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = $1`,
      [orderId]
    );

    return sendSuccess(
      res,
      { order: { ...orderRows[0], items: itemRows } },
      "Order placed successfully.",
      201
    );
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

// GET /api/orders — Authenticated
const getAllOrders = async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (req.user.role !== "ADMIN") {
      conditions.push(`o.user_id = $${idx++}`);
      values.push(req.user.id);
    }
    if (req.query.status) {
      conditions.push(`o.status = $${idx++}`);
      values.push(req.query.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows: orders } = await query(
      `SELECT o.*,
              v.business_name AS vendor_name, v.slug AS vendor_slug, v.logo_url AS vendor_logo,
              u.full_name AS user_name, u.email AS user_email
         FROM orders o
         JOIN vendors v ON v.id = o.vendor_id
         JOIN users u ON u.id = o.user_id
         ${where}
        ORDER BY o.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );

    const { rows: countRows } = await query(
      `SELECT COUNT(*)::int AS total FROM orders o ${where}`,
      values
    );

    // Attach items to each order
    const orderIds = orders.map((o) => o.id);
    let itemsByOrder = {};
    if (orderIds.length > 0) {
      const placeholders = orderIds.map((_, i) => `$${i + 1}`).join(", ");
      const { rows: allItems } = await query(
        `SELECT oi.*, p.name AS product_name, p.image_url AS product_image
           FROM order_items oi
           JOIN products p ON p.id = oi.product_id
          WHERE oi.order_id IN (${placeholders})`,
        orderIds
      );
      allItems.forEach((item) => {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
        itemsByOrder[item.order_id].push(item);
      });
    }

    const hydrated = orders.map((o) => ({ ...o, items: itemsByOrder[o.id] || [] }));

    return sendSuccess(res, {
      orders: hydrated,
      pagination: { page, limit, total: countRows[0].total, totalPages: Math.ceil(countRows[0].total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/:id — Authenticated
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows: oRows } = await query(
      `SELECT o.*,
              v.business_name AS vendor_name, v.slug AS vendor_slug,
              v.address AS vendor_address, v.phone AS vendor_phone,
              u.full_name AS user_name, u.email AS user_email
         FROM orders o
         JOIN vendors v ON v.id = o.vendor_id
         JOIN users u ON u.id = o.user_id
        WHERE o.id = $1`,
      [id]
    );
    if (oRows.length === 0) return sendError(res, "Order not found.", 404);

    const order = oRows[0];
    if (req.user.role !== "ADMIN" && order.user_id !== req.user.id) {
      return sendError(res, "Access denied.", 403);
    }

    const { rows: items } = await query(
      `SELECT oi.*, p.name AS product_name, p.image_url AS product_image
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = $1`,
      [id]
    );

    return sendSuccess(res, { order: { ...order, items } });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/orders/:id/status — Vendor or Admin
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { rows: oRows } = await query("SELECT id, status FROM orders WHERE id = $1", [id]);
    if (oRows.length === 0) return sendError(res, "Order not found.", 404);

    const current = oRows[0].status;
    if (current === "DELIVERED" || current === "CANCELLED") {
      return sendError(res, `Cannot update an order that is already ${current}.`, 400);
    }

    const { rows } = await query(
      "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, id]
    );

    return sendSuccess(res, { order: rows[0] }, "Order status updated.");
  } catch (err) {
    next(err);
  }
};

// PATCH /api/orders/:id/cancel — Authenticated user
const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows: oRows } = await query(
      "SELECT id, user_id, status FROM orders WHERE id = $1",
      [id]
    );
    if (oRows.length === 0) return sendError(res, "Order not found.", 404);

    const order = oRows[0];
    if (order.user_id !== req.user.id) return sendError(res, "Access denied.", 403);
    if (order.status !== "PENDING") return sendError(res, "Only pending orders can be cancelled.", 400);

    const { rows } = await query(
      "UPDATE orders SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1 RETURNING *",
      [id]
    );

    return sendSuccess(res, { order: rows[0] }, "Order cancelled successfully.");
  } catch (err) {
    next(err);
  }
};

module.exports = { createOrder, getAllOrders, getOrderById, updateOrderStatus, cancelOrder };
