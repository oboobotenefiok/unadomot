-- Usernames are public identifiers and must be unique regardless of case.
-- The partial index allows rows that have not been assigned a username yet.
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_username_lower_unique
    ON user_profiles (lower(username))
    WHERE username IS NOT NULL;
