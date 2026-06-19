ALTER TABLE mail_outbound_messages ADD COLUMN from_address TEXT NOT NULL DEFAULT '';
ALTER TABLE mail_outbound_messages ADD COLUMN body_text TEXT NOT NULL DEFAULT '';
ALTER TABLE mail_outbound_messages ADD COLUMN provider_message_id TEXT;
ALTER TABLE mail_outbound_messages ADD COLUMN request_payload_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE mail_outbound_messages ADD COLUMN response_payload_json TEXT;
