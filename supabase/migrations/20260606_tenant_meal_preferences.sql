-- Tenant Meal Preferences + Daily Skips
-- Enables per-block subscription tracking and same-day opt-outs.
-- Alexa count = subscribed_active_tenants - same_day_skips per block.

-- ── Core Tables ───────────────────────────────────────────────────────────────

-- Which meal blocks each tenant subscribes to (defaults: all three ON)
CREATE TABLE IF NOT EXISTS tenant_meal_preferences (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        NOT NULL UNIQUE,   -- == auth.uid() / tenants.id
  meal_breakfast BOOLEAN     NOT NULL DEFAULT true,
  meal_lunch     BOOLEAN     NOT NULL DEFAULT true,
  meal_dinner    BOOLEAN     NOT NULL DEFAULT true,
  property_id    UUID        REFERENCES properties(id) ON DELETE SET NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-day per-block opt-outs (tenant says "skip my lunch today")
CREATE TABLE IF NOT EXISTS meal_skip_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL,             -- == auth.uid()
  skip_date   DATE        NOT NULL,
  meal_block  TEXT        NOT NULL CHECK (meal_block IN ('Breakfast', 'Lunch', 'Dinner')),
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, skip_date, meal_block)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tmp_tenant_id
  ON tenant_meal_preferences(tenant_id);

CREATE INDEX IF NOT EXISTS idx_msr_date_block
  ON meal_skip_requests(skip_date, meal_block);

CREATE INDEX IF NOT EXISTS idx_msr_tenant_date
  ON meal_skip_requests(tenant_id, skip_date);

-- ── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE tenant_meal_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_skip_requests      ENABLE ROW LEVEL SECURITY;

-- Tenant manages their own subscription row
CREATE POLICY "tenant_own_meal_prefs" ON tenant_meal_preferences FOR ALL
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- Admins have full access to all preferences
CREATE POLICY "admins_all_meal_prefs" ON tenant_meal_preferences FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE email = (auth.jwt() ->> 'email')::TEXT));

-- Tenant manages their own skip requests
CREATE POLICY "tenant_own_skips" ON meal_skip_requests FOR ALL
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- Admins have full access to all skip requests
CREATE POLICY "admins_all_skips" ON meal_skip_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE email = (auth.jwt() ->> 'email')::TEXT));
