-- Alexa conversation log for the Kitchen admin dashboard

CREATE TABLE IF NOT EXISTS alexa_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  TEXT        NOT NULL,
  intent      TEXT        NOT NULL,
  utterance   TEXT,                        -- cook's spoken text / slot value
  reply       TEXT,                        -- Aara's plain-text response
  meal_block  TEXT        CHECK (meal_block IN ('Breakfast', 'Lunch', 'Dinner')),
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alexa_logs_logged_at
  ON alexa_logs(logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_alexa_logs_session
  ON alexa_logs(session_id, logged_at);

ALTER TABLE alexa_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_alexa_logs" ON alexa_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE email = (auth.jwt()->>'email')::TEXT));
