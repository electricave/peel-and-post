-- Phase backlog: studio-only checklist for tracking discovered requirements
-- before advancing to the next phase

CREATE TABLE IF NOT EXISTS phase_backlog (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase      INTEGER NOT NULL DEFAULT 1,
  title      TEXT NOT NULL,
  notes      TEXT,
  resolved   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE phase_backlog ENABLE ROW LEVEL SECURITY;

CREATE POLICY studio_backlog_policy ON phase_backlog
  USING (public.is_studio())
  WITH CHECK (public.is_studio());
