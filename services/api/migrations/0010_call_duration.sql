ALTER TABLE call_sessions
    ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
