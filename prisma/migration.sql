-- =============================================================================
-- VenDoor Database — Manual SQL Migration for Supabase
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- =============================================================================

-- Enable UUID extension (already enabled on Supabase by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE "Role" AS ENUM ('USER', 'VENDOR', 'ADMIN');
CREATE TYPE "OrderStatus" AS ENUM (
  'PENDING', 'CONFIRMED', 'PREPARING',
  'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'
);

-- =============================================================================
-- TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "fullName"  TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  role        "Role" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendors (
  id                TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  "businessName"    TEXT NOT NULL,
  slug              TEXT UNIQUE NOT NULL,
  categories        TEXT[] NOT NULL DEFAULT '{}',
  description       TEXT NOT NULL,
  "logoUrl"         TEXT,
  address           TEXT NOT NULL,
  phone             TEXT NOT NULL,
  email             TEXT UNIQUE NOT NULL,
  state             TEXT NOT NULL,
  city              TEXT NOT NULL,
  "operatingDays"   TEXT[] NOT NULL DEFAULT '{}',
  "openTime"        TEXT NOT NULL,
  "closeTime"       TEXT NOT NULL,
  "deliveryRadius"  INTEGER NOT NULL DEFAULT 5,
  "prepTime"        TEXT NOT NULL DEFAULT '20 mins',
  "offersPickup"    BOOLEAN NOT NULL DEFAULT FALSE,
  "offersScheduled" BOOLEAN NOT NULL DEFAULT FALSE,
  "bizRegNo"        TEXT,
  "bankName"        TEXT,
  "accountName"     TEXT,
  "accountNumber"   TEXT,
  "isVerified"      BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive"        BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  description   TEXT,
  price         DOUBLE PRECISION NOT NULL,
  "imageUrl"    TEXT,
  "isAvailable" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "vendorId"    TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status            "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "totalAmount"     DOUBLE PRECISION NOT NULL,
  "deliveryAddress" TEXT NOT NULL,
  "deliveryFee"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  notes             TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "userId"          UUID NOT NULL REFERENCES users(id),
  "vendorId"        TEXT NOT NULL REFERENCES vendors(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quantity    INTEGER NOT NULL,
  price       DOUBLE PRECISION NOT NULL,
  "orderId"   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  "productId" UUID NOT NULL REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "userId"    UUID NOT NULL REFERENCES users(id),
  "productId" UUID NOT NULL REFERENCES products(id),
  UNIQUE ("userId", "productId")
);

-- =============================================================================
-- INDEXES — for common query patterns
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_vendors_state      ON vendors(state);
CREATE INDEX IF NOT EXISTS idx_vendors_city       ON vendors(city);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active  ON vendors("isActive");
CREATE INDEX IF NOT EXISTS idx_products_vendor    ON products("vendorId");
CREATE INDEX IF NOT EXISTS idx_orders_user        ON orders("userId");
CREATE INDEX IF NOT EXISTS idx_orders_vendor      ON orders("vendorId");
CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders(status);
CREATE INDEX IF NOT EXISTS idx_reviews_product    ON reviews("productId");
CREATE INDEX IF NOT EXISTS idx_reviews_user       ON reviews("userId");

-- =============================================================================
-- AUTO-UPDATE updatedAt trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SEED DATA — optional, for development / demo
-- =============================================================================

-- Admin user (password: Admin@1234  — bcrypt hash, 12 rounds)
INSERT INTO users (id, "fullName", email, password, role)
VALUES (
  uuid_generate_v4(),
  'VenDoor Admin',
  'admin@vendoor.ng',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGMXMGnU2zGpiC1oWFn9Qf4.gMy',
  'ADMIN'
) ON CONFLICT (email) DO NOTHING;
