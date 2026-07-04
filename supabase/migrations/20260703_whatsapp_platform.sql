-- ============================================================
-- WhatsApp platform: professional roster, conversation state
-- machine, message log/idempotency, and a transactional outbox
-- for async WhatsApp sends + delayed timers (offer expiry,
-- confirmation timeout, feedback-token expiry). Consumed only by
-- the Spring API, which connects as the `postgres` role and
-- therefore bypasses RLS — these policies exist for admin-
-- dashboard read access via PostgREST/Supabase client, not as
-- the primary authorization boundary.
-- ============================================================

-- ── professionals (roster; cooks share this table via role) ───────────────────

CREATE TABLE IF NOT EXISTS professionals (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  phone_e164  TEXT        NOT NULL UNIQUE CHECK (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  role        TEXT        NOT NULL DEFAULT 'professional' CHECK (role IN ('professional', 'cook')),
  trade       TEXT        CHECK (trade IN ('plumbing', 'electrical', 'carpentry', 'appliance', 'cleaning', 'pest_control', 'general')),
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_professionals_active_phone
  ON professionals(phone_e164) WHERE active;

CREATE INDEX IF NOT EXISTS idx_professionals_role_trade
  ON professionals(role, trade) WHERE active;

-- ── wa_conversations (multi-turn session state machine, keyed by phone) ───────

CREATE TABLE IF NOT EXISTS wa_conversations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164  TEXT        NOT NULL,
  actor_type  TEXT        NOT NULL CHECK (actor_type IN ('tenant', 'guest', 'professional', 'cook', 'unknown')),
  actor_id    UUID,
  flow        TEXT        NOT NULL CHECK (flow IN ('ticket_create', 'dispatch_offer', 'schedule_confirm', 'cook_menu', 'feedback')),
  state       TEXT        NOT NULL,
  context     JSONB       NOT NULL DEFAULT '{}'::jsonb,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active conversation per phone number at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_conversations_active_phone
  ON wa_conversations(phone_e164) WHERE active;

CREATE INDEX IF NOT EXISTS idx_wa_conversations_expiry
  ON wa_conversations(expires_at) WHERE active;

-- ── wa_messages (log + idempotency; PII purgeable per-row) ────────────────────

CREATE TABLE IF NOT EXISTS wa_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_message_id   TEXT        UNIQUE,
  direction       TEXT        NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  phone_e164      TEXT,
  message_type    TEXT        NOT NULL,
  payload         JSONB,
  conversation_id UUID        REFERENCES wa_conversations(id) ON DELETE SET NULL,
  ticket_id       UUID        REFERENCES tickets(id) ON DELETE SET NULL,
  purged_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_messages_ticket
  ON wa_messages(ticket_id) WHERE ticket_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wa_messages_conversation
  ON wa_messages(conversation_id, created_at) WHERE conversation_id IS NOT NULL;

-- ── outbox_events (transactional outbox: async sends + delayed timers) ────────

CREATE TABLE IF NOT EXISTS outbox_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT        NOT NULL,
  aggregate_type  TEXT,
  aggregate_id    UUID,
  payload         JSONB       NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'DONE', 'FAILED', 'DEAD')),
  attempts        INT         NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until    TIMESTAMPTZ,
  locked_by       TEXT,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_claimable
  ON outbox_events(next_attempt_at) WHERE status IN ('PENDING', 'FAILED');

-- ── RLS: admin dashboard read-only; Spring's `postgres` connection bypasses ────
-- RLS entirely and is the only writer, so no INSERT/UPDATE policies exist here.

ALTER TABLE professionals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_professionals" ON professionals
  FOR SELECT TO authenticated USING (auth_is_admin());

CREATE POLICY "admins_read_wa_conversations" ON wa_conversations
  FOR SELECT TO authenticated USING (auth_is_admin());

CREATE POLICY "admins_read_wa_messages" ON wa_messages
  FOR SELECT TO authenticated USING (auth_is_admin());

CREATE POLICY "admins_read_outbox_events" ON outbox_events
  FOR SELECT TO authenticated USING (auth_is_admin());

-- Verify
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('professionals', 'wa_conversations', 'wa_messages', 'outbox_events')
ORDER BY tablename;
