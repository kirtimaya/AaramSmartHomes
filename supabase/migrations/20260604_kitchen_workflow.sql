-- Kitchen Workflow — Alexa Skill Backend
-- Tables: menus, menu_items, menu_ingredients, grocery_alerts

-- ── Core Tables ─────────────────────────────────────────────────────────────

-- Daily menu entry per property per meal period
CREATE TABLE IF NOT EXISTS menus (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID        REFERENCES properties(id) ON DELETE SET NULL,
  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  meal_block  TEXT        NOT NULL CHECK (meal_block IN ('Breakfast', 'Lunch', 'Dinner')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (date, meal_block, property_id)
);

-- Individual dishes within a menu (e.g. Dal, Rice, Sabzi)
CREATE TABLE IF NOT EXISTS menu_items (
  id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id     UUID      NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  item_name   TEXT      NOT NULL,
  sort_order  SMALLINT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ingredients required for a menu (read out on cook departure)
CREATE TABLE IF NOT EXISTS menu_ingredients (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id          UUID        NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  ingredient_name  TEXT        NOT NULL,
  quantity         TEXT,                     -- "500", "2 dozen", "as needed"
  unit             TEXT,                     -- "grams", "kg", "pieces", "liters"
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Missing items reported by the cook via Alexa, parsed by Gemini
CREATE TABLE IF NOT EXISTS grocery_alerts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id          UUID        REFERENCES menus(id) ON DELETE SET NULL,
  property_id      UUID        REFERENCES properties(id) ON DELETE SET NULL,
  meal_block       TEXT        CHECK (meal_block IN ('Breakfast', 'Lunch', 'Dinner')),
  raw_utterance    TEXT        NOT NULL,
  extracted_items  TEXT[]      NOT NULL DEFAULT '{}',
  logged_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ,
  resolved_by      TEXT
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_menus_date_block
  ON menus(date, meal_block);

CREATE INDEX IF NOT EXISTS idx_menu_items_menu_id
  ON menu_items(menu_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_menu_ingredients_menu_id
  ON menu_ingredients(menu_id);

CREATE INDEX IF NOT EXISTS idx_grocery_alerts_unresolved
  ON grocery_alerts(logged_at DESC)
  WHERE resolved_at IS NULL;

-- ── Row-Level Security ────────────────────────────────────────────────────────
-- The Alexa webhook uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
-- Admin dashboard users are checked against the existing `admins` table.

ALTER TABLE menus             ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_ingredients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_alerts    ENABLE ROW LEVEL SECURITY;

-- Admins have full access to all kitchen tables
CREATE POLICY "admins_all_menus" ON menus FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE email = (auth.jwt()->>'email')::TEXT));

CREATE POLICY "admins_all_menu_items" ON menu_items FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE email = (auth.jwt()->>'email')::TEXT));

CREATE POLICY "admins_all_menu_ingredients" ON menu_ingredients FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE email = (auth.jwt()->>'email')::TEXT));

CREATE POLICY "admins_all_grocery_alerts" ON grocery_alerts FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE email = (auth.jwt()->>'email')::TEXT));

-- ── Seed: example menu for today ─────────────────────────────────────────────
-- Uncomment and adjust to populate test data.

INSERT INTO menus (date, meal_block, notes)
VALUES (CURRENT_DATE, 'Breakfast', 'South Indian spread')
ON CONFLICT DO NOTHING;

WITH m AS (SELECT id FROM menus WHERE date = CURRENT_DATE AND meal_block = 'Breakfast' LIMIT 1)
INSERT INTO menu_items (menu_id, item_name, sort_order) VALUES
  ((SELECT id FROM m), 'Idli',    1),
  ((SELECT id FROM m), 'Sambar',  2),
  ((SELECT id FROM m), 'Chutney', 3);

WITH m AS (SELECT id FROM menus WHERE date = CURRENT_DATE AND meal_block = 'Breakfast' LIMIT 1)
INSERT INTO menu_ingredients (menu_id, ingredient_name, quantity, unit) VALUES
  ((SELECT id FROM m), 'Idli rice',  '500',  'grams'),
  ((SELECT id FROM m), 'Urad dal',   '200',  'grams'),
  ((SELECT id FROM m), 'Toor dal',   '200',  'grams'),
  ((SELECT id FROM m), 'Tomatoes',   '4',    'pieces'),
  ((SELECT id FROM m), 'Onions',     '3',    'pieces'),
  ((SELECT id FROM m), 'Coconut',    '1',    'piece');
