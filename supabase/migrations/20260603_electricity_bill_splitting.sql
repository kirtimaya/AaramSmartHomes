-- Electricity Bill Splitting Feature
-- Run this in your Supabase SQL editor

-- 1. Extend units table with electricity config columns
ALTER TABLE units
  ADD COLUMN IF NOT EXISTS has_ac         BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ac_units_used  NUMERIC   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_occupied    BOOLEAN   NOT NULL DEFAULT true;

-- Sync is_occupied from existing status column
UPDATE units SET is_occupied = CASE WHEN status IN ('Occupied', 'Notice Period') THEN true ELSE false END;

-- 2. Master electricity bill per property per month
CREATE TABLE IF NOT EXISTS electricity_bills (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id      UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  bill_month       TEXT NOT NULL,           -- e.g. "2026-05"
  total_units      NUMERIC NOT NULL,
  total_amount     NUMERIC NOT NULL,
  ac_rate_per_unit NUMERIC NOT NULL DEFAULT 10,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, bill_month)
);

-- 3. Per-room sub-bills
CREATE TABLE IF NOT EXISTS room_electricity_bills (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id              UUID NOT NULL REFERENCES electricity_bills(id) ON DELETE CASCADE,
  unit_id              UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  room_number          TEXT NOT NULL,
  ac_units             NUMERIC NOT NULL DEFAULT 0,
  ac_amount            NUMERIC NOT NULL DEFAULT 0,
  common_share_units   NUMERIC NOT NULL DEFAULT 0,
  common_share_amount  NUMERIC NOT NULL DEFAULT 0,
  total_amount         NUMERIC NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid')),
  UNIQUE (bill_id, unit_id)
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_electricity_bills_property ON electricity_bills(property_id);
CREATE INDEX IF NOT EXISTS idx_room_elec_bills_bill ON room_electricity_bills(bill_id);
CREATE INDEX IF NOT EXISTS idx_room_elec_bills_unit ON room_electricity_bills(unit_id);

-- 5. RLS (adjust to match your existing policies)
ALTER TABLE electricity_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_electricity_bills ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated read electricity_bills"
  ON electricity_bills FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read room_electricity_bills"
  ON room_electricity_bills FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update/delete (admin only in practice via app logic)
CREATE POLICY "Authenticated write electricity_bills"
  ON electricity_bills FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated write room_electricity_bills"
  ON room_electricity_bills FOR ALL TO authenticated USING (true) WITH CHECK (true);
