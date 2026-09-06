-- Inbound idempotency: store the RFC 5322 Message-ID and enforce one stored
-- row per (mailbox, Message-ID). Email Routing redeliveries carry the same
-- Message-ID, so the unique index is the race-proof backstop; rows without a
-- Message-ID (NULL) stay unconstrained and fall back to content-based dedupe.
ALTER TABLE mail_messages ADD COLUMN message_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_messages_account_message_id
  ON mail_messages (account_id, message_id);
