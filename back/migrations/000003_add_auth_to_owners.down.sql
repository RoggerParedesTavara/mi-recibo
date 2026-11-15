DROP INDEX IF EXISTS owners_email_lower_unique;
ALTER TABLE owners DROP COLUMN IF EXISTS password_hash;
