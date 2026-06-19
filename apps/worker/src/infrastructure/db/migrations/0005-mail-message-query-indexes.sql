CREATE INDEX IF NOT EXISTS idx_mail_messages_account_received
  ON mail_messages (account_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_mail_messages_account_attachment
  ON mail_messages (account_id, attachment_count, received_at DESC);
