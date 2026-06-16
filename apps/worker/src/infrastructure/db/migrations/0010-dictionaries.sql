CREATE TABLE IF NOT EXISTS dictionary_groups (
  group_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  is_system INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dictionary_items (
  id TEXT PRIMARY KEY,
  group_key TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  UNIQUE(group_key, value),
  FOREIGN KEY (group_key) REFERENCES dictionary_groups(group_key) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dictionary_items_group_order
  ON dictionary_items (group_key, sort_order, label);
