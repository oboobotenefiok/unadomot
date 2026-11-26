ALTER TABLE listings
    ADD COLUMN IF NOT EXISTS code TEXT;

UPDATE listings
SET code = upper(substr(md5(id::text), 1, 8))
WHERE code IS NULL;

ALTER TABLE listings
    ALTER COLUMN code SET DEFAULT upper(substr(md5(gen_random_uuid()::text), 1, 8));

CREATE UNIQUE INDEX IF NOT EXISTS listings_code_unique_idx
    ON listings (code);
