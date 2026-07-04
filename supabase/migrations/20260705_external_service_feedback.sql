-- ============================================================
-- External-service feedback: anonymous by design. This table
-- must never carry a ticket id, user id, phone number, or exact
-- location — property_id is deliberately not a foreign key (no
-- join back to properties/tickets is possible or intended) and
-- created_month is truncated to the month to avoid re-identifying
-- a submission by exact timestamp. See FeedbackAnonymizationService
-- for the single write path into this table.
-- ============================================================

CREATE TABLE IF NOT EXISTS external_service_feedback (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_used    TEXT        NOT NULL,
  cost_score      SMALLINT    NOT NULL CHECK (cost_score BETWEEN 1 AND 3),
  speed_score     SMALLINT    NOT NULL CHECK (speed_score BETWEEN 1 AND 3),
  consent         BOOLEAN     NOT NULL CHECK (consent = TRUE),
  property_id     UUID,
  region          TEXT,
  ticket_category TEXT,
  created_month   DATE        NOT NULL DEFAULT date_trunc('month', NOW())::date
);

CREATE INDEX IF NOT EXISTS idx_external_service_feedback_service ON external_service_feedback(service_used);
CREATE INDEX IF NOT EXISTS idx_external_service_feedback_region ON external_service_feedback(region);

-- Transient token → dispatch map, deleted on submit or expiry. Never joined to
-- external_service_feedback — the whole point is that nothing survives to link them.
CREATE TABLE IF NOT EXISTS feedback_flow_tokens (
  token       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID        NOT NULL REFERENCES ticket_dispatches(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours')
);

CREATE INDEX IF NOT EXISTS idx_feedback_flow_tokens_expiry ON feedback_flow_tokens(expires_at);

ALTER TABLE external_service_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_flow_tokens      ENABLE ROW LEVEL SECURITY;

-- Admin dashboard reads aggregate metrics from this table — never PII, so a broad
-- authenticated-admin SELECT policy is fine here (unlike every other admin table,
-- there's genuinely nothing sensitive in a row: no ticket, no user, no phone).
CREATE POLICY "admins_read_external_service_feedback" ON external_service_feedback
  FOR SELECT TO authenticated USING (auth_is_admin());

-- feedback_flow_tokens carries no PII either but IS operationally sensitive (a leaked
-- token could let someone submit feedback impersonating a dispatch) — admin-only, no
-- broader read policy.
CREATE POLICY "admins_read_feedback_flow_tokens" ON feedback_flow_tokens
  FOR SELECT TO authenticated USING (auth_is_admin());

-- Verify
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('external_service_feedback', 'feedback_flow_tokens');
