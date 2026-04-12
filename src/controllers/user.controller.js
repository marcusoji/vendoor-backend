// src/controllers/user.controller.js
const bcrypt = require("bcrypt");
const { query } = require("../db/pool");
const { sendSuccess, sendError } = require("../utils/response");

const SALT_ROUNDS = 12;

// GET /api/users — Admin only
const getAllUsers = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { rows: users } = await query(
      `SELECT id, full_name, email, role, created_at
         FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const { rows: countRows } = await query("SELECT COUNT(*)::int AS total FROM users");
    const total = countRows[0].total;

    return sendSuccess(res, {
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id — Admin or self
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "ADMIN" && req.user.id !== id) {
      return sendError(res, "Access denied.", 403);
    }

    const { rows } = await query(
      "SELECT id, full_name, email, role, created_at FROM users WHERE id = $1",
      [id]
    );
    if (rows.length === 0) return sendError(res, "User not found.", 404);

    return sendSuccess(res, { user: rows[0] });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/users/:id — Self or Admin
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "ADMIN" && req.user.id !== id) {
      return sendError(res, "Access denied.", 403);
    }

    const { fullName, email, password } = req.body;
    const setClauses = [];
    const values = [];
    let idx = 1;

    if (fullName) { setClauses.push(`full_name = $${idx++}`); values.push(fullName); }
    if (email) {
      const { rows } = await query(
        "SELECT id FROM users WHERE email = $1 AND id != $2",
        [email, id]
      );
      if (rows.length > 0) return sendError(res, "Email already in use.", 409);
      setClauses.push(`email = $${idx++}`); values.push(email);
    }
    if (password) {
      const hashed = await bcrypt.hash(password, SALT_ROUNDS);
      setClauses.push(`password = $${idx++}`); values.push(hashed);
    }

    if (setClauses.length === 0) {
      return sendError(res, "No valid fields provided.", 400);
    }

    values.push(id);
    const { rows } = await query(
      `UPDATE users SET ${setClauses.join(", ")}
        WHERE id = $${idx}
        RETURNING id, full_name, email, role, created_at`,
      values
    );

    return sendSuccess(res, { user: rows[0] }, "Profile updated successfully.");
  } catch (err) {
    next(err);
  }
};

// DELETE /api/users/:id — Admin only
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await query("SELECT id FROM users WHERE id = $1", [id]);
    if (rows.length === 0) return sendError(res, "User not found.", 404);

    await query("DELETE FROM users WHERE id = $1", [id]);
    return sendSuccess(res, null, "User deleted successfully.");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllUsers, getUserById, updateUser, deleteUser };
