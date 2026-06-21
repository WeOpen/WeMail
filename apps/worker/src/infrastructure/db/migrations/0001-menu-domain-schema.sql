PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_by_user_id TEXT,
  redeemed_by_user_id TEXT,
  redeemed_at TEXT,
  disabled_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mailboxes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  address TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  mailbox_id TEXT NOT NULL,
  from_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT NOT NULL,
  body_text TEXT NOT NULL,
  extraction_json TEXT NOT NULL,
  oversize_status TEXT,
  attachment_count INTEGER NOT NULL,
  received_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outbound_messages (
  id TEXT PRIMARY KEY,
  mailbox_id TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  error_text TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS send_quotas (
  user_id TEXT PRIMARY KEY,
  daily_limit INTEGER NOT NULL,
  sends_today INTEGER NOT NULL,
  disabled INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO auth_sessions (id, user_id, expires_at, created_at)
SELECT id, user_id, expires_at, created_at FROM sessions;

CREATE TABLE IF NOT EXISTS user_invites (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_by_user_id TEXT,
  redeemed_by_user_id TEXT,
  redeemed_at TEXT,
  disabled_at TEXT,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO user_invites (id, code, created_by_user_id, redeemed_by_user_id, redeemed_at, disabled_at, created_at)
SELECT id, code, created_by_user_id, redeemed_by_user_id, redeemed_at, disabled_at, created_at FROM invites;

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  address TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'enabled',
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_by_user_id TEXT,
  last_active_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO accounts (
  id,
  user_id,
  address,
  label,
  status,
  tags_json,
  created_by_user_id,
  last_active_at,
  deleted_at,
  created_at
)
SELECT
  id,
  user_id,
  address,
  label,
  'enabled',
  '[]',
  user_id,
  created_at,
  NULL,
  created_at
FROM mailboxes;

CREATE TABLE IF NOT EXISTS mail_messages (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  from_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT NOT NULL,
  body_text TEXT NOT NULL,
  extraction_json TEXT NOT NULL,
  oversize_status TEXT,
  attachment_count INTEGER NOT NULL,
  received_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

INSERT OR IGNORE INTO mail_messages (
  id,
  account_id,
  from_address,
  subject,
  preview_text,
  body_text,
  extraction_json,
  oversize_status,
  attachment_count,
  received_at,
  expires_at
)
SELECT
  id,
  mailbox_id,
  from_address,
  subject,
  preview_text,
  body_text,
  extraction_json,
  oversize_status,
  attachment_count,
  received_at,
  expires_at
FROM messages;

CREATE TABLE IF NOT EXISTS mail_attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO mail_attachments (id, message_id, filename, content_type, size, storage_key, created_at)
SELECT id, message_id, filename, content_type, size, storage_key, created_at FROM attachments;

CREATE TABLE IF NOT EXISTS mail_outbound_messages (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  error_text TEXT,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO mail_outbound_messages (id, account_id, to_address, subject, status, error_text, created_at)
SELECT id, mailbox_id, to_address, subject, status, error_text, created_at FROM outbound_messages;

CREATE TABLE IF NOT EXISTS user_send_quotas (
  user_id TEXT PRIMARY KEY,
  daily_limit INTEGER NOT NULL,
  sends_today INTEGER NOT NULL,
  disabled INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO user_send_quotas (user_id, daily_limit, sends_today, disabled, updated_at)
SELECT user_id, daily_limit, sends_today, disabled, updated_at FROM send_quotas;

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO system_settings (key, value, updated_at)
SELECT key, value, updated_at FROM settings;

CREATE TABLE IF NOT EXISTS system_audit_events (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO system_audit_events (id, actor_type, actor_id, event_type, payload_json, created_at)
SELECT id, actor_type, actor_id, event_type, payload_json, created_at FROM audit_events;

CREATE TABLE IF NOT EXISTS account_settings (
  id TEXT PRIMARY KEY,
  creation_json TEXT NOT NULL,
  lifecycle_json TEXT NOT NULL,
  protection_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mail_settings (
  id TEXT PRIMARY KEY,
  sender_rules_json TEXT NOT NULL,
  routing_json TEXT NOT NULL,
  workspace_defaults_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events_json TEXT NOT NULL,
  signing_secret TEXT NOT NULL,
  enabled INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  endpoint_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  status_code INTEGER,
  duration_ms INTEGER,
  error_text TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  audience TEXT NOT NULL,
  priority TEXT NOT NULL,
  author_user_id TEXT,
  author_label TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  pinned INTEGER NOT NULL,
  start_at TEXT,
  end_at TEXT,
  published_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS announcement_receipts (
  announcement_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  acknowledged_at TEXT NOT NULL,
  PRIMARY KEY (announcement_id, user_id),
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS invites;
DROP TABLE IF EXISTS mailboxes;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS outbound_messages;
DROP TABLE IF EXISTS send_quotas;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS audit_events;

PRAGMA foreign_keys = ON;
