-- ============================================================
-- AaramSmartHomes — User System Overhaul
-- Clean 3-tier: Guest / Tenant / Admin
-- Run in Supabase SQL editor after 20260605_electricity_bill_splitting.sql
-- ============================================================

-- ── 1. guests ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guests (
  id            UUID PRIMARY KEY,  -- = auth.uid()
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. guest_shortlists ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guest_shortlists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id    UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (guest_id, property_id)
);

-- ── 3. visit_requests ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visit_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id    UUID NOT NULL,
  requester_type  TEXT NOT NULL DEFAULT 'guest',  -- 'guest' | 'tenant'
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_id         UUID REFERENCES rooms(id) ON DELETE SET NULL,
  preferred_date  DATE,
  message         TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending'|'confirmed'|'cancelled'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. room_bookings ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS room_bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id            UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  property_id         UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_id             UUID REFERENCES rooms(id) ON DELETE SET NULL,
  token_amount        NUMERIC(10,2) NOT NULL DEFAULT 5000.00,
  razorpay_order_id   TEXT UNIQUE,
  razorpay_payment_id TEXT,
  razorpay_signature  TEXT,
  status              TEXT NOT NULL DEFAULT 'pending',  -- 'pending'|'paid'|'confirmed'|'cancelled'
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. tickets (unified: maintenance + support + tenant_access_request) ───────
-- Drop and recreate to ensure correct schema (old table had tenant_id, not requester_id)
DROP TABLE IF EXISTS tickets CASCADE;
CREATE TABLE tickets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id   UUID NOT NULL,
  requester_type TEXT NOT NULL DEFAULT 'tenant',  -- 'guest' | 'tenant'
  category       TEXT NOT NULL,  -- 'Maintenance'|'Support'|'TenantAccessRequest'
  priority       TEXT NOT NULL DEFAULT 'Medium',  -- 'Low'|'Medium'|'High'|'Urgent'
  status         TEXT NOT NULL DEFAULT 'Pending', -- 'Pending'|'In-Progress'|'Resolved'
  description    TEXT NOT NULL,
  image_url      TEXT,
  admin_note     TEXT,
  booking_id     UUID REFERENCES room_bookings(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. notifications (in-app) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  user_type  TEXT NOT NULL DEFAULT 'tenant',  -- 'guest' | 'tenant'
  type       TEXT NOT NULL,  -- 'bill_locked'|'tenant_approved'|'booking_confirmed'|'visit_confirmed'
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. Alter admin_requests: add token expiry ─────────────────────────────────
ALTER TABLE admin_requests
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours');

-- Backfill: any existing rows without expiry get 48h from now
UPDATE admin_requests
  SET token_expires_at = NOW() + INTERVAL '48 hours'
  WHERE token_expires_at IS NULL;

-- ── 8. Alter tenants: remove shortlisted_property_ids, add phone + property_id ─
ALTER TABLE tenants DROP COLUMN IF EXISTS shortlisted_property_ids;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
-- Remove 'guest' from tenant status — guests now have their own table
-- (existing rows with status='guest' become candidates for guests table — handled in app migration logic)

-- ── 9. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_guest_shortlists_guest ON guest_shortlists(guest_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_requester ON visit_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_guest ON room_bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_tickets_requester ON tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);

-- ── 10. RLS ───────────────────────────────────────────────────────────────────
-- admins: service role has full access; regular auth can only read (for status checks)
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read own" ON admins;
CREATE POLICY "Admins read own" ON admins FOR SELECT TO authenticated USING (true);

-- admin_requests: users can manage their own request
ALTER TABLE admin_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin requests own row" ON admin_requests;
CREATE POLICY "Admin requests own row" ON admin_requests FOR ALL TO authenticated
  USING (email = auth.email());

-- guests: own row only
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Guests own row" ON guests;
CREATE POLICY "Guests own row" ON guests FOR ALL TO authenticated
  USING (id = auth.uid());

-- guest_shortlists: own rows
ALTER TABLE guest_shortlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Guest shortlists own" ON guest_shortlists;
CREATE POLICY "Guest shortlists own" ON guest_shortlists FOR ALL TO authenticated
  USING (guest_id = auth.uid());

-- room_bookings: own rows
ALTER TABLE room_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Room bookings own" ON room_bookings;
CREATE POLICY "Room bookings own" ON room_bookings FOR ALL TO authenticated
  USING (guest_id = auth.uid());

-- visit_requests: own rows
ALTER TABLE visit_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Visit requests own" ON visit_requests;
CREATE POLICY "Visit requests own" ON visit_requests FOR ALL TO authenticated
  USING (requester_id = auth.uid());

-- tickets: own rows for read+insert; service role for updates (admin actions)
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tickets own read" ON tickets;
DROP POLICY IF EXISTS "Tickets own insert" ON tickets;
CREATE POLICY "Tickets own read" ON tickets FOR SELECT TO authenticated USING (requester_id = auth.uid());
CREATE POLICY "Tickets own insert" ON tickets FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());

-- notifications: own rows
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Notifications own" ON notifications;
CREATE POLICY "Notifications own" ON notifications FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- ── 11. pg_cron: 90-day inactive guest cleanup ────────────────────────────────
-- Requires pg_cron extension enabled in Supabase (Dashboard → Extensions → pg_cron)
-- Runs at 2am UTC daily; deletes guests with no activity in 90 days
DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-inactive-guests',
      '0 2 * * *',
      $$DELETE FROM guests WHERE last_login_at < NOW() - INTERVAL '90 days'$$
    );
  END IF;
END
$outer$;
