// src/controllers/auth.controller.js
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const { query } = require("../db/pool");
const { signToken } = require("../utils/jwt");
const { sendSuccess, sendError } = require("../utils/response");

const SALT_ROUNDS = 12;

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { fullName, email, password, role } = req.body;

    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return sendError(res, "An account with this email already exists.", 409);
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuidv4();

    const { rows } = await query(
      `INSERT INTO users (id, full_name, email, password, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, role, created_at`,
      [id, fullName, email, hashed, role]
    );

    const user = rows[0];
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    return sendSuccess(res, { user, token }, "Account created successfully.", 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { rows } = await query("SELECT * FROM users WHERE email = $1", [email]);
    if (rows.length === 0) return sendError(res, "Invalid email or password.", 401);

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return sendError(res, "Invalid email or password.", 401);

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    const { password: _pw, ...safeUser } = user;

    return sendSuccess(res, { user: safeUser, token }, "Login successful.");
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const me = async (req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT id, full_name, email, role, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (rows.length === 0) return sendError(res, "User not found.", 404);
    return sendSuccess(res, { user: rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me };
