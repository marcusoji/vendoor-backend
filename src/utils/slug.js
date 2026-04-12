// src/utils/slug.js
const slugify = require("slugify");
const { query } = require("../db/pool");

const generateUniqueVendorSlug = async (businessName) => {
  const base = slugify(businessName, { lower: true, strict: true });
  let slug = base;
  let counter = 1;

  while (true) {
    const { rows } = await query("SELECT id FROM vendors WHERE slug = $1", [slug]);
    if (rows.length === 0) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
};

module.exports = { generateUniqueVendorSlug };
