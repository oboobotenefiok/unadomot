-- The API now stores only Cloudinary public ids for verification documents.
-- The legacy client-supplied URL column is no longer read or written.
ALTER TABLE verification_requests
  DROP COLUMN IF EXISTS document_url;
