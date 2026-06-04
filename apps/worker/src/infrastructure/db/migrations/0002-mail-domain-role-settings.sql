CREATE TABLE IF NOT EXISTS mail_domains (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  allowed_roles_json TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO mail_domains (id, domain, allowed_roles_json, sort_order, created_at, updated_at)
SELECT
  lower(hex(randomblob(16))),
  json_each.value,
  '[]',
  CAST(json_each.key AS INTEGER),
  system_settings.updated_at,
  system_settings.updated_at
FROM system_settings, json_each(system_settings.value)
WHERE system_settings.key = 'mailDomains'
  AND json_valid(system_settings.value)
  AND json_type(system_settings.value) = 'array'
  AND json_each.type = 'text';
