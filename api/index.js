// api/index.js — Vercel serverless entry point
// This file exports the Express app as a serverless function.
// Vercel invokes this handler directly; no server.listen() is needed.

require("dotenv").config();
const app = require("../src/app");

module.exports = app;
