-- Notification channels: a webhook endpoint can target a chat platform
-- (Slack / Discord / Feishu / WeCom) whose incoming-webhook URL expects a
-- platform-specific body instead of the generic WeMail JSON envelope.
-- NULL keeps existing endpoints as generic webhooks.
ALTER TABLE webhook_endpoints ADD COLUMN channel TEXT;
