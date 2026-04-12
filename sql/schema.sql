-- =============================================================================
-- VenDoor — Complete Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run All
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================================
-- ENUMS
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('USER', 'VENDOR', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'PENDING', 'CONFIRMED', 'PREPARING',
    'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- USERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name   TEXT        NOT NULL,
  email       TEXT        NOT NULL UNIQUE,
  password    TEXT        NOT NULL,
  role        user_role   NOT NULL DEFAULT 'USER',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users              IS 'Platform user accounts (customers, vendors, admins).';
COMMENT ON COLUMN users.password     IS 'bcrypt hash — never store plaintext.';
COMMENT ON COLUMN users.role         IS 'USER = customer, VENDOR = restaurant owner, ADMIN = platform staff.';


-- =============================================================================
-- VENDORS
-- =============================================================================

CREATE TABLE IF NOT EXISTS vendors (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name     TEXT        NOT NULL,
  slug              TEXT        NOT NULL UNIQUE,
  categories        TEXT[]      NOT NULL DEFAULT '{}',
  description       TEXT        NOT NULL,
  logo_url          TEXT,
  address           TEXT        NOT NULL,
  phone             TEXT        NOT NULL,
  email             TEXT        NOT NULL UNIQUE,
  state             TEXT        NOT NULL,
  city              TEXT        NOT NULL,
  operating_days    TEXT[]      NOT NULL DEFAULT '{}',
  open_time         TEXT        NOT NULL,
  close_time        TEXT        NOT NULL,
  delivery_radius   INTEGER     NOT NULL DEFAULT 5,
  prep_time         TEXT        NOT NULL DEFAULT '20 mins',
  offers_pickup     BOOLEAN     NOT NULL DEFAULT FALSE,
  offers_scheduled  BOOLEAN     NOT NULL DEFAULT FALSE,
  biz_reg_no        TEXT,
  bank_name         TEXT,
  account_name      TEXT,
  account_number    TEXT,
  is_verified       BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  vendors               IS 'Food vendor / restaurant profiles.';
COMMENT ON COLUMN vendors.slug          IS 'URL-friendly unique identifier (auto-generated from business_name).';
COMMENT ON COLUMN vendors.categories    IS 'e.g. {Restaurant, Fast Food, Bakery}.';
COMMENT ON COLUMN vendors.is_verified   IS 'Set to TRUE by admin after reviewing documents.';
COMMENT ON COLUMN vendors.is_active     IS 'FALSE = soft-deleted / suspended.';


-- =============================================================================
-- PRODUCTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS products (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT          NOT NULL,
  description   TEXT,
  price         NUMERIC(10,2) NOT NULL CHECK (price > 0),
  image_url     TEXT,
  is_available  BOOLEAN       NOT NULL DEFAULT TRUE,
  vendor_id     UUID          NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  products             IS 'Menu items belonging to a vendor.';
COMMENT ON COLUMN products.price       IS 'Price in Nigerian Naira (NGN). Always validated server-side.';
COMMENT ON COLUMN products.vendor_id   IS 'Owning vendor — cascade-deleted when vendor is removed.';


-- =============================================================================
-- ORDERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS orders (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  status           order_status NOT NULL DEFAULT 'PENDING',
  total_amount     NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  delivery_fee     NUMERIC(8,2)  NOT NULL DEFAULT 0,
  delivery_address TEXT         NOT NULL,
  notes            TEXT,
  user_id          UUID         NOT NULL REFERENCES users(id),
  vendor_id        UUID         NOT NULL REFERENCES vendors(id),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  orders              IS 'Customer orders placed against a vendor.';
COMMENT ON COLUMN orders.total_amount IS 'Includes delivery_fee. Always computed server-side.';
COMMENT ON COLUMN orders.delivery_fee IS 'Free for orders >= NGN 5,000.';


-- =============================================================================
-- ORDER ITEMS
-- =============================================================================

CREATE TABLE IF NOT EXISTS order_items (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  quantity    INTEGER       NOT NULL CHECK (quantity > 0),
  price       NUMERIC(10,2) NOT NULL CHECK (price > 0),
  order_id    UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID          NOT NULL REFERENCES products(id)
);

COMMENT ON TABLE  order_items       IS 'Line items within an order.';
COMMENT ON COLUMN order_items.price IS 'Snapshot of product price at time of order — immutable.';


-- =============================================================================
-- REVIEWS
-- =============================================================================

CREATE TABLE IF NOT EXISTS reviews (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  user_id     UUID        NOT NULL REFERENCES users(id),
  product_id  UUID        NOT NULL REFERENCES products(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT reviews_user_product_unique UNIQUE (user_id, product_id)
);

COMMENT ON TABLE  reviews        IS 'User reviews on delivered products (1 per user per product).';
COMMENT ON COLUMN reviews.rating IS '1 = worst, 5 = best.';


-- =============================================================================
-- INDEXES  (common query patterns)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_vendors_state       ON vendors(state);
CREATE INDEX IF NOT EXISTS idx_vendors_city        ON vendors(city);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active   ON vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_vendors_slug        ON vendors(slug);
CREATE INDEX IF NOT EXISTS idx_products_vendor_id  ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_available  ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_orders_user_id      ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id    ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id  ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id     ON reviews(user_id);


-- =============================================================================
-- AUTO-UPDATE updated_at  (trigger function shared across tables)
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vendors_set_updated_at  ON vendors;
DROP TRIGGER IF EXISTS products_set_updated_at ON products;
DROP TRIGGER IF EXISTS orders_set_updated_at   ON orders;

CREATE TRIGGER vendors_set_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- SEED DATA  (optional — for development / demo)
-- =============================================================================

-- Admin user
-- Email:    admin@vendoor.ng
-- Password: Admin@1234  (bcrypt, 12 rounds)
INSERT INTO users (id, full_name, email, password, role)
VALUES (
  uuid_generate_v4(),
  'VenDoor Admin',
  'admin@vendoor.ng',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGMXMGnU2zGpiC1oWFn9Qf4.gMy',
  'ADMIN'
) ON CONFLICT (email) DO NOTHING;

-- Sample vendor
INSERT INTO vendors (
  id, business_name, slug, categories, description,
  address, phone, email, state, city,
  operating_days, open_time, close_time
) VALUES (
  uuid_generate_v4(),
  'Mama''s Kitchen',
  'mamas-kitchen',
  ARRAY['Restaurant', 'Fast Food'],
  'Authentic Nigerian meals cooked fresh daily. Jollof rice, pepper soup and more.',
  '12 University Road, Abraka',
  '08012345678',
  'mamas@kitchen.ng',
  'Delta',
  'Abraka',
  ARRAY['Mon','Tue','Wed','Thu','Fri','Sat'],
  '08:00',
  '20:00'
) ON CONFLICT (email) DO NOTHING;
