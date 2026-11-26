ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_username_lower_idx
    ON user_profiles (lower(username))
    WHERE username IS NOT NULL;
