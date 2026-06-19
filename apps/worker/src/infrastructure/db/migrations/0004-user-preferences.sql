CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  bio TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL DEFAULT 'zh-CN',
  timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  date_format TEXT NOT NULL DEFAULT 'yyyy-mm-dd',
  landing_page TEXT NOT NULL DEFAULT '/dashboard',
  density TEXT NOT NULL DEFAULT 'comfortable',
  updated_at TEXT NOT NULL
);
