-- ============================================================
-- Ticket dispatch: fine-grained maintenance-ticket lifecycle
-- (professional assignment → offer → confirm → schedule) living
-- alongside the coarse tickets.status ('Pending'/'In-Progress'/
-- 'Resolved'/'Cancelled') that existing web/mobile UIs already
-- read. TicketDispatchService is the single writer keeping the
-- two in sync — see its transition matrix in apps/api.
-- ============================================================

-- Abstract, admin-maintained coarse label (e.g. 'BBSR-Patia') — the RegionID
-- referenced by the anonymized external-service feedback pipeline (P5).
ALTER TABLE properties ADD COLUMN IF NOT EXISTS region TEXT;

CREATE TABLE IF NOT EXISTS ticket_dispatches (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id         UUID        NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  status            TEXT        NOT NULL DEFAULT 'PENDING_ASSIGNMENT' CHECK (status IN (
                       'PENDING_ASSIGNMENT', 'OFFERS_SENT', 'PENDING_CONFIRMATION', 'SCHEDULED',
                       'COMPLETED', 'RESOLVED_EXTERNALLY', 'CLOSED', 'CANCELLED'
                     )),
  trade             TEXT,
  professional_id   UUID        REFERENCES professionals(id) ON DELETE SET NULL,
  scheduled_slot    TEXT,
  scheduled_at      TIMESTAMPTZ,
  external_service  TEXT,
  feedback_received BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_dispatches_status ON ticket_dispatches(status);

CREATE TABLE IF NOT EXISTS dispatch_offers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id     UUID        NOT NULL REFERENCES ticket_dispatches(id) ON DELETE CASCADE,
  professional_id UUID        NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  slots           JSONB       NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'RESCINDED', 'EXPIRED')),
  chosen_slot     TEXT,
  sent_at         TIMESTAMPTZ,
  responded_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,
  UNIQUE (dispatch_id, professional_id)
);

CREATE INDEX IF NOT EXISTS idx_dispatch_offers_dispatch ON dispatch_offers(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_offers_pending_expiry ON dispatch_offers(expires_at) WHERE status = 'PENDING';

ALTER TABLE ticket_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_offers   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_ticket_dispatches" ON ticket_dispatches
  FOR SELECT TO authenticated USING (auth_is_admin());

CREATE POLICY "admins_read_dispatch_offers" ON dispatch_offers
  FOR SELECT TO authenticated USING (auth_is_admin());

-- Verify
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('ticket_dispatches', 'dispatch_offers');
