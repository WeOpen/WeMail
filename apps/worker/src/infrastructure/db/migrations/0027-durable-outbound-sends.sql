ALTER TABLE mail_outbound_messages ADD COLUMN user_id TEXT;
ALTER TABLE mail_outbound_messages ADD COLUMN request_key TEXT;
ALTER TABLE mail_outbound_messages ADD COLUMN request_hash TEXT;
ALTER TABLE mail_outbound_messages ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 1;
ALTER TABLE mail_outbound_messages ADD COLUMN retry_delay_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mail_outbound_messages ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mail_outbound_messages ADD COLUMN next_attempt_at TEXT;
ALTER TABLE mail_outbound_messages ADD COLUMN locked_at TEXT;
ALTER TABLE mail_outbound_messages ADD COLUMN lease_token TEXT;
ALTER TABLE mail_outbound_messages ADD COLUMN first_attempt_at TEXT;
ALTER TABLE mail_outbound_messages ADD COLUMN updated_at TEXT;
ALTER TABLE mail_outbound_messages ADD COLUMN submission_uncertain INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mail_outbound_messages ADD COLUMN payload_retained INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX idx_outbound_user_request ON mail_outbound_messages (user_id, request_key);
CREATE INDEX idx_outbound_due ON mail_outbound_messages (status, next_attempt_at, locked_at);
CREATE INDEX idx_outbound_provider ON mail_outbound_messages (provider_message_id);

CREATE TABLE mail_outbound_events (
  id TEXT PRIMARY KEY,
  message_id TEXT,
  provider_message_id TEXT,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  detail TEXT
);
CREATE INDEX idx_outbound_event_message ON mail_outbound_events (message_id, occurred_at);
CREATE INDEX idx_outbound_event_provider ON mail_outbound_events (provider_message_id, occurred_at);
