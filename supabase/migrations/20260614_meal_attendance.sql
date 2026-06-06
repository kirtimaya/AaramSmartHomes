-- Admin-recorded meal attendance per tenant per day.
-- Admin marks which tenants actually showed up for each meal;
-- surfaced in the tenant card for quick reference.

CREATE TABLE IF NOT EXISTS meal_attendance (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL,
  attendance_date DATE        NOT NULL,
  meal_block      TEXT        NOT NULL CHECK (meal_block IN ('Breakfast', 'Lunch', 'Dinner')),
  marked_by       TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, attendance_date, meal_block)
);

ALTER TABLE meal_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_meal_attendance_all" ON meal_attendance
  FOR ALL TO authenticated
  USING  (auth_is_admin())
  WITH CHECK (auth_is_admin());

-- Tenants can see their own attendance history
CREATE POLICY "tenant_read_own_attendance" ON meal_attendance
  FOR SELECT TO authenticated
  USING (tenant_id = auth.uid());
