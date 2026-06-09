-- ── Pantry Inventory Table ────────────────────────────────────────────────────
-- Adds pantry_items for stock tracking (used by Alexa admin flow & Food Hub)
-- notifications.type has no enum constraint — 'menu_change' works without alteration

CREATE TABLE IF NOT EXISTS pantry_items (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  category            TEXT        NOT NULL DEFAULT 'General',
  quantity            TEXT,
  unit                TEXT,
  status              TEXT        NOT NULL DEFAULT 'In Stock'
                      CHECK (status IN ('In Stock', 'Low', 'Out of Stock')),
  min_threshold       TEXT,
  min_threshold_unit  TEXT,
  last_updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pantry_items_status
  ON pantry_items(status);

ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;

-- Admins have full access
CREATE POLICY "admins_all_pantry_items" ON pantry_items FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE email = (auth.jwt()->>'email')::TEXT));

-- Active tenants can read pantry items (Food Hub display)
CREATE POLICY "tenants_read_pantry_items" ON pantry_items FOR SELECT
  USING (
    auth.email() IN (
      SELECT email FROM tenants WHERE status = 'active'
    )
  );

-- ── Seed pantry with initial stock ───────────────────────────────────────────

INSERT INTO pantry_items (name, category, quantity, unit, status, min_threshold, min_threshold_unit) VALUES
  ('Basmati Rice',   'Grains',      '25',  'kg',     'In Stock',     '5',  'kg'),
  ('Sunflower Oil',  'Essentials',  '2',   'liters', 'Low',          '2',  'liters'),
  ('Red Lentils',    'Pulses',      '5',   'kg',     'In Stock',     '1',  'kg'),
  ('Sugar',          'Essentials',  '0.5', 'kg',     'Out of Stock', '1',  'kg'),
  ('Tea Leaves',     'Beverages',   '1',   'kg',     'In Stock',     '0.5','kg'),
  ('Tomatoes',       'Vegetables',  '2',   'kg',     'Low',          '1',  'kg'),
  ('Onions',         'Vegetables',  '5',   'kg',     'In Stock',     '2',  'kg'),
  ('Toor Dal',       'Pulses',      '3',   'kg',     'In Stock',     '1',  'kg'),
  ('Rajma',          'Pulses',      '1',   'kg',     'In Stock',     '0.5','kg'),
  ('Milk',           'Dairy',       '4',   'liters', 'Low',          '4',  'liters')
ON CONFLICT DO NOTHING;
