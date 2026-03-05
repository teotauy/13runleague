-- Two-tier auth: add member (view-only) password to leagues
-- The existing password_hash remains the admin (commissioner) password.
-- member_password_hash is a separate simpler shared password for read-only access.
-- Safe to run multiple times.

ALTER TABLE leagues
  ADD COLUMN IF NOT EXISTS member_password_hash text;

COMMENT ON COLUMN leagues.member_password_hash IS 'Bcrypt hash of the shared read-only member password. NULL means member login is not yet configured.';
COMMENT ON COLUMN leagues.password_hash IS 'Bcrypt hash of the commissioner (admin) password.';
