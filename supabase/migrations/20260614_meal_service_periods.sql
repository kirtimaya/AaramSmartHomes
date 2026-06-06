-- Meal service periods: admin records when each tenant used the meal service
CREATE TABLE IF NOT EXISTS meal_service_periods (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  start_date  DATE    NOT NULL,
  end_date    DATE    NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT meal_service_periods_dates_check CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS meal_service_periods_tenant_idx ON meal_service_periods(tenant_id);

ALTER TABLE meal_service_periods ENABLE ROW LEVEL SECURITY;

-- Admin has full access
CREATE POLICY "meal_service_periods_admin"
  ON meal_service_periods FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = auth.uid()
        AND t.role IN ('admin', 'root')
        AND t.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = auth.uid()
        AND t.role IN ('admin', 'root')
        AND t.status = 'active'
    )
  );
