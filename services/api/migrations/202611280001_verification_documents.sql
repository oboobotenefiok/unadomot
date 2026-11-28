-- Verification documents must never be stored as arbitrary client URLs.
-- Store only the Cloudinary public id (uploaded as type=authenticated) and
-- derive short-lived signed URLs for admin review.
ALTER TABLE verification_requests
  ADD COLUMN document_public_id TEXT;

-- Legacy rows stored a client-supplied URL. Keep the column for history but
-- stop requiring it so new rows can store a public id only.
ALTER TABLE verification_requests
  ALTER COLUMN document_url DROP NOT NULL;

CREATE INDEX verification_requests_document_public_id_idx
  ON verification_requests (document_public_id);
