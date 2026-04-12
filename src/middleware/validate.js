// src/middleware/validate.js
const { sendError } = require("../utils/response");

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: true, stripUnknown: true });
  if (error) return sendError(res, error.details[0].message, 422);
  req.body = value;
  next();
};

module.exports = validate;
