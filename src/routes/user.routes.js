// src/routes/user.routes.js

const express = require("express");
const router = express.Router();
const { getAllUsers, getUserById, updateUser, deleteUser } = require("../controllers/user.controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

// All user routes require authentication
router.use(authenticate);

// GET /api/users — Admin only
router.get("/", authorize("ADMIN"), getAllUsers);

// GET /api/users/:id — Admin or self
router.get("/:id", getUserById);

// PATCH /api/users/:id — Admin or self
router.patch("/:id", updateUser);

// DELETE /api/users/:id — Admin only
router.delete("/:id", authorize("ADMIN"), deleteUser);

module.exports = router;
