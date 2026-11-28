-- Reviewed identity documents are retained for 90 days, then the public id
-- is cleared. The row and audit trail remain so moderation history is intact.
CREATE INDEX IF NOT EXISTS verification_requests_reviewed_at_idx
  ON verification_requests (reviewed_at)
  WHERE reviewed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION purge_reviewed_verification_documents(retain_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  purged integer;
BEGIN
  IF retain_days < 1 THEN
    RAISE EXCEPTION 'retain_days must be at least 1';
  END IF;

  UPDATE verification_requests
  SET document_public_id = NULL
  WHERE document_public_id IS NOT NULL
    AND reviewed_at IS NOT NULL
    AND reviewed_at < now() - make_interval(days => retain_days);

  GET DIAGNOSTICS purged = ROW_COUNT;
  RETURN purged;
END;
$$;

COMMENT ON FUNCTION purge_reviewed_verification_documents(integer)
  IS 'Clears verification document public ids after the retention window. Schedule daily; rows and audit history are preserved.';
