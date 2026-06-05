-- ============================================================
-- Villa Financial Ledger Import
-- Source: Villa 36 Fin Details - Monthly Ledger.csv
-- Covers: Villa 36, Villa 32, Villa 38
-- Period:  Dec 2025 – Jul 2026
-- Mode:    Overwrite — deletes existing records before inserting
--
-- Room assignments (101-105 per villa):
--   Villa 32: 101=Karan,     102=Karun,    103=Piyush,   104=Aditya,   105=Swayam
--   Villa 36: 101=Subhasish, 102=Durga*,   103=Kirti,    104=Abinand,  105=Nirmish†
--   Villa 38: 101=Vivek,     102=Yasaswini,103=Femina,   104=Shivanshu,105=Vacant
--   * Durga vacated June 2026   † Nirmish vacated May 2026
-- ============================================================

-- ── Schema additions (idempotent) ─────────────────────────────────────────────

-- Unique index so we can upsert rooms by (property_id, name)
-- (CREATE INDEX supports IF NOT EXISTS; ALTER TABLE ADD CONSTRAINT does not)
CREATE UNIQUE INDEX IF NOT EXISTS uq_rooms_property_name ON rooms (property_id, name);

-- Temporary name column: holds occupant name until a proper tenant profile is linked
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS tenant_name TEXT;

-- ── Main import block ─────────────────────────────────────────────────────────

DO $$
DECLARE
  -- Property IDs
  v36_id UUID;
  v32_id UUID;
  v38_id UUID;

  -- Villa 32 room IDs (by number)
  r32_101 UUID;  -- Karan
  r32_102 UUID;  -- Karun
  r32_103 UUID;  -- Piyush
  r32_104 UUID;  -- Aditya
  r32_105 UUID;  -- Swayam

  -- Villa 36 room IDs (by number)
  r36_101 UUID;  -- Subhasish
  r36_102 UUID;  -- Durga (vacated Jun 2026)
  r36_103 UUID;  -- Kirti
  r36_104 UUID;  -- Abinand
  r36_105 UUID;  -- Nirmish (vacated May 2026)

  -- Villa 38 room IDs (by number)
  r38_101 UUID;  -- Vivek
  r38_102 UUID;  -- Yasaswini
  r38_103 UUID;  -- Femina
  r38_104 UUID;  -- Shivanshu
  -- r38_105 vacant — no income records

BEGIN

  -- ── 1. Resolve property IDs ───────────────────────────────────────────────
  SELECT id INTO v36_id FROM properties WHERE name ILIKE '%36%' LIMIT 1;
  SELECT id INTO v32_id FROM properties WHERE name ILIKE '%32%' LIMIT 1;
  SELECT id INTO v38_id FROM properties WHERE name ILIKE '%38%' LIMIT 1;

  IF v36_id IS NULL THEN RAISE EXCEPTION 'Property "Villa 36" not found — check properties table'; END IF;
  IF v32_id IS NULL THEN RAISE EXCEPTION 'Property "Villa 32" not found — check properties table'; END IF;
  IF v38_id IS NULL THEN RAISE EXCEPTION 'Property "Villa 38" not found — check properties table'; END IF;

  RAISE NOTICE 'Properties: v36=%, v32=%, v38=%', v36_id, v32_id, v38_id;

  -- ── 2. Seed rooms 101-105 for each villa (upsert — safe to re-run) ────────

  -- Villa 32
  INSERT INTO rooms (property_id, name, type, sqft, features, image_urls, occupancy_status, tenant_name)
  VALUES
    (v32_id, 'Room 101', 'Suite', 0, '{}', '{}', 'Occupied', 'Karan'),
    (v32_id, 'Room 102', 'Suite', 0, '{}', '{}', 'Occupied', 'Karun'),
    (v32_id, 'Room 103', 'Suite', 0, '{}', '{}', 'Occupied', 'Piyush'),
    (v32_id, 'Room 104', 'Suite', 0, '{}', '{}', 'Occupied', 'Aditya'),
    (v32_id, 'Room 105', 'Suite', 0, '{}', '{}', 'Occupied', 'Swayam')
  ON CONFLICT (property_id, name) DO UPDATE SET
    occupancy_status = EXCLUDED.occupancy_status,
    tenant_name      = EXCLUDED.tenant_name;

  -- Villa 36
  INSERT INTO rooms (property_id, name, type, sqft, features, image_urls, occupancy_status, tenant_name)
  VALUES
    (v36_id, 'Room 101', 'Suite', 0, '{}', '{}', 'Occupied',       'Subhasish'),
    (v36_id, 'Room 102', 'Suite', 0, '{}', '{}', 'Vacant',         'Durga'),      -- vacated Jun 2026
    (v36_id, 'Room 103', 'Suite', 0, '{}', '{}', 'Occupied',       'Kirti'),
    (v36_id, 'Room 104', 'Suite', 0, '{}', '{}', 'Occupied',       'Abinand'),
    (v36_id, 'Room 105', 'Suite', 0, '{}', '{}', 'Vacant',         'Nirmish')     -- vacated May 2026
  ON CONFLICT (property_id, name) DO UPDATE SET
    occupancy_status = EXCLUDED.occupancy_status,
    tenant_name      = EXCLUDED.tenant_name;

  -- Villa 38
  INSERT INTO rooms (property_id, name, type, sqft, features, image_urls, occupancy_status, tenant_name)
  VALUES
    (v38_id, 'Room 101', 'Suite', 0, '{}', '{}', 'Occupied', 'Vivek'),
    (v38_id, 'Room 102', 'Suite', 0, '{}', '{}', 'Occupied', 'Yasaswini'),
    (v38_id, 'Room 103', 'Suite', 0, '{}', '{}', 'Occupied', 'Femina'),
    (v38_id, 'Room 104', 'Suite', 0, '{}', '{}', 'Occupied', 'Shivanshu'),
    (v38_id, 'Room 105', 'Suite', 0, '{}', '{}', 'Vacant',   NULL)
  ON CONFLICT (property_id, name) DO UPDATE SET
    occupancy_status = EXCLUDED.occupancy_status,
    tenant_name      = EXCLUDED.tenant_name;

  RAISE NOTICE 'Rooms seeded for Villa 32, 36, 38';

  -- ── 3. Resolve room IDs by number ─────────────────────────────────────────
  SELECT id INTO r32_101 FROM rooms WHERE property_id = v32_id AND name = 'Room 101';
  SELECT id INTO r32_102 FROM rooms WHERE property_id = v32_id AND name = 'Room 102';
  SELECT id INTO r32_103 FROM rooms WHERE property_id = v32_id AND name = 'Room 103';
  SELECT id INTO r32_104 FROM rooms WHERE property_id = v32_id AND name = 'Room 104';
  SELECT id INTO r32_105 FROM rooms WHERE property_id = v32_id AND name = 'Room 105';

  SELECT id INTO r36_101 FROM rooms WHERE property_id = v36_id AND name = 'Room 101';
  SELECT id INTO r36_102 FROM rooms WHERE property_id = v36_id AND name = 'Room 102';
  SELECT id INTO r36_103 FROM rooms WHERE property_id = v36_id AND name = 'Room 103';
  SELECT id INTO r36_104 FROM rooms WHERE property_id = v36_id AND name = 'Room 104';
  SELECT id INTO r36_105 FROM rooms WHERE property_id = v36_id AND name = 'Room 105';

  SELECT id INTO r38_101 FROM rooms WHERE property_id = v38_id AND name = 'Room 101';
  SELECT id INTO r38_102 FROM rooms WHERE property_id = v38_id AND name = 'Room 102';
  SELECT id INTO r38_103 FROM rooms WHERE property_id = v38_id AND name = 'Room 103';
  SELECT id INTO r38_104 FROM rooms WHERE property_id = v38_id AND name = 'Room 104';

  RAISE NOTICE 'Villa 32: 101=%, 102=%, 103=%, 104=%, 105=%', r32_101, r32_102, r32_103, r32_104, r32_105;
  RAISE NOTICE 'Villa 36: 101=%, 102=%, 103=%, 104=%, 105=%', r36_101, r36_102, r36_103, r36_104, r36_105;
  RAISE NOTICE 'Villa 38: 101=%, 102=%, 103=%, 104=%',        r38_101, r38_102, r38_103, r38_104;

  -- ── 4. Delete existing records for the covered period (overwrite mode) ─────
  DELETE FROM income_records
  WHERE room_id IN (
    r32_101, r32_102, r32_103, r32_104, r32_105,
    r36_101, r36_102, r36_103, r36_104, r36_105,
    r38_101, r38_102, r38_103, r38_104
  )
  AND income_date BETWEEN '2025-12-01' AND '2026-07-31';

  DELETE FROM expenses
  WHERE property_id IN (v36_id, v32_id, v38_id)
  AND expense_date BETWEEN '2025-12-01' AND '2026-07-31';

  RAISE NOTICE 'Existing records cleared for Dec 2025 – Jul 2026';

  -- ══════════════════════════════════════════════════════════════════════════
  -- VILLA 36 — INCOME RECORDS
  -- Room 101: Subhasish  Room 102: Durga  Room 103: Kirti
  -- Room 104: Abinand    Room 105: Nirmish
  -- ══════════════════════════════════════════════════════════════════════════

  -- Setup Costs (one-time, on arrival)
  INSERT INTO income_records (room_id, amount, income_type, income_date, note) VALUES
    (r36_102, 5200, 'setup_cost', '2025-12-01', 'Setup cost - Durga, Villa 36 Room 102'),
    (r36_103, 5000, 'setup_cost', '2025-12-01', 'Setup cost - Kirti, Villa 36 Room 103'),
    (r36_105, 5000, 'setup_cost', '2025-12-01', 'Setup cost - Nirmish, Villa 36 Room 105'),
    (r36_104, 5000, 'setup_cost', '2026-01-01', 'Setup cost - Abinand, Villa 36 Room 104');

  -- Deposits
  INSERT INTO income_records (room_id, amount, income_type, income_date, note) VALUES
    (r36_101, 5000,  'deposit', '2025-12-01', '1st Deposit - Subhasish, Villa 36 Room 101'),
    (r36_101, 5000,  'deposit', '2025-12-02', '2nd Deposit - Subhasish, Villa 36 Room 101'),
    (r36_102, 10900, 'deposit', '2025-12-01', '1st Deposit - Durga, Villa 36 Room 102'),
    (r36_102, 10900, 'deposit', '2025-12-02', '2nd Deposit - Durga, Villa 36 Room 102'),
    (r36_103, 12900, 'deposit', '2025-12-01', '1st Deposit - Kirti, Villa 36 Room 103'),
    (r36_103, 12900, 'deposit', '2025-12-02', '2nd Deposit - Kirti, Villa 36 Room 103'),
    (r36_105, 19500, 'deposit', '2025-12-01', '1st Deposit - Nirmish, Villa 36 Room 105'),
    (r36_105, 19500, 'deposit', '2025-12-02', '2nd Deposit - Nirmish, Villa 36 Room 105'),
    (r36_104, 16000, 'deposit', '2026-01-01', '1st Deposit - Abinand, Villa 36 Room 104'),
    (r36_104, 16000, 'deposit', '2026-01-02', '2nd Deposit - Abinand, Villa 36 Room 104');

  -- Monthly Rent — Room 101 Subhasish (Dec 2025 – Jun 2026: 9,000/mo)
  INSERT INTO income_records (room_id, amount, income_type, income_date, note) VALUES
    (r36_101, 9000, 'rent', '2025-12-01', 'Rent Dec 2025 - Subhasish, Villa 36 Room 101'),
    (r36_101, 9000, 'rent', '2026-01-01', 'Rent Jan 2026 - Subhasish, Villa 36 Room 101'),
    (r36_101, 9000, 'rent', '2026-02-01', 'Rent Feb 2026 - Subhasish, Villa 36 Room 101'),
    (r36_101, 9000, 'rent', '2026-03-01', 'Rent Mar 2026 - Subhasish, Villa 36 Room 101'),
    (r36_101, 9000, 'rent', '2026-04-01', 'Rent Apr 2026 - Subhasish, Villa 36 Room 101'),
    (r36_101, 9000, 'rent', '2026-05-01', 'Rent May 2026 - Subhasish, Villa 36 Room 101'),
    (r36_101, 9000, 'rent', '2026-06-01', 'Rent Jun 2026 - Subhasish, Villa 36 Room 101');

  -- Monthly Rent — Room 102 Durga (Dec 2025 – May 2026: 14,800/mo; vacated Jun 2026)
  INSERT INTO income_records (room_id, amount, income_type, income_date, note) VALUES
    (r36_102, 14800, 'rent', '2025-12-01', 'Rent Dec 2025 - Durga, Villa 36 Room 102'),
    (r36_102, 14800, 'rent', '2026-01-01', 'Rent Jan 2026 - Durga, Villa 36 Room 102'),
    (r36_102, 14800, 'rent', '2026-02-01', 'Rent Feb 2026 - Durga, Villa 36 Room 102'),
    (r36_102, 14800, 'rent', '2026-03-01', 'Rent Mar 2026 - Durga, Villa 36 Room 102'),
    (r36_102, 14800, 'rent', '2026-04-01', 'Rent Apr 2026 - Durga, Villa 36 Room 102'),
    (r36_102, 14800, 'rent', '2026-05-01', 'Rent May 2026 - Durga, Villa 36 Room 102');

  -- Monthly Rent — Room 103 Kirti (Dec 2025 – Jun 2026: 18,000/mo)
  INSERT INTO income_records (room_id, amount, income_type, income_date, note) VALUES
    (r36_103, 18000, 'rent', '2025-12-01', 'Rent Dec 2025 - Kirti, Villa 36 Room 103'),
    (r36_103, 18000, 'rent', '2026-01-01', 'Rent Jan 2026 - Kirti, Villa 36 Room 103'),
    (r36_103, 18000, 'rent', '2026-02-01', 'Rent Feb 2026 - Kirti, Villa 36 Room 103'),
    (r36_103, 18000, 'rent', '2026-03-01', 'Rent Mar 2026 - Kirti, Villa 36 Room 103'),
    (r36_103, 18000, 'rent', '2026-04-01', 'Rent Apr 2026 - Kirti, Villa 36 Room 103'),
    (r36_103, 18000, 'rent', '2026-05-01', 'Rent May 2026 - Kirti, Villa 36 Room 103'),
    (r36_103, 18000, 'rent', '2026-06-01', 'Rent Jun 2026 - Kirti, Villa 36 Room 103');

  -- Monthly Rent — Room 105 Nirmish (Dec 2025 – Apr 2026: 19,500/mo; May 2026: 10,000 partial; vacated May 2026)
  INSERT INTO income_records (room_id, amount, income_type, income_date, note) VALUES
    (r36_105, 19500, 'rent', '2025-12-01', 'Rent Dec 2025 - Nirmish, Villa 36 Room 105'),
    (r36_105, 19500, 'rent', '2026-01-01', 'Rent Jan 2026 - Nirmish, Villa 36 Room 105'),
    (r36_105, 19500, 'rent', '2026-02-01', 'Rent Feb 2026 - Nirmish, Villa 36 Room 105'),
    (r36_105, 19500, 'rent', '2026-03-01', 'Rent Mar 2026 - Nirmish, Villa 36 Room 105'),
    (r36_105, 19500, 'rent', '2026-04-01', 'Rent Apr 2026 - Nirmish, Villa 36 Room 105'),
    (r36_105, 10000, 'rent', '2026-05-01', 'Rent May 2026 - Nirmish, Villa 36 Room 105 (partial, final month)');

  -- Monthly Rent — Room 104 Abinand (Jan–Mar 2026: 16,000/mo; Apr–Jun 2026: 17,000/mo)
  INSERT INTO income_records (room_id, amount, income_type, income_date, note) VALUES
    (r36_104, 16000, 'rent', '2026-01-01', 'Rent Jan 2026 - Abinand, Villa 36 Room 104'),
    (r36_104, 16000, 'rent', '2026-02-01', 'Rent Feb 2026 - Abinand, Villa 36 Room 104'),
    (r36_104, 16000, 'rent', '2026-03-01', 'Rent Mar 2026 - Abinand, Villa 36 Room 104'),
    (r36_104, 17000, 'rent', '2026-04-01', 'Rent Apr 2026 - Abinand, Villa 36 Room 104'),
    (r36_104, 17000, 'rent', '2026-05-01', 'Rent May 2026 - Abinand, Villa 36 Room 104'),
    (r36_104, 17000, 'rent', '2026-06-01', 'Rent Jun 2026 - Abinand, Villa 36 Room 104');

  -- ══════════════════════════════════════════════════════════════════════════
  -- VILLA 32 — INCOME RECORDS
  -- Room 101: Karan   Room 102: Karun   Room 103: Piyush
  -- Room 104: Aditya  Room 105: Swayam
  -- ══════════════════════════════════════════════════════════════════════════

  -- Setup Costs
  INSERT INTO income_records (room_id, amount, income_type, income_date, note) VALUES
    (r32_102, 5000, 'setup_cost', '2026-02-01', 'Setup cost - Dr Karun, Villa 32 Room 102'),
    (r32_103, 3000, 'setup_cost', '2026-02-01', 'Setup cost - Piyush Sharma, Villa 32 Room 103'),
    (r32_104, 5000, 'setup_cost', '2026-02-01', 'Setup cost - Aditya, Villa 32 Room 104'),
    (r32_101, 5000, 'setup_cost', '2026-02-01', 'Setup cost - Karan, Villa 32 Room 101'),
    (r32_105, 5000, 'setup_cost', '2026-02-01', 'Setup cost - Swayam, Villa 32 Room 105');

  -- Deposits
  INSERT INTO income_records (room_id, amount, income_type, income_date, note) VALUES
    (r32_102, 18000, 'deposit', '2026-02-01', '1st Deposit - Dr Karun, Villa 32 Room 102'),
    (r32_102, 18000, 'deposit', '2026-02-02', '2nd Deposit - Dr Karun, Villa 32 Room 102'),
    (r32_103, 20000, 'deposit', '2026-02-01', '1st Deposit - Piyush Sharma, Villa 32 Room 103'),
    (r32_104, 19000, 'deposit', '2026-02-01', '1st Deposit - Aditya, Villa 32 Room 104'),
    (r32_104, 19000, 'deposit', '2026-02-02', '2nd Deposit - Aditya, Villa 32 Room 104'),
    (r32_101, 18000, 'deposit', '2026-02-01', '1st Deposit - Karan, Villa 32 Room 101'),
    (r32_105, 20500, 'deposit', '2026-02-01', '1st Deposit - Swayam, Villa 32 Room 105'),
    (r32_105, 20500, 'deposit', '2026-02-02', '2nd Deposit - Swayam, Villa 32 Room 105');

  -- Monthly Rent — Room 102 Dr Karun (Feb–Jun 2026: 18,000/mo)
  INSERT INTO income_records (room_id, amount, income_type, income_date, note) VALUES
    (r32_102, 18000, 'rent', '2026-02-01', 'Rent Feb 2026 - Dr Karun, Villa 32 Room 102'),
    (r32_102, 18000, 'rent', '2026-03-01', 'Rent Mar 2026 - Dr Karun, Villa 32 Room 102'),
    (r32_102, 18000, 'rent', '2026-04-01', 'Rent Apr 2026 - Dr Karun, Villa 32 Room 102'),
    (r32_102, 18000, 'rent', '2026-05-01', 'Rent May 2026 - Dr Karun, Villa 32 Room 102'),
    (r32_102, 18000, 'rent', '2026-06-01', 'Rent Jun 2026 - Dr Karun, Villa 32 Room 102');

  -- Monthly Rent — Room 103 Piyush (Mar 2026: 20,000; Apr–Jun 2026: 21,000/mo)
  INSERT INTO income_records (room_id, amount, income_type, income_date, note) VALUES
    (r32_103, 20000, 'rent', '2026-03-01', 'Rent Mar 2026 - Piyush Sharma, Villa 32 Room 103'),
    (r32_103, 21000, 'rent', '2026-04-01', 'Rent Apr 2026 - Piyush Sharma, Villa 32 Room 103'),
    (r32_103, 21000, 'rent', '2026-05-01', 'Rent May 2026 - Piyush Sharma, Villa 32 Room 103'),
    (r32_103, 21000, 'rent', '2026-06-01', 'Rent Jun 2026 - Piyush Sharma, Villa 32 Room 103');

  -- Monthly Rent — Room 104 Aditya (Apr–May 2026: 19,000/mo)
  INSERT INTO income_records (room_id, amount, income_type, income_date, note) VALUES
    (r32_104, 19000, 'rent', '2026-04-01', 'Rent Apr 2026 - Aditya, Villa 32 Room 104'),
    (r32_104, 19000, 'rent', '2026-05-01', 'Rent May 2026 - Aditya, Villa 32 Room 104');

  -- Monthly Rent — Room 101 Karan (Apr–May 2026: 19,000/mo)
  INSERT INTO income_records (room_id, amount, income_type, income_date, note) VALUES
    (r32_101, 19000, 'rent', '2026-04-01', 'Rent Apr 2026 - Karan, Villa 32 Room 101'),
    (r32_101, 19000, 'rent', '2026-05-01', 'Rent May 2026 - Karan, Villa 32 Room 101');

  -- Monthly Rent — Room 105 Swayam (Apr–Jun 2026: 20,500/mo)
  INSERT INTO income_records (room_id, amount, income_type, income_date, note) VALUES
    (r32_105, 20500, 'rent', '2026-04-01', 'Rent Apr 2026 - Swayam, Villa 32 Room 105'),
    (r32_105, 20500, 'rent', '2026-05-01', 'Rent May 2026 - Swayam, Villa 32 Room 105'),
    (r32_105, 20500, 'rent', '2026-06-01', 'Rent Jun 2026 - Swayam, Villa 32 Room 105');

  -- ══════════════════════════════════════════════════════════════════════════
  -- VILLA 38 — INCOME RECORDS
  -- Room 101: Vivek   Room 102: Yasaswini   Room 103: Femina
  -- Room 104: Shivanshu   Room 105: Vacant
  -- ══════════════════════════════════════════════════════════════════════════

  -- Setup Costs
  INSERT INTO income_records (room_id, amount, income_type, income_date, note) VALUES
    (r38_102, 5000, 'setup_cost', '2026-03-01', 'Setup cost - Yasaswini, Villa 38 Room 102'),
    (r38_104, 5000, 'setup_cost', '2026-03-01', 'Setup cost - Shivanshu, Villa 38 Room 104');

  -- Deposits
  INSERT INTO income_records (room_id, amount, income_type, income_date, note) VALUES
    (r38_102, 17000, 'deposit', '2026-03-01', '1st Deposit - Yasaswini, Villa 38 Room 102'),
    (r38_102, 17000, 'deposit', '2026-03-02', '2nd Deposit - Yasaswini, Villa 38 Room 102'),
    (r38_104, 16000, 'deposit', '2026-03-01', '1st Deposit - Shivanshu, Villa 38 Room 104'),
    (r38_104, 16000, 'deposit', '2026-03-02', '2nd Deposit - Shivanshu, Villa 38 Room 104'),
    (r38_101, 17000, 'deposit', '2026-06-01', '1st Deposit - Vivek, Villa 38 Room 101');

  -- Monthly Rent — Room 102 Yasaswini (Mar–Jun 2026: 17,000/mo)
  INSERT INTO income_records (room_id, amount, income_type, income_date, note) VALUES
    (r38_102, 17000, 'rent', '2026-03-01', 'Rent Mar 2026 - Yasaswini, Villa 38 Room 102'),
    (r38_102, 17000, 'rent', '2026-04-01', 'Rent Apr 2026 - Yasaswini, Villa 38 Room 102'),
    (r38_102, 17000, 'rent', '2026-05-01', 'Rent May 2026 - Yasaswini, Villa 38 Room 102'),
    (r38_102, 17000, 'rent', '2026-06-01', 'Rent Jun 2026 - Yasaswini, Villa 38 Room 102');

  -- Monthly Rent — Room 104 Shivanshu (Mar 2026: 5,000 partial; Apr–May 2026: 11,500/mo)
  INSERT INTO income_records (room_id, amount, income_type, income_date, note) VALUES
    (r38_104,  5000, 'rent', '2026-03-01', 'Rent Mar 2026 - Shivanshu, Villa 38 Room 104 (partial)'),
    (r38_104, 11500, 'rent', '2026-04-01', 'Rent Apr 2026 - Shivanshu, Villa 38 Room 104'),
    (r38_104, 11500, 'rent', '2026-05-01', 'Rent May 2026 - Shivanshu, Villa 38 Room 104');

  -- Monthly Rent — Room 101 Vivek (Jun–Jul 2026: 17,000/mo)
  INSERT INTO income_records (room_id, amount, income_type, income_date, note) VALUES
    (r38_101, 17000, 'rent', '2026-06-01', 'Rent Jun 2026 - Vivek, Villa 38 Room 101'),
    (r38_101, 17000, 'rent', '2026-07-01', 'Rent Jul 2026 - Vivek, Villa 38 Room 101');

  -- Monthly Rent — Room 103 Femina (May 2026: 5,750 partial)
  INSERT INTO income_records (room_id, amount, income_type, income_date, note) VALUES
    (r38_103, 5750, 'rent', '2026-05-01', 'Rent May 2026 - Femina, Villa 38 Room 103 (partial)');

  -- ══════════════════════════════════════════════════════════════════════════
  -- VILLA 36 — SHARED EXPENSES
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO expenses (label, amount, category, property_id, expense_date, note) VALUES
    -- December 2025
    ('Furniture',     10000, 'furniture', v36_id, '2025-12-01', 'Villa 36 furniture - Dec 2025'),
    ('Maid/Cleaning',  3000, 'maid',      v36_id, '2025-12-01', 'Villa 36 maid - Dec 2025'),
    ('Wifi',           1000, 'wifi',      v36_id, '2025-12-01', 'Villa 36 wifi - Dec 2025'),
    ('Landlord Rent', 58000, 'rent',      v36_id, '2025-12-01', 'Villa 36 landlord rent - Dec 2025'),
    -- January 2026
    ('Furniture',     10000, 'furniture', v36_id, '2026-01-01', 'Villa 36 furniture - Jan 2026'),
    ('Maid/Cleaning',  3000, 'maid',      v36_id, '2026-01-01', 'Villa 36 maid - Jan 2026'),
    ('Wifi',           1000, 'wifi',      v36_id, '2026-01-01', 'Villa 36 wifi - Jan 2026'),
    ('Landlord Rent', 58000, 'rent',      v36_id, '2026-01-01', 'Villa 36 landlord rent - Jan 2026'),
    -- February 2026
    ('Furniture',     10000, 'furniture', v36_id, '2026-02-01', 'Villa 36 furniture - Feb 2026'),
    ('Maid/Cleaning',  3000, 'maid',      v36_id, '2026-02-01', 'Villa 36 maid - Feb 2026'),
    ('Wifi',           1000, 'wifi',      v36_id, '2026-02-01', 'Villa 36 wifi - Feb 2026'),
    ('Landlord Rent', 58000, 'rent',      v36_id, '2026-02-01', 'Villa 36 landlord rent - Feb 2026'),
    -- March 2026
    ('Furniture',     10000, 'furniture', v36_id, '2026-03-01', 'Villa 36 furniture - Mar 2026'),
    ('Maid/Cleaning',  3000, 'maid',      v36_id, '2026-03-01', 'Villa 36 maid - Mar 2026'),
    ('Wifi',           1000, 'wifi',      v36_id, '2026-03-01', 'Villa 36 wifi - Mar 2026'),
    ('Landlord Rent', 60000, 'rent',      v36_id, '2026-03-01', 'Villa 36 landlord rent - Mar 2026'),
    -- April 2026
    ('Furniture',     10000, 'furniture', v36_id, '2026-04-01', 'Villa 36 furniture - Apr 2026'),
    ('Maid/Cleaning',  3000, 'maid',      v36_id, '2026-04-01', 'Villa 36 maid - Apr 2026'),
    ('Wifi',           1000, 'wifi',      v36_id, '2026-04-01', 'Villa 36 wifi - Apr 2026'),
    ('Landlord Rent', 60000, 'rent',      v36_id, '2026-04-01', 'Villa 36 landlord rent - Apr 2026'),
    -- May 2026
    ('Furniture',     10000, 'furniture', v36_id, '2026-05-01', 'Villa 36 furniture - May 2026'),
    ('Maid/Cleaning',  3500, 'maid',      v36_id, '2026-05-01', 'Villa 36 maid - May 2026'),
    ('Wifi',           1000, 'wifi',      v36_id, '2026-05-01', 'Villa 36 wifi - May 2026'),
    ('Landlord Rent', 60000, 'rent',      v36_id, '2026-05-01', 'Villa 36 landlord rent - May 2026'),
    -- June 2026
    ('Landlord Rent', 60000, 'rent',      v36_id, '2026-06-01', 'Villa 36 landlord rent - Jun 2026');

  -- ══════════════════════════════════════════════════════════════════════════
  -- VILLA 32 — SHARED EXPENSES
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO expenses (label, amount, category, property_id, expense_date, note) VALUES
    -- February 2026
    ('Furniture',     10000, 'furniture', v32_id, '2026-02-01', 'Villa 32 furniture - Feb 2026'),
    ('Maid/Cleaning',  3000, 'maid',      v32_id, '2026-02-01', 'Villa 32 maid - Feb 2026'),
    ('Wifi',           1000, 'wifi',      v32_id, '2026-02-01', 'Villa 32 wifi - Feb 2026'),
    ('Landlord Rent', 35000, 'rent',      v32_id, '2026-02-01', 'Villa 32 landlord rent - Feb 2026'),
    -- March 2026
    ('Furniture',     10000, 'furniture', v32_id, '2026-03-01', 'Villa 32 furniture - Mar 2026'),
    ('Maid/Cleaning',  3000, 'maid',      v32_id, '2026-03-01', 'Villa 32 maid - Mar 2026'),
    ('Wifi',           1000, 'wifi',      v32_id, '2026-03-01', 'Villa 32 wifi - Mar 2026'),
    ('Landlord Rent', 60000, 'rent',      v32_id, '2026-03-01', 'Villa 32 landlord rent - Mar 2026'),
    -- April 2026
    ('Furniture',     10000, 'furniture', v32_id, '2026-04-01', 'Villa 32 furniture - Apr 2026'),
    ('Maid/Cleaning',  3000, 'maid',      v32_id, '2026-04-01', 'Villa 32 maid - Apr 2026'),
    ('Wifi',           1000, 'wifi',      v32_id, '2026-04-01', 'Villa 32 wifi - Apr 2026'),
    ('Landlord Rent', 60000, 'rent',      v32_id, '2026-04-01', 'Villa 32 landlord rent - Apr 2026'),
    -- May 2026
    ('Furniture',     10000, 'furniture', v32_id, '2026-05-01', 'Villa 32 furniture - May 2026'),
    ('Maid/Cleaning',  3500, 'maid',      v32_id, '2026-05-01', 'Villa 32 maid - May 2026'),
    ('Wifi',           1000, 'wifi',      v32_id, '2026-05-01', 'Villa 32 wifi - May 2026'),
    ('Landlord Rent', 60000, 'rent',      v32_id, '2026-05-01', 'Villa 32 landlord rent - May 2026'),
    -- June 2026
    ('Furniture',     10000, 'furniture', v32_id, '2026-06-01', 'Villa 32 furniture - Jun 2026'),
    ('Maid/Cleaning',  3500, 'maid',      v32_id, '2026-06-01', 'Villa 32 maid - Jun 2026'),
    ('Wifi',           1000, 'wifi',      v32_id, '2026-06-01', 'Villa 32 wifi - Jun 2026'),
    ('Landlord Rent', 60000, 'rent',      v32_id, '2026-06-01', 'Villa 32 landlord rent - Jun 2026');

  -- ══════════════════════════════════════════════════════════════════════════
  -- VILLA 38 — SHARED EXPENSES
  -- ══════════════════════════════════════════════════════════════════════════

  INSERT INTO expenses (label, amount, category, property_id, expense_date, note) VALUES
    -- March 2026
    ('Furniture',      5000, 'furniture', v38_id, '2026-03-01', 'Villa 38 furniture - Mar 2026'),
    ('Maid/Cleaning',  3000, 'maid',      v38_id, '2026-03-01', 'Villa 38 maid - Mar 2026'),
    ('Wifi',           1000, 'wifi',      v38_id, '2026-03-01', 'Villa 38 wifi - Mar 2026'),
    ('Landlord Rent', 40000, 'rent',      v38_id, '2026-03-01', 'Villa 38 landlord rent - Mar 2026'),
    -- April 2026
    ('Furniture',      5000, 'furniture', v38_id, '2026-04-01', 'Villa 38 furniture - Apr 2026'),
    ('Maid/Cleaning',  3000, 'maid',      v38_id, '2026-04-01', 'Villa 38 maid - Apr 2026'),
    ('Wifi',           1000, 'wifi',      v38_id, '2026-04-01', 'Villa 38 wifi - Apr 2026'),
    ('Landlord Rent', 68000, 'rent',      v38_id, '2026-04-01', 'Villa 38 landlord rent - Apr 2026'),
    -- May 2026
    ('Furniture',      5000, 'furniture', v38_id, '2026-05-01', 'Villa 38 furniture - May 2026'),
    ('Maid/Cleaning',  3000, 'maid',      v38_id, '2026-05-01', 'Villa 38 maid - May 2026'),
    ('Wifi',           1000, 'wifi',      v38_id, '2026-05-01', 'Villa 38 wifi - May 2026'),
    ('Landlord Rent', 68000, 'rent',      v38_id, '2026-05-01', 'Villa 38 landlord rent - May 2026'),
    -- June 2026
    ('Furniture',      5000, 'furniture', v38_id, '2026-06-01', 'Villa 38 furniture - Jun 2026'),
    ('Maid/Cleaning',  3000, 'maid',      v38_id, '2026-06-01', 'Villa 38 maid - Jun 2026'),
    ('Wifi',           1000, 'wifi',      v38_id, '2026-06-01', 'Villa 38 wifi - Jun 2026'),
    ('Landlord Rent', 68000, 'rent',      v38_id, '2026-06-01', 'Villa 38 landlord rent - Jun 2026');

  RAISE NOTICE 'Villa financial ledger import complete';

END;
$$;
