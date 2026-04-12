// src/app.js — Express application bootstrap
require("dotenv").config();

const express    = require("express");
const helmet     = require("helmet");
const cors       = require("cors");
const { globalErrorHandler, notFoundHandler } = require("./middleware/errorHandler");
const rateLimiter = require("./middleware/rateLimiter");

const authRoutes    = require("./routes/auth.routes");
const userRoutes    = require("./routes/user.routes");
const vendorRoutes  = require("./routes/vendor.routes");
const productRoutes = require("./routes/product.routes");
const orderRoutes   = require("./routes/order.routes");
const reviewRoutes  = require("./routes/review.routes");
const uploadRoutes  = require("./routes/upload.routes");

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS policy: origin '${origin}' is not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Rate limiter ──────────────────────────────────────────────────────────────
app.use("/api", rateLimiter);

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) =>
  res.json({
    status: "ok",
    service: "VenDoor API",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  })
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/users",    userRoutes);
app.use("/api/vendors",  vendorRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders",   orderRoutes);
app.use("/api/reviews",  reviewRoutes);
app.use("/api/upload",   uploadRoutes);

// ── Error handlers (must be last) ─────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
