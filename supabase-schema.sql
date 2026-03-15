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
  address           TEXT        NOT NULL,
  zip_code          TEXT        NOT NULL,
  city              TEXT        NOT NULL,
  delivery_note     TEXT,
  payment_method    TEXT        NOT NULL CHECK (payment_method IN ('online','cash')),
  status            TEXT        NOT NULL DEFAULT 'processing'
                                CHECK (status IN ('processing','completed')),
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
--  CREATE YOUR FIRST STAFF ACCOUNT
--  1. Go to https://bcrypt-generator.com
--  2. Enter your password, use 12 rounds
--  3. Copy the hash and replace $2a$12$REPLACE_WITH_BCRYPT_HASH below
-- ============================================================
-- INSERT INTO staff_users (email, password_hash, name, role)
-- VALUES (
--   'staff@banana-sushi.de',
--   '$2a$12$REPLACE_WITH_BCRYPT_HASH',
--   'Staff Name',
--   'staff'
-- );
