-- Add password_hash column to owners table for user authentication
ALTER TABLE owners ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS owners_email_lower_unique ON owners (LOWER(email));
