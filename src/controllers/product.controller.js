// src/controllers/product.controller.js
const { v4: uuidv4 } = require("uuid");
const { query } = require("../db/pool");
const { sendSuccess, sendError } = require("../utils/response");

// GET /api/products — Public
const getAllProducts = async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { vendorId, search, minPrice, maxPrice } = req.query;

    const conditions = ["p.is_available = TRUE"];
    const values = [];
    let idx = 1;

    if (vendorId)  { conditions.push(`p.vendor_id = $${idx++}`);  values.push(vendorId); }
    if (search)    {
      conditions.push(`(p.name ILIKE $${idx} OR p.description ILIKE $${idx})`);
      values.push(`%${search}%`); idx++;
    }
    if (minPrice)  { conditions.push(`p.price >= $${idx++}`);  values.push(parseFloat(minPrice)); }
    if (maxPrice)  { conditions.push(`p.price <= $${idx++}`);  values.push(parseFloat(maxPrice)); }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const { rows: products } = await query(
      `SELECT p.id, p.name, p.description, p.price, p.image_url, p.is_available, p.created_at,
              v.id AS vendor_id, v.business_name AS vendor_name, v.slug AS vendor_slug,
              v.city AS vendor_city, v.state AS vendor_state,
              ROUND(AVG(r.rating)::numeric, 1) AS average_rating,
              COUNT(r.id)::int AS review_count
         FROM products p
         JOIN vendors v ON v.id = p.vendor_id
    LEFT JOIN reviews r ON r.product_id = p.id
        ${where}
     GROUP BY p.id, v.id
     ORDER BY p.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );

    const { rows: countRows } = await query(
      `SELECT COUNT(*)::int AS total FROM products p ${where}`,
      values
    );

    return sendSuccess(res, {
      products,
      pagination: { page, limit, total: countRows[0].total, totalPages: Math.ceil(countRows[0].total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/:id — Public
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows: pRows } = await query(
      `SELECT p.*,
              v.id AS vendor_id, v.business_name AS vendor_name, v.slug AS vendor_slug,
              v.city AS vendor_city, v.state AS vendor_state,
              v.prep_time, v.is_verified AS vendor_verified,
              ROUND(AVG(r.rating)::numeric, 1) AS average_rating,
              COUNT(r.id)::int AS review_count
         FROM products p
         JOIN vendors v ON v.id = p.vendor_id
    LEFT JOIN reviews r ON r.product_id = p.id
        WHERE p.id = $1
     GROUP BY p.id, v.id`,
      [id]
    );
    if (pRows.length === 0) return sendError(res, "Product not found.", 404);

    const { rows: reviews } = await query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.id AS user_id, u.full_name AS user_name
         FROM reviews r
         JOIN users u ON u.id = r.user_id
        WHERE r.product_id = $1
        ORDER BY r.created_at DESC`,
      [id]
    );

    return sendSuccess(res, { product: { ...pRows[0], reviews } });
  } catch (err) {
    next(err);
  }
};

// POST /api/products — Vendor or Admin
const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, vendorId, imageUrl, isAvailable } = req.body;

    const { rows: vRows } = await query("SELECT id FROM vendors WHERE id = $1", [vendorId]);
    if (vRows.length === 0) return sendError(res, "Vendor not found.", 404);

    const id = uuidv4();
    const { rows } = await query(
      `INSERT INTO products (id, name, description, price, vendor_id, image_url, is_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, name, description || null, price, vendorId, imageUrl || null, isAvailable !== false]
    );

    return sendSuccess(res, { product: rows[0] }, "Product created successfully.", 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/products/:id — Vendor or Admin
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows: existing } = await query("SELECT id FROM products WHERE id = $1", [id]);
    if (existing.length === 0) return sendError(res, "Product not found.", 404);

    const fieldMap = {
      name:        "name",
      description: "description",
      price:       "price",
      imageUrl:    "image_url",
      isAvailable: "is_available",
    };

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [jsKey, sqlCol] of Object.entries(fieldMap)) {
      if (req.body[jsKey] !== undefined) {
        setClauses.push(`${sqlCol} = $${idx++}`);
        values.push(req.body[jsKey]);
      }
    }

    if (setClauses.length === 0) return sendError(res, "No valid fields provided.", 400);

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await query(
      `UPDATE products SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    return sendSuccess(res, { product: rows[0] }, "Product updated successfully.");
  } catch (err) {
    next(err);
  }
};

// DELETE /api/products/:id — Vendor or Admin
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await query("SELECT id FROM products WHERE id = $1", [id]);
    if (rows.length === 0) return sendError(res, "Product not found.", 404);

    await query("DELETE FROM products WHERE id = $1", [id]);
    return sendSuccess(res, null, "Product deleted successfully.");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct };
