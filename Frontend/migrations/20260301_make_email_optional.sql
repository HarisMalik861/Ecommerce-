-- Make email optional for users (contact_number remains required for login)
-- Run: npm run migrate 20260301_make_email_optional.sql

-- Drop NOT NULL from email - PostgreSQL UNIQUE allows multiple NULLs
ALTER TABLE users
ALTER COLUMN email DROP NOT NULL;

COMMENT ON COLUMN users.email IS 'Optional. Users can sign up with contact number only.';
