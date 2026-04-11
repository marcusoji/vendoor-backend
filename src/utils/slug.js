// src/utils/slug.js — URL-safe slug generator for vendor business names

const slugify = require("slugify");
const prisma = require("../config/prisma");

/**
 * Generate a unique slug for a vendor based on their business name.
 * Appends a numeric suffix if the base slug already exists.
 * @param {string} businessName
 * @returns {Promise<string>}
 */
const generateUniqueVendorSlug = async (businessName) => {
  const base = slugify(businessName, { lower: true, strict: true });
  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await prisma.vendor.findUnique({ where: { slug } });
    if (!existing) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
};

module.exports = { generateUniqueVendorSlug };
