-- Cleanup cron scans mail_messages by expiry, so the column needs an index to
-- avoid a full-table scan on every scheduled run. Includes id as an explicit
-- tiebreaker for stable ordering.
CREATE INDEX IF NOT EXISTS idx_mail_messages_expires_at
  ON mail_messages (expires_at, id);
