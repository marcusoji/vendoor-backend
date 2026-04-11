// src/middleware/validate.js — Joi schema validation middleware factory

const { sendError } = require("../utils/response");

/**
 * Returns Express middleware that validates req.body against a Joi schema.
 * On failure, responds with 422 and the first validation error message.
 * @param {import('joi').Schema} schema
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      return sendError(res, error.details[0].message, 422);
    }

    req.body = value; // replace body with sanitised/coerced value
    next();
  };
};

module.exports = validate;
