-- Decouple food domain from property domain.
-- Menus and grocery alerts are house-wide concerns; tenants are the only bridge.

-- ── menus ────────────────────────────────────────────────────────────────────

-- Drop the composite unique constraint that includes property_id
ALTER TABLE menus DROP CONSTRAINT IF EXISTS menus_date_meal_block_property_id_key;

-- Drop the FK to properties
ALTER TABLE menus DROP CONSTRAINT IF EXISTS menus_property_id_fkey;

-- Drop the column
ALTER TABLE menus DROP COLUMN IF EXISTS property_id;

-- New unique constraint: one menu row per meal per day (house-wide)
ALTER TABLE menus ADD CONSTRAINT menus_date_meal_block_key UNIQUE (date, meal_block);

-- ── grocery_alerts ───────────────────────────────────────────────────────────

-- Drop FK to properties (constraint name may vary; handle both)
ALTER TABLE grocery_alerts DROP CONSTRAINT IF EXISTS grocery_alerts_property_id_fkey;

-- Drop the column
ALTER TABLE grocery_alerts DROP COLUMN IF EXISTS property_id;
