const { v4: uuidv4 } = require("uuid");
const { query } = require("../db/pool");
const { sendSuccess, sendError } = require("../utils/response");

const registerRider = async (req, res, next) => {
  try {
    const { fullName, phone, email, city, vehicleType, boxSize, licenseUrl } = req.body;

    const existing = await query("SELECT id FROM riders WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return sendError(res, "A rider with this email already exists.", 409);
    }

    const id = uuidv4();
    const { rows } = await query(
      `INSERT INTO riders (id, full_name, phone, email, city, vehicle_type, box_size, license_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, fullName, phone, email, city, vehicleType, boxSize, licenseUrl || null]
    );

    return sendSuccess(res, { rider: rows[0] }, "Rider application submitted successfully.", 201);
  } catch (err) {
    next(err);
  }
};

const getAllRiders = async (req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT id, full_name, phone, email, city, vehicle_type, box_size, status, created_at FROM riders ORDER BY created_at DESC"
    );
    return sendSuccess(res, { riders: rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { registerRider, getAllRiders };