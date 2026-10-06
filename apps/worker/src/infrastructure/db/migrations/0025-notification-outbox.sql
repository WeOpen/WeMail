-- Persist notification intent before external delivery. The event id makes
-- enqueue idempotent while attempts remain separately observable.
CREATE TABLE IF NOT EXISTS notification_outbox (
  id TEXT PRIMARY KEY,
  message_id TEXT,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  target TEXT NOT NULL,
  target_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  locked_at TEXT,
  lease_token TEXT,
  last_error TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(event_id, target, target_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_due
  ON notification_outbox (status, next_attempt_at, locked_at);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_user_created
  ON notification_outbox (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_expiry
  ON notification_outbox (expires_at);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_message
  ON notification_outbox (message_id);
