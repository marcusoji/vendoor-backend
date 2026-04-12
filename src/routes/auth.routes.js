// src/routes/auth.routes.js
const express = require("express");
const router  = express.Router();
const { register, login, me } = require("../controllers/auth.controller");
const validate      = require("../middleware/validate");
const authenticate  = require("../middleware/authenticate");
const { authRateLimiter } = require("../middleware/rateLimiter");
const { registerSchema, loginSchema } = require("../utils/schemas");

router.post("/register", authRateLimiter, validate(registerSchema), register);
router.post("/login",    authRateLimiter, validate(loginSchema),    login);
router.get("/me",        authenticate,                               me);

module.exports = router;
