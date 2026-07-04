-- ============================================================
-- Role & RLS fixes:
--  1. auth_is_admin() no longer hardcodes an email in the function
--     body (M3) — root access instead comes from a normal `admins`
--     row (seeded idempotently below) or the optional
--     app.root_email GUC, both of which are revocable without a
--     code/migration deploy.
--  2. The kitchen/pantry/food-suggestion/alexa-log admin policies
--     predate auth_is_admin() (20260604/605) and use an ad-hoc
--     `EXISTS (... admins WHERE email = jwt email)` check with no
--     root-email fallback. Since 20260610_admin_cleanup.sql emptied
--     the admins table, these policies currently block ALL browser
--     writes to menus/menu_items/menu_ingredients/grocery_alerts/
--     food_suggestions/alexa_logs/pantry_items, including for root.
--     Fixed to use auth_is_admin() like every other admin policy.
--  3. /food-hub is a public page (no auth) but menus/menu_items/
--     pantry_items are currently readable only by `authenticated`
--     (20260614_menu_tenant_read.sql, 20260615_pantry_and_menu_
--     notifications.sql) — anon visitors see an empty page. Adds
--     anon+authenticated read policies for those three tables.
-- ============================================================

-- ── 1. auth_is_admin(): drop hardcoded email, seed admins row instead ─────────

CREATE OR REPLACE FUNCTION auth_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(auth.email(), '') <> ''
     AND (
           lower(COALESCE(auth.email(), '')) = lower(COALESCE(current_setting('app.root_email', true), ''))
        OR EXISTS (
             SELECT 1 FROM public.admins
             WHERE lower(email) = lower(COALESCE(auth.email(), ''))
           )
         )
$$;

GRANT EXECUTE ON FUNCTION auth_is_admin() TO authenticated, anon;

-- Seed the root admin as a normal admins row so removing the hardcoded
-- literal above does not lock out the only admin account. Assumes the
-- `admins` table follows this repo's convention of `id UUID PRIMARY KEY
-- DEFAULT gen_random_uuid()` (the table itself predates the migrations
-- folder and isn't created here) — verify this insert succeeded before
-- relying on it, and prefer `app.root_email` / additional admins rows
-- for any future root changes instead of editing this migration.
INSERT INTO admins (email)
SELECT 'kirtimayaswain@gmail.com'
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE lower(email) = lower('kirtimayaswain@gmail.com'));

-- ── 2. Kitchen/pantry/food domain: replace ad-hoc admin checks ────────────────

DROP POLICY IF EXISTS "admins_all_menus"            ON menus;
DROP POLICY IF EXISTS "admins_all_menu_items"       ON menu_items;
DROP POLICY IF EXISTS "admins_all_menu_ingredients" ON menu_ingredients;
DROP POLICY IF EXISTS "admins_all_grocery_alerts"   ON grocery_alerts;
DROP POLICY IF EXISTS "admins_all_suggestions"      ON food_suggestions;
DROP POLICY IF EXISTS "admins_all_alexa_logs"       ON alexa_logs;
DROP POLICY IF EXISTS "admins_all_pantry_items"     ON pantry_items;

CREATE POLICY "admins_all_menus" ON menus
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

CREATE POLICY "admins_all_menu_items" ON menu_items
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

CREATE POLICY "admins_all_menu_ingredients" ON menu_ingredients
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

CREATE POLICY "admins_all_grocery_alerts" ON grocery_alerts
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

CREATE POLICY "admins_all_suggestions" ON food_suggestions
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

CREATE POLICY "admins_all_alexa_logs" ON alexa_logs
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

CREATE POLICY "admins_all_pantry_items" ON pantry_items
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

-- ── 3. Public read access for the public /food-hub page ───────────────────────

DROP POLICY IF EXISTS "tenants_read_menus"       ON menus;
DROP POLICY IF EXISTS "tenants_read_menu_items"  ON menu_items;
DROP POLICY IF EXISTS "tenants_read_pantry_items" ON pantry_items;

CREATE POLICY "anyone_read_menus" ON menus
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "anyone_read_menu_items" ON menu_items
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "anyone_read_pantry_items" ON pantry_items
  FOR SELECT TO anon, authenticated USING (true);

-- Verify
SELECT tablename, policyname, roles, cmd FROM pg_policies
WHERE tablename IN (
  'menus','menu_items','menu_ingredients','grocery_alerts',
  'food_suggestions','alexa_logs','pantry_items'
)
ORDER BY tablename, policyname;
