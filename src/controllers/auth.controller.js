// src/controllers/auth.controller.js — Registration and login

const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");
const { signToken } = require("../utils/jwt");
const { sendSuccess, sendError } = require("../utils/response");

const SALT_ROUNDS = 12;

/**
 * POST /api/auth/register
 * Public — create a new user account.
 */
const register = async (req, res, next) => {
  try {
    const { fullName, email, password, role } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return sendError(res, "An account with this email already exists.", 409);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { fullName, email, password: hashedPassword, role },
      select: { id: true, fullName: true, email: true, role: true, createdAt: true },
    });

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    return sendSuccess(res, { user, token }, "Account created successfully.", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Public — authenticate and receive a JWT.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return sendError(res, "Invalid email or password.", 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return sendError(res, "Invalid email or password.", 401);
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    const { password: _pw, ...safeUser } = user;

    return sendSuccess(res, { user: safeUser, token }, "Login successful.");
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Protected — return the currently authenticated user.
 */
const me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, fullName: true, email: true, role: true, createdAt: true },
    });

    if (!user) {
      return sendError(res, "User not found.", 404);
    }

    return sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me };
