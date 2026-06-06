-- ============================================================
-- RLS policies: grant admin (root user + admins table) full
-- access on tables that previously blocked inserts/updates.
-- Also fixes room assignment from the tenant management page.
-- ============================================================

-- Helper: returns true when the calling auth user is an admin.
-- SECURITY DEFINER avoids recursive RLS on the admins table itself.
CREATE OR REPLACE FUNCTION auth_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(auth.email(), '') = current_setting('app.root_email', true)
      OR COALESCE(auth.email(), '') = 'kirtimayaswain@gmail.com'
      OR EXISTS (
           SELECT 1 FROM public.admins
           WHERE email = COALESCE(auth.email(), '')
         )
$$;

GRANT EXECUTE ON FUNCTION auth_is_admin() TO authenticated, anon;

-- ── tenant_invitations ────────────────────────────────────────
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_all_tenant_invitations"    ON tenant_invitations;
DROP POLICY IF EXISTS "tenants_read_own_invitation"       ON tenant_invitations;
DROP POLICY IF EXISTS "anon_read_by_token"                ON tenant_invitations;

-- Admins: full access
CREATE POLICY "admins_all_tenant_invitations" ON tenant_invitations
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

-- Anyone (including anon) can read a specific invitation by token (for /join page)
CREATE POLICY "anon_read_by_token" ON tenant_invitations
  FOR SELECT TO anon, authenticated
  USING (true);

-- ── electricity_bills ─────────────────────────────────────────
ALTER TABLE electricity_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_all_electricity_bills"     ON electricity_bills;
DROP POLICY IF EXISTS "tenants_read_property_bills"       ON electricity_bills;

CREATE POLICY "admins_all_electricity_bills" ON electricity_bills
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

-- Tenants: read bills for their property
CREATE POLICY "tenants_read_property_bills" ON electricity_bills
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenants t
      JOIN rooms r ON t.room_id = r.id
      WHERE t.id = auth.uid()
        AND r.property_id = electricity_bills.property_id
    )
  );

-- ── rooms ─────────────────────────────────────────────────────
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_all_rooms"  ON rooms;
DROP POLICY IF EXISTS "anyone_read_rooms" ON rooms;

CREATE POLICY "admins_all_rooms" ON rooms
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

CREATE POLICY "anyone_read_rooms" ON rooms
  FOR SELECT TO anon, authenticated
  USING (true);

-- ── tenants ───────────────────────────────────────────────────
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_all_tenants"       ON tenants;
DROP POLICY IF EXISTS "tenant_read_own_profile"  ON tenants;
DROP POLICY IF EXISTS "tenant_update_own_profile" ON tenants;

CREATE POLICY "admins_all_tenants" ON tenants
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

CREATE POLICY "tenant_read_own_profile" ON tenants
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "tenant_update_own_profile" ON tenants
  FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ── tenant_ac_submissions ─────────────────────────────────────
ALTER TABLE tenant_ac_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_all_ac_submissions"  ON tenant_ac_submissions;
DROP POLICY IF EXISTS "tenant_own_ac_submissions"   ON tenant_ac_submissions;

CREATE POLICY "admins_all_ac_submissions" ON tenant_ac_submissions
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

CREATE POLICY "tenant_own_ac_submissions" ON tenant_ac_submissions
  FOR ALL TO authenticated
  USING (tenant_id = auth.uid()) WITH CHECK (tenant_id = auth.uid());

-- ── bill_splits ───────────────────────────────────────────────
ALTER TABLE bill_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_all_bill_splits"    ON bill_splits;
DROP POLICY IF EXISTS "tenant_read_own_split"      ON bill_splits;

CREATE POLICY "admins_all_bill_splits" ON bill_splits
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

CREATE POLICY "tenant_read_own_split" ON bill_splits
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = auth.uid() AND t.room_id = bill_splits.room_id
    )
  );

-- Verify
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('tenant_invitations','electricity_bills','rooms','tenants','tenant_ac_submissions','bill_splits')
ORDER BY tablename;
