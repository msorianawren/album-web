ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS registration_source VARCHAR(50);
