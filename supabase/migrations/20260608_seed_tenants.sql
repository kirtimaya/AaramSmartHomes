-- ============================================================
-- Tenant Seeding — Villa36 / Villa32 / Villa38
-- Run in Supabase SQL editor (postgres role, bypasses RLS)
-- Idempotent: skips rooms that already have an invitation
-- ============================================================

-- ── VILLA 36 ─────────────────────────────────────────────────

INSERT INTO tenant_invitations (room_id, name, phone, email)
SELECT r.id, 'Subhasish Nayak', '7008908570', NULL
FROM rooms r JOIN properties p ON r.property_id = p.id
WHERE p.name ILIKE '%villa%36%' AND r.name ILIKE '%101%'
  AND NOT EXISTS (SELECT 1 FROM tenant_invitations t WHERE t.room_id = r.id)
LIMIT 1;

INSERT INTO tenant_invitations (room_id, name, phone, email)
SELECT r.id, 'Durga Prasad Mohapatra', '8596963949', NULL
FROM rooms r JOIN properties p ON r.property_id = p.id
WHERE p.name ILIKE '%villa%36%' AND r.name ILIKE '%102%'
  AND NOT EXISTS (SELECT 1 FROM tenant_invitations t WHERE t.room_id = r.id)
LIMIT 1;

INSERT INTO tenant_invitations (room_id, name, phone, email)
SELECT r.id, 'Kirtimaya Swain', '8270102379', NULL
FROM rooms r JOIN properties p ON r.property_id = p.id
WHERE p.name ILIKE '%villa%36%' AND r.name ILIKE '%103%'
  AND NOT EXISTS (SELECT 1 FROM tenant_invitations t WHERE t.room_id = r.id)
LIMIT 1;

INSERT INTO tenant_invitations (room_id, name, phone, email)
SELECT r.id, 'Abinand R', '8971096795', 'abinandr93@gmail.com'
FROM rooms r JOIN properties p ON r.property_id = p.id
WHERE p.name ILIKE '%villa%36%' AND r.name ILIKE '%104%'
  AND NOT EXISTS (SELECT 1 FROM tenant_invitations t WHERE t.room_id = r.id)
LIMIT 1;

INSERT INTO tenant_invitations (room_id, name, phone, email)
SELECT r.id, 'Nirmish KB', '8778379972', 'nirmishkb@gmail.com'
FROM rooms r JOIN properties p ON r.property_id = p.id
WHERE p.name ILIKE '%villa%36%' AND r.name ILIKE '%105%'
  AND NOT EXISTS (SELECT 1 FROM tenant_invitations t WHERE t.room_id = r.id)
LIMIT 1;

-- ── VILLA 32 ─────────────────────────────────────────────────

INSERT INTO tenant_invitations (room_id, name, phone, email)
SELECT r.id, 'Karan Shrivastava', '7038184805', 'karanshrivastava17@yahoo.com'
FROM rooms r JOIN properties p ON r.property_id = p.id
WHERE p.name ILIKE '%villa%32%' AND r.name ILIKE '%101%'
  AND NOT EXISTS (SELECT 1 FROM tenant_invitations t WHERE t.room_id = r.id)
LIMIT 1;

INSERT INTO tenant_invitations (room_id, name, phone, email)
SELECT r.id, 'Dr Karun', '8897539449', NULL
FROM rooms r JOIN properties p ON r.property_id = p.id
WHERE p.name ILIKE '%villa%32%' AND r.name ILIKE '%102%'
  AND NOT EXISTS (SELECT 1 FROM tenant_invitations t WHERE t.room_id = r.id)
LIMIT 1;

INSERT INTO tenant_invitations (room_id, name, phone, email)
SELECT r.id, 'Piyush Singh', '7217499221', 'piyush88021@gmail.com'
FROM rooms r JOIN properties p ON r.property_id = p.id
WHERE p.name ILIKE '%villa%32%' AND r.name ILIKE '%103%'
  AND NOT EXISTS (SELECT 1 FROM tenant_invitations t WHERE t.room_id = r.id)
LIMIT 1;

INSERT INTO tenant_invitations (room_id, name, phone, email)
SELECT r.id, 'Aditya Saraf', '9970154877', 'adityasaraf0501@gmail.com'
FROM rooms r JOIN properties p ON r.property_id = p.id
WHERE p.name ILIKE '%villa%32%' AND r.name ILIKE '%104%'
  AND NOT EXISTS (SELECT 1 FROM tenant_invitations t WHERE t.room_id = r.id)
LIMIT 1;

INSERT INTO tenant_invitations (room_id, name, phone, email)
SELECT r.id, 'Swayam Samal', '8249261851', 'samal.sanket@gmail.com'
FROM rooms r JOIN properties p ON r.property_id = p.id
WHERE p.name ILIKE '%villa%32%' AND r.name ILIKE '%105%'
  AND NOT EXISTS (SELECT 1 FROM tenant_invitations t WHERE t.room_id = r.id)
LIMIT 1;

-- ── VILLA 38 ─────────────────────────────────────────────────

INSERT INTO tenant_invitations (room_id, name, phone, email)
SELECT r.id, 'Vivek', '9986232027', NULL
FROM rooms r JOIN properties p ON r.property_id = p.id
WHERE p.name ILIKE '%villa%38%' AND r.name ILIKE '%101%'
  AND NOT EXISTS (SELECT 1 FROM tenant_invitations t WHERE t.room_id = r.id)
LIMIT 1;

INSERT INTO tenant_invitations (room_id, name, phone, email)
SELECT r.id, 'Yasaswini', '8297543765', NULL
FROM rooms r JOIN properties p ON r.property_id = p.id
WHERE p.name ILIKE '%villa%38%' AND r.name ILIKE '%102%'
  AND NOT EXISTS (SELECT 1 FROM tenant_invitations t WHERE t.room_id = r.id)
LIMIT 1;

INSERT INTO tenant_invitations (room_id, name, phone, email)
SELECT r.id, 'Femina', '7680071616', NULL
FROM rooms r JOIN properties p ON r.property_id = p.id
WHERE p.name ILIKE '%villa%38%' AND r.name ILIKE '%103%'
  AND NOT EXISTS (SELECT 1 FROM tenant_invitations t WHERE t.room_id = r.id)
LIMIT 1;

INSERT INTO tenant_invitations (room_id, name, phone, email)
SELECT r.id, 'Shivanshu Chauhan', '8750794422', 'shivanshuchauhan900@gmail.com'
FROM rooms r JOIN properties p ON r.property_id = p.id
WHERE p.name ILIKE '%villa%38%' AND r.name ILIKE '%104%'
  AND NOT EXISTS (SELECT 1 FROM tenant_invitations t WHERE t.room_id = r.id)
LIMIT 1;

-- Villa 38 Room 105 — vacant, skipped

-- ── Mark all occupied rooms ───────────────────────────────────

UPDATE rooms SET occupancy_status = 'Occupied'
WHERE property_id = (SELECT id FROM properties WHERE name ILIKE '%villa%36%' LIMIT 1)
  AND (name ILIKE '%101%' OR name ILIKE '%102%' OR name ILIKE '%103%' OR name ILIKE '%104%' OR name ILIKE '%105%');

UPDATE rooms SET occupancy_status = 'Occupied'
WHERE property_id = (SELECT id FROM properties WHERE name ILIKE '%villa%32%' LIMIT 1)
  AND (name ILIKE '%101%' OR name ILIKE '%102%' OR name ILIKE '%103%' OR name ILIKE '%104%' OR name ILIKE '%105%');

UPDATE rooms SET occupancy_status = 'Occupied'
WHERE property_id = (SELECT id FROM properties WHERE name ILIKE '%villa%38%' LIMIT 1)
  AND (name ILIKE '%101%' OR name ILIKE '%102%' OR name ILIKE '%103%' OR name ILIKE '%104%');

-- ── Verify: show all invitations + portal join links ─────────

SELECT
  p.name                                             AS "Property",
  r.name                                             AS "Room",
  ti.name                                            AS "Tenant",
  ti.phone                                           AS "Phone",
  COALESCE(ti.email, '—')                            AS "Email",
  'https://aaram.space/join?token=' || ti.token      AS "Portal Link"
FROM tenant_invitations ti
JOIN rooms r        ON ti.room_id = r.id
JOIN properties p   ON r.property_id = p.id
ORDER BY p.name, r.name;
