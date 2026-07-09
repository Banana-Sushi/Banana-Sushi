-- ============================================================
--  BANANA SUSHI — Supabase Database Schema
--  Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name_de          TEXT        NOT NULL,
  name_en          TEXT        NOT NULL,
  description_de   TEXT        DEFAULT '',
  description_en   TEXT        DEFAULT '',
  price            DECIMAL(10,2) NOT NULL,
  category         TEXT        NOT NULL,
  image            TEXT        DEFAULT '',
  is_available     BOOLEAN     DEFAULT true,
  is_featured      BOOLEAN     DEFAULT false,
  addons_optional  JSONB       DEFAULT '[]',
  addons_mandatory JSONB       DEFAULT '[]',
  discount_type    TEXT        CHECK (discount_type IN ('percentage','fixed')),
  discount_value   DECIMAL(10,2),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Orders
CREATE TABLE IF NOT EXISTS orders (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number      TEXT        UNIQUE NOT NULL,
  customer_name     TEXT        NOT NULL,
  phone             TEXT        NOT NULL,
  address           TEXT,
  zip_code          TEXT,
  city              TEXT,
  delivery_note     TEXT,
  payment_method    TEXT        NOT NULL CHECK (payment_method IN ('online','cash','pickup_online','pickup_cash')),
  status            TEXT        NOT NULL DEFAULT 'processing'
                                CHECK (status IN ('pending','processing','ready_for_pickup','completed')),
  items             JSONB       NOT NULL,
  subtotal          DECIMAL(10,2) NOT NULL,
  delivery_fee      DECIMAL(10,2) NOT NULL DEFAULT 2.90,
  total             DECIMAL(10,2) NOT NULL,
  stripe_session_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Staff Users
CREATE TABLE IF NOT EXISTS staff_users (
  id            UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  email         TEXT  UNIQUE NOT NULL,
  password_hash TEXT  NOT NULL,
  name          TEXT  NOT NULL,
  role          TEXT  NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','staff')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add-ons and Discount columns for menu_items
--    Run these if upgrading an existing database:
-- ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS addons_optional JSONB DEFAULT '[]';
-- ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS addons_mandatory JSONB DEFAULT '[]';
-- ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('percentage','fixed'));
-- ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2);

-- 5. Enable Realtime for orders (so dashboard gets live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- 6. Discounts (product / category / global / command promotional discounts)
-- Run this block to reset discounts to the new schema:
DROP TABLE IF EXISTS discounts;

CREATE TABLE discounts (
  id               UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  section          TEXT          NOT NULL CHECK (section IN ('product','category','global','command')),
  menu_item_id     UUID          REFERENCES menu_items(id) ON DELETE CASCADE,
  category_name    TEXT,
  discount_type    TEXT          NOT NULL CHECK (discount_type IN ('percentage','fixed','two_for_one')),
  discount_value   DECIMAL(10,2),
  min_order_total  DECIMAL(10,2),
  start_date       TIMESTAMPTZ,
  end_date         TIMESTAMPTZ,
  is_active        BOOLEAN       NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ   DEFAULT NOW()
);

-- 7. Scheduled time for orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_time TEXT;

-- 8. Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  code            TEXT          UNIQUE NOT NULL,
  discount_type   TEXT          NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value  DECIMAL(10,2) NOT NULL,
  min_order_total DECIMAL(10,2),
  start_date      TIMESTAMPTZ,
  end_date        TIMESTAMPTZ,
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  uses_limit      INTEGER       NOT NULL,
  uses_count      INTEGER       NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupon_uses (
  id                  UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id           UUID  REFERENCES coupons(id) ON DELETE CASCADE,
  order_id            UUID  REFERENCES orders(id) ON DELETE CASCADE,
  customer_identifier TEXT  NOT NULL,
  used_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Add coupon columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(10,2) DEFAULT 0;

-- RPC to atomically increment coupon uses_count
CREATE OR REPLACE FUNCTION increment_coupon_uses(coupon_id_param UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE coupons SET uses_count = uses_count + 1 WHERE id = coupon_id_param;
$$;

-- Grant access (SQL Editor does not auto-grant unlike Table Editor)
GRANT ALL ON TABLE coupons     TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE coupon_uses TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_coupon_uses(UUID) TO postgres, anon, authenticated, service_role;

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================

-- Disable RLS for server-side API access (we use the service role key)
-- Enable only if you want extra security:
-- ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;

-- ============================================================
--  SEED SAMPLE MENU ITEMS (optional — delete after testing)
-- ============================================================
INSERT INTO menu_items (name_de, name_en, description_de, description_en, price, category, image, is_available, is_featured)
VALUES
  ('Sunset Roll', 'Sunset Roll', 'Tempura Garnele, Avocado, Lachs-Topping & Spicy Mayo.', 'Tempura shrimp, avocado, salmon topping & spicy mayo.', 14.50, 'Sushi', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=800', true, true),
  ('Ocean Bowl', 'Ocean Bowl', 'Thunfisch, Lachs, Avocado, Gurke & Ponzu Dressing.', 'Tuna, salmon, avocado, cucumber & ponzu dressing.', 16.90, 'Bowls', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800', true, true),
  ('Mango Lassi Roll', 'Mango Lassi Roll', 'Garnele, Mango, Frischkäse & süße Chilisauce.', 'Shrimp, mango, cream cheese & sweet chili sauce.', 13.90, 'Sushi', 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?auto=format&fit=crop&q=80&w=800', true, true),
  ('Crunchy Tiger', 'Crunchy Tiger', 'Garnele Tempura, Avocado & knusprige Zwiebeln.', 'Shrimp tempura, avocado & crispy onions.', 15.20, 'Sushi', 'https://images.unsplash.com/photo-1562802378-063ec186a863?auto=format&fit=crop&q=80&w=800', true, true),
  ('Salmon Nigiri', 'Salmon Nigiri', '2 Stück Nigiri mit frischem Lachs.', '2 pieces of nigiri with fresh salmon.', 8.50, 'Sushi', 'https://images.unsplash.com/photo-1597271836525-da8827bb17c4?auto=format&fit=crop&q=80&w=800', true, false),
  ('Matcha Tee', 'Matcha Tea', 'Heißer japanischer Bio-Matcha.', 'Hot Japanese organic matcha.', 4.50, 'Drinks', 'https://images.unsplash.com/photo-1545315003-c5ad6226c272?auto=format&fit=crop&q=80&w=800', true, false)
ON CONFLICT DO NOTHING;

-- ============================================================
--  CUSTOMER ACCOUNTS
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  id                        UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name                TEXT    NOT NULL,
  last_name                 TEXT    NOT NULL,
  email                     TEXT    UNIQUE NOT NULL,
  email_verified            BOOLEAN DEFAULT false,
  email_verification_token  TEXT,
  password_hash             TEXT    NOT NULL,
  gender                    TEXT    CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  birthdate                 DATE,
  phone                     TEXT,
  marketing_consent         BOOLEAN DEFAULT false,
  discount_emails_consent   BOOLEAN DEFAULT false,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID    REFERENCES customers(id) ON DELETE CASCADE,
  label       TEXT,
  street      TEXT    NOT NULL,
  zip_code    TEXT    NOT NULL,
  city        TEXT    NOT NULL,
  is_main     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS discount_emails_consent BOOLEAN DEFAULT false;

GRANT ALL ON TABLE customers          TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE customer_addresses TO postgres, anon, authenticated, service_role;

-- ============================================================
--  MIGRATION: Fix pickup orders & Stripe pending status
--  Run these in Supabase SQL Editor if upgrading an existing DB
-- ============================================================
-- Allow NULL address/zip/city for pickup orders
ALTER TABLE orders ALTER COLUMN address  DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN zip_code DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN city     DROP NOT NULL;

-- Allow pickup_online / pickup_cash payment methods
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('online','cash','pickup_online','pickup_cash'));

-- Allow 'pending' status (used by Stripe flow before payment completes)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','processing','ready_for_pickup','completed'));

-- ============================================================
--  CREATE YOUR FIRST STAFF ACCOUNT
--  1. Go to https://bcrypt-generator.com
--  2. Enter your password, use 12 rounds
--  3. Copy the hash and replace $2a$12$REPLACE_WITH_BCRYPT_HASH below
-- ============================================================
-- INSERT INTO staff_users (email, password_hash, name, role)
-- VALUES (
--   'staff@banana-sushi.de',
--   '$2a$12$REPLACE_WITH_BCRYPT_HASH',
--   'Staff Name',ba
--   'staff'
-- );

-- Financial Reports
CREATE TABLE IF NOT EXISTS financial_reports (
  id           UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  start_date   DATE          NOT NULL,
  end_date     DATE          NOT NULL,
  generated_at TIMESTAMPTZ   DEFAULT NOW(),
  generated_by TEXT          NOT NULL,
  report_data  JSONB         NOT NULL
);
GRANT ALL ON TABLE financial_reports TO postgres, anon, authenticated, service_role;
