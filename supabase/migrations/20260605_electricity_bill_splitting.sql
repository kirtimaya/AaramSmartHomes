-- ============================================================
-- Electricity Bill Splitting Feature — idempotent migration
-- Replaces the old room_electricity_bills / units-based schema.
-- Run this in the Supabase SQL editor.
-- ============================================================

-- ── 1. Properties — add electricity config ────────────────────────────────────
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS usc_no           TEXT,
  ADD COLUMN IF NOT EXISTS ac_rate_per_unit NUMERIC(10,2) DEFAULT 9.00;

-- ── 2. Rooms — add AC flag ────────────────────────────────────────────────────
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS has_ac BOOLEAN DEFAULT FALSE;

-- ── 3. Drop old per-unit bill table (replaced by bill_splits below) ───────────
--    This resolves the "column 'unit_id' does not exist" error caused by the
--    previous 20260603 migration trying to index a column on this table that
--    may have been created with a different column name.
DROP TABLE IF EXISTS room_electricity_bills CASCADE;

-- ── 4. electricity_bills — create if not exists, then add new columns ─────────
--
-- Creates the full table when it does not exist.
-- If the table already exists (e.g. created via 20260603 migration), the CREATE
-- is a no-op and the ADD COLUMN IF NOT EXISTS calls fill in the gaps.
--
CREATE TABLE IF NOT EXISTS electricity_bills (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id      UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  bill_month       DATE NOT NULL,         -- stored as YYYY-MM-01
  usc_no           TEXT,
  present_reading  INTEGER,
  previous_reading INTEGER,
  present_date     DATE,
  previous_date    DATE,
  total_units      INTEGER NOT NULL DEFAULT 0,
  total_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  ac_rate_per_unit NUMERIC(10,2) DEFAULT 9.00,
  bill_image_url   TEXT,
  image_url        TEXT,                  -- legacy compat
  uploaded_by      UUID,
  uploaded_by_name TEXT,
  upload_source    TEXT DEFAULT 'admin',  -- 'tenant' | 'admin'
  status           TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add new columns to an already-existing electricity_bills table
-- (all idempotent — skipped if column is already present)
ALTER TABLE electricity_bills ADD COLUMN IF NOT EXISTS usc_no            TEXT;
ALTER TABLE electricity_bills ADD COLUMN IF NOT EXISTS present_reading   INTEGER;
ALTER TABLE electricity_bills ADD COLUMN IF NOT EXISTS previous_reading  INTEGER;
ALTER TABLE electricity_bills ADD COLUMN IF NOT EXISTS present_date      DATE;
ALTER TABLE electricity_bills ADD COLUMN IF NOT EXISTS previous_date     DATE;
ALTER TABLE electricity_bills ADD COLUMN IF NOT EXISTS bill_image_url    TEXT;
ALTER TABLE electricity_bills ADD COLUMN IF NOT EXISTS image_url         TEXT;
ALTER TABLE electricity_bills ADD COLUMN IF NOT EXISTS uploaded_by       UUID;
ALTER TABLE electricity_bills ADD COLUMN IF NOT EXISTS uploaded_by_name  TEXT;
ALTER TABLE electricity_bills ADD COLUMN IF NOT EXISTS upload_source     TEXT DEFAULT 'admin';
ALTER TABLE electricity_bills ADD COLUMN IF NOT EXISTS rejection_reason  TEXT;
ALTER TABLE electricity_bills ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT NOW();

-- ── 5. tenant_ac_submissions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_ac_submissions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id              UUID NOT NULL REFERENCES electricity_bills(id) ON DELETE CASCADE,
  tenant_id            UUID NOT NULL,
  room_id              UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  ac_units_submitted   INTEGER NOT NULL DEFAULT 0,
  submitted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_admin_override    BOOLEAN NOT NULL DEFAULT FALSE,
  admin_override_value INTEGER,
  UNIQUE (bill_id, room_id)
);

-- ── 6. bill_splits ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bill_splits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id        UUID NOT NULL REFERENCES electricity_bills(id) ON DELETE CASCADE,
  tenant_id      UUID NOT NULL,
  room_id        UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  tenant_name    TEXT,
  ac_units       INTEGER NOT NULL DEFAULT 0,
  ac_charge      NUMERIC(10,2) NOT NULL DEFAULT 0,
  common_share   NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_payable  NUMERIC(10,2) NOT NULL DEFAULT 0,
  locked_at      TIMESTAMPTZ,
  UNIQUE (bill_id, room_id)
);
