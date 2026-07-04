-- ============================================================
-- Generic audit_log: one table for every admin mutation AND every
-- Aara-executed action, across web/mobile/aara/whatsapp/alexa.
--
-- Supersedes tenant_change_log (20260613_tenant_change_log.sql),
-- which was created but never wired to application code — left in
-- place, unused; not dropped here to avoid touching unrelated history.
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID,
  actor_email TEXT NOT NULL,
  actor_role  TEXT NOT NULL CHECK (actor_role IN ('admin', 'tenant', 'guest', 'system')),
  action      TEXT NOT NULL,          -- dot-namespaced, e.g. 'menu.upsert', 'ticket.resolve'
  entity_type TEXT NOT NULL,          -- 'menu' | 'ticket' | 'room' | 'dish' | 'pantry_item' | 'bill' | 'tenant' | ...
  entity_id   TEXT,
  before      JSONB,
  after       JSONB,
  source      TEXT NOT NULL CHECK (source IN ('web', 'mobile', 'aara', 'whatsapp', 'alexa', 'system')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity  ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor   ON audit_log (actor_email, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_read_audit" ON audit_log;
CREATE POLICY "admins_read_audit" ON audit_log
  FOR SELECT TO authenticated
  USING (auth_is_admin());

-- Deliberately no INSERT policy for anon/authenticated — writes come only
-- from Spring (JDBC as the postgres role, bypasses RLS) and the web
-- server-side supabaseAdmin client (service role, also bypasses RLS).
