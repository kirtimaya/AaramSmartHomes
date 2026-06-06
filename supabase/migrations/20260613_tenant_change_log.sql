-- Audit log for admin changes to tenant profiles
CREATE TABLE IF NOT EXISTS tenant_change_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL,
  changed_by_email TEXT       NOT NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changes         JSONB       NOT NULL  -- { field: { from: x, to: y } }
);

ALTER TABLE tenant_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_all_change_log" ON tenant_change_log;
CREATE POLICY "admins_all_change_log" ON tenant_change_log
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

-- Add meter photo URL to AC submissions for photo evidence
ALTER TABLE tenant_ac_submissions ADD COLUMN IF NOT EXISTS meter_photo_url TEXT;

-- Add main_bill_photo_url for tenant-uploaded bill images (stored on the electricity_bills row itself)
-- electricity_bills already has bill_image_url — no schema change needed
