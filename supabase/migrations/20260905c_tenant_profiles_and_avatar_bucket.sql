-- SettingsTab.tsx has referenced a tenant_profiles table and a
-- profile-pictures storage bucket since it was written — neither has ever
-- existed. Every avatar upload, personal-details save, and emergency-contact
-- save has silently no-op'd (Supabase client calls don't throw on a missing
-- table/bucket; the code just checks `if (!error)` and moves on quietly).

CREATE TABLE tenant_profiles (
  tenant_id         UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  date_of_birth     DATE,
  permanent_address TEXT,
  emergency_name    TEXT,
  emergency_phone   TEXT,
  emergency_rel     TEXT,
  avatar_url        TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenant_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_all_own_profile" ON tenant_profiles
  FOR ALL TO authenticated
  USING (tenant_id = auth.uid()) WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "admins_all_tenant_profiles" ON tenant_profiles
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

-- Public bucket (same sensitivity class as "bills") — avatar_url is read via
-- getPublicUrl() throughout the existing, otherwise-correct upload code.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('profile-pictures', 'profile-pictures', true, 5242880)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_read_profile_pictures" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'profile-pictures');

CREATE POLICY "tenants_upload_own_profile_picture" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-pictures' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "tenants_update_own_profile_picture" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-pictures' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'profile-pictures' AND (storage.foldername(name))[1] = auth.uid()::text);
