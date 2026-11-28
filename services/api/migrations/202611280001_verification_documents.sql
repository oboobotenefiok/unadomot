-- Verification documents must never be stored as arbitrary client URLs.
-- Store only the Cloudinary public id (uploaded as type=authenticated) and
-- derive short-lived signed URLs for admin review.
ALTER TABLE verification_requests
  ADD COLUMN IF NOT EXISTS document_public_id TEXT;

CREATE INDEX IF NOT EXISTS verification_requests_document_public_id_idx
  ON verification_requests (document_public_id);
