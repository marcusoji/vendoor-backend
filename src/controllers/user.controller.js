// src/controllers/user.controller.js — User profile management

const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");
const { sendSuccess, sendError } = require("../utils/response");

const SALT_ROUNDS = 12;

/**
 * GET /api/users
 * Admin only — list all users with pagination.
 */
const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: { id: true, fullName: true, email: true, role: true, createdAt: true },
      }),
      prisma.user.count(),
    ]);

    return sendSuccess(res, {
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:id
 * Admin or self — get a single user profile.
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Non-admins may only view their own profile
    if (req.user.role !== "ADMIN" && req.user.id !== id) {
      return sendError(res, "Access denied.", 403);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, fullName: true, email: true, role: true, createdAt: true },
    });

    if (!user) return sendError(res, "User not found.", 404);

    return sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/users/:id
 * Authenticated — update own profile (fullName, email, password).
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "ADMIN" && req.user.id !== id) {
      return sendError(res, "Access denied.", 403);
    }

    const { fullName, email, password } = req.body;
    const updateData = {};

    if (fullName) updateData.fullName = fullName;
    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (existing) return sendError(res, "Email is already in use.", 409);
      updateData.email = email;
    }
    if (password) {
      updateData.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    if (Object.keys(updateData).length === 0) {
      return sendError(res, "No valid fields provided for update.", 400);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, fullName: true, email: true, role: true, createdAt: true },
    });

    return sendSuccess(res, { user }, "Profile updated successfully.");
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/users/:id
 * Admin only — delete a user account.
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return sendError(res, "User not found.", 404);

    await prisma.user.delete({ where: { id } });

    return sendSuccess(res, null, "User deleted successfully.");
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllUsers, getUserById, updateUser, deleteUser };
