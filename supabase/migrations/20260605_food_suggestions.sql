-- Food suggestions submitted by tenants via Alexa or the Aara chatbot

CREATE TABLE IF NOT EXISTS food_suggestions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion  TEXT        NOT NULL,
  source      TEXT        NOT NULL DEFAULT 'alexa'
                          CHECK (source IN ('alexa', 'chat', 'web')),
  tenant_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'noted', 'implemented')),
  admin_note  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_suggestions_status
  ON food_suggestions(status, created_at DESC);

ALTER TABLE food_suggestions ENABLE ROW LEVEL SECURITY;

-- Tenants can submit suggestions (tenant_id must match their own uid or be null for Alexa)
CREATE POLICY "tenants_insert_suggestions" ON food_suggestions FOR INSERT
  WITH CHECK (auth.uid() = tenant_id OR tenant_id IS NULL);

-- Admins have full access
CREATE POLICY "admins_all_suggestions" ON food_suggestions FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE email = (auth.jwt()->>'email')::TEXT));
