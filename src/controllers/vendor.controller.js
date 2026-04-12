// src/controllers/vendor.controller.js
const { v4: uuidv4 } = require("uuid");
const { query } = require("../db/pool");
const { generateUniqueVendorSlug } = require("../utils/slug");
const { sendSuccess, sendError } = require("../utils/response");

// GET /api/vendors — Public
const getAllVendors = async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { state, city, category, search } = req.query;

    const conditions = ["v.is_active = TRUE"];
    const values = [];
    let idx = 1;

    if (state)    { conditions.push(`v.state = $${idx++}`);            values.push(state); }
    if (city)     { conditions.push(`v.city = $${idx++}`);             values.push(city); }
    if (category) { conditions.push(`$${idx++} = ANY(v.categories)`);  values.push(category); }
    if (search) {
      conditions.push(`(v.business_name ILIKE $${idx} OR v.description ILIKE $${idx})`);
      values.push(`%${search}%`); idx++;
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const { rows: vendors } = await query(
      `SELECT id, business_name, slug, categories, description, logo_url,
              address, city, state, phone, email, prep_time, delivery_radius,
              is_verified, open_time, close_time, operating_days,
              offers_pickup, offers_scheduled, created_at
         FROM vendors ${where}
        ORDER BY created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );

    const { rows: countRows } = await query(
      `SELECT COUNT(*)::int AS total FROM vendors ${where}`,
      values
    );

    return sendSuccess(res, {
      vendors,
      pagination: { page, limit, total: countRows[0].total, totalPages: Math.ceil(countRows[0].total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/vendors/:idOrSlug — Public
const getVendorById = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;

    const { rows } = await query(
      `SELECT * FROM vendors WHERE (id = $1 OR slug = $1) AND is_active = TRUE`,
      [idOrSlug]
    );
    if (rows.length === 0) return sendError(res, "Vendor not found.", 404);

    const vendor = rows[0];

    const { rows: products } = await query(
      `SELECT id, name, description, price, image_url, is_available, created_at
         FROM products
        WHERE vendor_id = $1 AND is_available = TRUE
        ORDER BY created_at DESC`,
      [vendor.id]
    );

    return sendSuccess(res, { vendor: { ...vendor, products } });
  } catch (err) {
    next(err);
  }
};

// POST /api/vendors — Authenticated
const createVendor = async (req, res, next) => {
  try {
    const {
      businessName, categories, description, logoUrl, address, phone, email,
      state, city, operatingDays, openTime, closeTime, deliveryRadius,
      prepTime, offersPickup, offersScheduled, bizRegNo, bankName, accountName, accountNumber,
    } = req.body;

    const existing = await query("SELECT id FROM vendors WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return sendError(res, "A vendor with this email already exists.", 409);
    }

    const id   = uuidv4();
    const slug = await generateUniqueVendorSlug(businessName);

    const { rows } = await query(
      `INSERT INTO vendors (
         id, business_name, slug, categories, description, logo_url,
         address, phone, email, state, city, operating_days,
         open_time, close_time, delivery_radius, prep_time,
         offers_pickup, offers_scheduled, biz_reg_no,
         bank_name, account_name, account_number
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
       ) RETURNING *`,
      [
        id, businessName, slug, categories, description, logoUrl || null,
        address, phone, email, state, city, operatingDays,
        openTime, closeTime, deliveryRadius, prepTime,
        offersPickup, offersScheduled, bizRegNo || null,
        bankName || null, accountName || null, accountNumber || null,
      ]
    );

    return sendSuccess(res, { vendor: rows[0] }, "Vendor registered successfully.", 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/vendors/:id — Vendor or Admin
const updateVendor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows: existing } = await query("SELECT * FROM vendors WHERE id = $1", [id]);
    if (existing.length === 0) return sendError(res, "Vendor not found.", 404);

    const fieldMap = {
      businessName:    "business_name",
      categories:      "categories",
      description:     "description",
      logoUrl:         "logo_url",
      address:         "address",
      phone:           "phone",
      email:           "email",
      state:           "state",
      city:            "city",
      operatingDays:   "operating_days",
      openTime:        "open_time",
      closeTime:       "close_time",
      deliveryRadius:  "delivery_radius",
      prepTime:        "prep_time",
      offersPickup:    "offers_pickup",
      offersScheduled: "offers_scheduled",
      bizRegNo:        "biz_reg_no",
      bankName:        "bank_name",
      accountName:     "account_name",
      accountNumber:   "account_number",
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

    // Regenerate slug if business name changed
    if (req.body.businessName && req.body.businessName !== existing[0].business_name) {
      const newSlug = await generateUniqueVendorSlug(req.body.businessName);
      setClauses.push(`slug = $${idx++}`);
      values.push(newSlug);
    }

    setClauses.push(`updated_at = NOW()`);

    values.push(id);
    const { rows } = await query(
      `UPDATE vendors SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    return sendSuccess(res, { vendor: rows[0] }, "Vendor updated successfully.");
  } catch (err) {
    next(err);
  }
};

// DELETE /api/vendors/:id — Admin only (soft delete)
const deleteVendor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await query("SELECT id FROM vendors WHERE id = $1", [id]);
    if (rows.length === 0) return sendError(res, "Vendor not found.", 404);

    await query("UPDATE vendors SET is_active = FALSE, updated_at = NOW() WHERE id = $1", [id]);
    return sendSuccess(res, null, "Vendor deactivated successfully.");
  } catch (err) {
    next(err);
  }
};

// PATCH /api/vendors/:id/verify — Admin only
const verifyVendor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await query(
      "UPDATE vendors SET is_verified = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *",
      [id]
    );
    if (rows.length === 0) return sendError(res, "Vendor not found.", 404);

    return sendSuccess(res, { vendor: rows[0] }, "Vendor verified successfully.");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllVendors, getVendorById, createVendor, updateVendor, deleteVendor, verifyVendor };
