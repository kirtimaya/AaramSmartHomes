-- AC meter readings per tenant/room, month-over-month.
-- Stores the actual cumulative dial reading so admin can compute
-- units used = current_reading - previous_reading.

CREATE TABLE IF NOT EXISTS ac_meter_readings (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id        UUID          NOT NULL REFERENCES rooms(id),
  reading_month  DATE          NOT NULL,   -- first day of billing month (YYYY-MM-01)
  meter_reading  NUMERIC(10,2) NOT NULL,   -- cumulative dial reading
  photo_url      TEXT,
  submitted_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, reading_month)
);

ALTER TABLE ac_meter_readings ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admin_ac_readings_all" ON ac_meter_readings
  FOR ALL TO authenticated
  USING  (auth_is_admin())
  WITH CHECK (auth_is_admin());

-- Tenants: read/write own readings.
-- Supports both id-match and email-match for placeholder-UUID tenants.
CREATE POLICY "tenant_ac_readings_own" ON ac_meter_readings
  FOR ALL TO authenticated
  USING (
    tenant_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tenants
      WHERE id = tenant_id
        AND email = auth.email()
        AND status IN ('active', 'notice')
    )
  )
  WITH CHECK (
    tenant_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tenants
      WHERE id = tenant_id
        AND email = auth.email()
        AND status IN ('active', 'notice')
    )
  );
