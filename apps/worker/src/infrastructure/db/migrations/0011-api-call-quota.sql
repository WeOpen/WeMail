ALTER TABLE user_send_quotas ADD COLUMN api_daily_limit INTEGER NOT NULL DEFAULT 20000;
ALTER TABLE user_send_quotas ADD COLUMN api_calls_today INTEGER NOT NULL DEFAULT 0;
