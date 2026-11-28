-- The initial schema already carried an `amenities` column as jsonb, so the
-- earlier `ADD COLUMN IF NOT EXISTS ... text[]` was a no-op and the repository
-- kept binding a text array against a jsonb column. Convert the existing data
-- instead of adding a second column.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'listings'
          AND column_name = 'amenities'
          AND data_type = 'jsonb'
    ) THEN
        ALTER TABLE listings ADD COLUMN amenities_text text[];

        UPDATE listings
           SET amenities_text = ARRAY(
               SELECT jsonb_array_elements_text(amenities)
           );

        ALTER TABLE listings DROP COLUMN amenities;
        ALTER TABLE listings RENAME COLUMN amenities_text TO amenities;
        ALTER TABLE listings
            ALTER COLUMN amenities SET DEFAULT '{}',
            ALTER COLUMN amenities SET NOT NULL;
    END IF;
END $$;
