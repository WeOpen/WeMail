CREATE TABLE IF NOT EXISTS system_cleanup_runs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  deleted_messages INTEGER NOT NULL DEFAULT 0,
  deleted_attachments INTEGER NOT NULL DEFAULT 0,
  deleted_accounts INTEGER NOT NULL DEFAULT 0,
  error_text TEXT
);

CREATE INDEX IF NOT EXISTS idx_system_cleanup_runs_started_at
  ON system_cleanup_runs(started_at DESC);
