-- ============================================================
-- 1. RLS policies for tables that had RLS enabled but zero
--    policies (rls_auto_enable locks new tables by default;
--    these four were never given policies, so they were fully
--    inaccessible to everyone, including admins).
-- ============================================================

-- food_suggestions: tenant submits their own, reads their own; admin all.
CREATE POLICY "tenants_insert_own_food_suggestions" ON food_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "tenants_read_own_food_suggestions" ON food_suggestions
  FOR SELECT TO authenticated
  USING (tenant_id = auth.uid());

CREATE POLICY "admins_all_food_suggestions" ON food_suggestions
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

-- meal_suggestions: same shape as food_suggestions.
CREATE POLICY "tenants_insert_own_meal_suggestions" ON meal_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "tenants_read_own_meal_suggestions" ON meal_suggestions
  FOR SELECT TO authenticated
  USING (tenant_id = auth.uid());

CREATE POLICY "admins_all_meal_suggestions" ON meal_suggestions
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

-- referrals: referrer manages their own; admin all.
CREATE POLICY "tenants_all_own_referrals" ON referrals
  FOR ALL TO authenticated
  USING (referrer_id = auth.uid()) WITH CHECK (referrer_id = auth.uid());

CREATE POLICY "admins_all_referrals" ON referrals
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

-- water_logs: no tenant_id column (property-level reading, not tenant-
-- scoped) — tenants read logs for their own property, admin all.
CREATE POLICY "tenants_read_property_water_logs" ON water_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenants t
      JOIN rooms r ON t.room_id = r.id
      WHERE t.id = auth.uid() AND r.property_id = water_logs.property_id
    )
  );

CREATE POLICY "admins_all_water_logs" ON water_logs
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

-- ============================================================
-- 2. Pin search_path on SECURITY DEFINER / trigger functions
--    flagged by the security advisor (function_search_path_mutable).
--    Bodies reproduced exactly from pg_get_functiondef — only the
--    SET clause is new. generate_referral_code needs `extensions`
--    in the path for uuid_generate_v4 (verified: that function lives
--    in the extensions schema, not public).
-- ============================================================

CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT COALESCE(auth.email(), '') = current_setting('app.root_email', true)
      OR COALESCE(auth.email(), '') = 'kirtimayaswain@gmail.com'
      OR EXISTS (
           SELECT 1 FROM public.admins
           WHERE email = COALESCE(auth.email(), '')
         )
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$ BEGIN INSERT INTO public.profiles (id, email, full_name, avatar_url) VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url') ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, avatar_url = EXCLUDED.avatar_url, last_login = now(); RETURN new; END; $function$;

CREATE OR REPLACE FUNCTION public.enforce_meal_skip_cutoff()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  rec    RECORD := COALESCE(NEW, OLD);
  cutoff TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL OR auth_is_admin() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT ((rec.skip_date::timestamp + mw.window_start) AT TIME ZONE 'Asia/Kolkata') - INTERVAL '8 hours'
    INTO cutoff
  FROM meal_windows mw
  WHERE mw.meal_block = rec.meal_block;

  IF cutoff IS NOT NULL AND now() >= cutoff THEN
    RAISE EXCEPTION 'MEAL_SKIP_CUTOFF_PASSED: changes for % on % are locked 8 hours before the meal window', rec.meal_block, rec.skip_date
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions, pg_temp
AS $function$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(REPLACE(uuid_generate_v4()::TEXT, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================================================
-- 3. Create the "bills" storage bucket — referenced by both
--    /api/bills/upload and /api/tenant/bills/upload (server-side,
--    via service role) and by SupportTab.tsx (client-side direct
--    upload, anon/authenticated client) — but the bucket never
--    existed, so every bill upload has been failing outright.
--
--    Public for now, matching what the existing code already
--    assumes (getPublicUrl). Known follow-up: switch to a private
--    bucket + signed URLs, since bill images carry the resident's
--    name, address and meter number — tracked separately, not done
--    here, since it also requires updating the upload/view code
--    paths to stop relying on getPublicUrl.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('bills', 'bills', true, 10485760)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_read_bills" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'bills');

CREATE POLICY "authenticated_upload_bills" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bills');
