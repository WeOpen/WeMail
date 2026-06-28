ALTER TABLE auth_sessions ADD COLUMN user_agent TEXT;
ALTER TABLE auth_sessions ADD COLUMN ip_address TEXT;
ALTER TABLE auth_sessions ADD COLUMN last_seen_at TEXT;

UPDATE auth_sessions
SET last_seen_at = created_at
WHERE last_seen_at IS NULL;

ALTER TABLE user_invites ADD COLUMN expires_at TEXT;
ALTER TABLE user_invites ADD COLUMN target_role TEXT NOT NULL DEFAULT 'member';
