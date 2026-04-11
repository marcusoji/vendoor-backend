-- ============================================================
-- VenDoor Database Setup — Supabase Postgres
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Or via Prisma: npx prisma db push
-- ============================================================

-- Enable UUID extension (already enabled on Supabase by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────
CREATE TYPE "Role" AS ENUM ('USER', 'VENDOR', 'ADMIN');
CREATE TYPE "OrderStatus" AS ENUM (
  'PENDING', 'CONFIRMED', 'PREPARING',
  'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'
);

-- ─── Users ───────────────────────────────────────────────────
CREATE TABLE "users" (
  "id"        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "fullName"  TEXT NOT NULL,
  "email"     TEXT NOT NULL UNIQUE,
  "password"  TEXT NOT NULL,
  "role"      "Role" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Vendors ─────────────────────────────────────────────────
CREATE TABLE "vendors" (
  "id"               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "businessName"     TEXT NOT NULL,
  "slug"             TEXT NOT NULL UNIQUE,
  "categories"       TEXT[] NOT NULL DEFAULT '{}',
  "description"      TEXT NOT NULL,
  "logoUrl"          TEXT,
  "address"          TEXT NOT NULL,
  "phone"            TEXT NOT NULL,
  "email"            TEXT NOT NULL UNIQUE,
  "state"            TEXT NOT NULL,
  "city"             TEXT NOT NULL,
  "operatingDays"    TEXT[] NOT NULL DEFAULT '{}',
  "openTime"         TEXT NOT NULL,
  "closeTime"        TEXT NOT NULL,
  "deliveryRadius"   INTEGER NOT NULL DEFAULT 5,
  "prepTime"         TEXT NOT NULL DEFAULT '20 mins',
  "offersPickup"     BOOLEAN NOT NULL DEFAULT FALSE,
  "offersScheduled"  BOOLEAN NOT NULL DEFAULT FALSE,
  "bizRegNo"         TEXT,
  "bankName"         TEXT,
  "accountName"      TEXT,
  "accountNumber"    TEXT,
  "isVerified"       BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive"         BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Products ────────────────────────────────────────────────
CREATE TABLE "products" (
  "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "price"       DOUBLE PRECISION NOT NULL,
  "imageUrl"    TEXT,
  "isAvailable" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "vendorId"    UUID NOT NULL REFERENCES "vendors"("id") ON DELETE CASCADE
);

-- ─── Orders ──────────────────────────────────────────────────
CREATE TABLE "orders" (
  "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "status"          "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "totalAmount"     DOUBLE PRECISION NOT NULL,
  "deliveryAddress" TEXT NOT NULL,
  "deliveryFee"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes"           TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "userId"          UUID NOT NULL REFERENCES "users"("id"),
  "vendorId"        UUID NOT NULL REFERENCES "vendors"("id")
);

-- ─── Order Items ─────────────────────────────────────────────
CREATE TABLE "order_items" (
  "id"        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "quantity"  INTEGER NOT NULL,
  "price"     DOUBLE PRECISION NOT NULL,
  "orderId"   UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "productId" UUID NOT NULL REFERENCES "products"("id")
);

-- ─── Reviews ─────────────────────────────────────────────────
CREATE TABLE "reviews" (
  "id"        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "rating"    INTEGER NOT NULL CHECK ("rating" >= 1 AND "rating" <= 5),
  "comment"   TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "userId"    UUID NOT NULL REFERENCES "users"("id"),
  "productId" UUID NOT NULL REFERENCES "products"("id"),
  UNIQUE ("userId", "productId")
);

-- ─── Indexes ─────────────────────────────────────────────────
CREATE INDEX idx_products_vendor    ON "products"("vendorId");
CREATE INDEX idx_orders_user        ON "orders"("userId");
CREATE INDEX idx_orders_vendor      ON "orders"("vendorId");
CREATE INDEX idx_orders_status      ON "orders"("status");
CREATE INDEX idx_order_items_order  ON "order_items"("orderId");
CREATE INDEX idx_reviews_product    ON "reviews"("productId");
CREATE INDEX idx_vendors_state_city ON "vendors"("state", "city");
CREATE INDEX idx_vendors_slug       ON "vendors"("slug");

-- ─── Auto-update updatedAt trigger ───────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vendors_updated_at
  BEFORE UPDATE ON "vendors"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON "products"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON "orders"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Row Level Security (RLS) ─────────────────────────────────
-- Enable RLS on all tables (backend uses service role, bypasses RLS)
ALTER TABLE "users"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendors"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews"     ENABLE ROW LEVEL SECURITY;

-- ─── Seed: Admin user (change password hash before production!) ──
-- Password below is: Admin@VenDoor2025
-- Generate a new bcrypt hash: node -e "require('bcrypt').hash('yourpass',12).then(console.log)"
INSERT INTO "users" ("fullName", "email", "password", "role")
VALUES (
  'VenDoor Admin',
  'admin@vendoor.ng',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhh7k9Xq1MzWz1G3M7U7eK',
  'ADMIN'
) ON CONFLICT DO NOTHING;
