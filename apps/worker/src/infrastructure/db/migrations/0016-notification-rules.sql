CREATE TABLE IF NOT EXISTS notification_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL,
  target TEXT NOT NULL,
  target_id TEXT,
  event_types_json TEXT NOT NULL,
  mailbox_ids_json TEXT NOT NULL,
  keyword TEXT NOT NULL,
  quiet_hours_start TEXT NOT NULL,
  quiet_hours_end TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_rules_user ON notification_rules(user_id);
