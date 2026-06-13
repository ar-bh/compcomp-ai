-- Tracks Gemini free-tier spacing so the Edge Function never bursts the API.
CREATE TABLE IF NOT EXISTS gemini_quota (
  id text PRIMARY KEY DEFAULT 'default',
  last_call_at timestamptz,
  cooldown_until timestamptz,
  calls_today integer NOT NULL DEFAULT 0,
  quota_day date NOT NULL DEFAULT CURRENT_DATE
);

INSERT INTO gemini_quota (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

ALTER TABLE gemini_quota ENABLE ROW LEVEL SECURITY;
