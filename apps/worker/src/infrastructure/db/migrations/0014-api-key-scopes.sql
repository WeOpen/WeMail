ALTER TABLE api_keys
  ADD COLUMN scopes_json TEXT NOT NULL DEFAULT '["mail:read","mail:send","mailbox:manage","webhook:manage","settings:read"]';
