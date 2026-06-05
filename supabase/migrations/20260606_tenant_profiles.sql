-- Tenant Extended Profile
-- Stores personal details, emergency contacts, and document references for the Tenant Portal.
-- Profile picture and identity docs are stored in Supabase Storage;
-- only the public/signed URLs are persisted here.

-- ── Storage Buckets (create via Supabase dashboard or CLI) ────────────────────
--
--   Bucket: 'profile-pictures'   (public)   → path: {tenant_id}/avatar.jpg
--   Bucket: 'tenant-documents'   (private)  → path: {tenant_id}/identity/{filename}
--                                           → path: {tenant_id}/rental-agreement.pdf
--                                           → path: {tenant_id}/receipts/{YYYY-MM}.pdf

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenant_profiles (
  tenant_id          UUID        PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  date_of_birth      DATE,
  permanent_address  TEXT,
  emergency_name     TEXT,
  emergency_phone    TEXT,
  emergency_rel      TEXT,                           -- e.g., 'Parent', 'Sibling'
  avatar_url         TEXT,                           -- Supabase Storage public URL
  id_doc_url         TEXT,                           -- Supabase Storage signed/public URL
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Index ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tenant_profiles_tenant_id ON tenant_profiles(tenant_id);

-- ── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE tenant_profiles ENABLE ROW LEVEL SECURITY;

-- Tenant can read and update their own profile row
CREATE POLICY "tenant_own_profile" ON tenant_profiles FOR ALL
  USING    (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- Admins have full access
CREATE POLICY "admins_all_profiles" ON tenant_profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE email = (auth.jwt() ->> 'email')::TEXT));

-- ── Kitchen Hub: daily prep query ────────────────────────────────────────────
--
-- The Kitchen Hub uses the query below each morning at 6 AM to determine
-- exact portions per meal block for the day.
--
-- SELECT
--   msr_block.meal_block,
--   COUNT(DISTINCT tmp.tenant_id) FILTER (
--     WHERE tmp.meal_breakfast = true AND msr_block.meal_block = 'Breakfast'
--        OR tmp.meal_lunch    = true AND msr_block.meal_block = 'Lunch'
--        OR tmp.meal_dinner   = true AND msr_block.meal_block = 'Dinner'
--   ) AS subscribed_count,
--   COUNT(DISTINCT msr.tenant_id) AS skip_count,
--   COUNT(DISTINCT tmp.tenant_id) FILTER (...)  - COUNT(DISTINCT msr.tenant_id) AS eating_count
-- FROM (VALUES ('Breakfast'), ('Lunch'), ('Dinner')) AS msr_block(meal_block)
-- LEFT JOIN tenant_meal_preferences tmp ON TRUE
-- LEFT JOIN meal_skip_requests msr
--   ON msr.tenant_id  = tmp.tenant_id
--  AND msr.skip_date  = CURRENT_DATE
--  AND msr.meal_block = msr_block.meal_block
-- GROUP BY msr_block.meal_block;
