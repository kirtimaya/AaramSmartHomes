-- ============================================================
-- Dish catalog: curated once, powers the WhatsApp cook engine's
-- dish images + Hindi TTS names + alternative-menu suggestions.
-- Chosen over adding image_url directly to menu_items because
-- dishes repeat daily across many menu rows while menu rows are
-- ephemeral per (date, meal_block) — see MenuItem.dishId, which
-- is nullable so the existing menu builder keeps working
-- unmodified for dishes not yet in the catalog.
-- ============================================================

CREATE TABLE IF NOT EXISTS dish_catalog (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  name_hi           TEXT,
  image_url         TEXT,
  is_fallback       BOOLEAN     NOT NULL DEFAULT FALSE,
  fallback_priority SMALLINT    NOT NULL DEFAULT 0,
  active            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dish_catalog_name ON dish_catalog(lower(name));
CREATE INDEX IF NOT EXISTS idx_dish_catalog_fallback ON dish_catalog(fallback_priority) WHERE is_fallback AND active;

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS dish_id UUID REFERENCES dish_catalog(id) ON DELETE SET NULL;

ALTER TABLE dish_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_read_dish_catalog" ON dish_catalog
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admins_write_dish_catalog" ON dish_catalog
  FOR ALL TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());

-- Verify
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'dish_catalog';
