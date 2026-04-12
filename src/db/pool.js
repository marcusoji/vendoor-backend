// src/db/pool.js — PostgreSQL connection pool (pg)
// A single Pool instance is shared across all requests.
// On Vercel serverless, the module cache keeps it warm between invocations.

const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL environment variable.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for Supabase
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Unexpected pg pool error:", err.message);
});

/**
 * Run a single parameterised query.
 * @param {string} text   - SQL string with $1, $2 … placeholders
 * @param {any[]}  params - Parameter values
 */
const query = (text, params) => pool.query(text, params);

/**
 * Acquire a client from the pool for transactions.
 * Always call client.release() in a finally block.
 */
const getClient = () => pool.connect();

module.exports = { query, getClient };
