-- Add contact number support for users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20);

-- Ensure mobile numbers remain unique when provided
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_contact_number_unique
ON users(contact_number)
WHERE contact_number IS NOT NULL;
