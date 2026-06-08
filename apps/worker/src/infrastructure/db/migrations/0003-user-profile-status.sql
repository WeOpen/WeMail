ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';

UPDATE users
SET
  name = CASE
    WHEN trim(name) != '' THEN name
    WHEN instr(email, '@') > 1 THEN substr(email, 1, instr(email, '@') - 1)
    ELSE email
  END,
  updated_at = CASE
    WHEN trim(updated_at) != '' THEN updated_at
    ELSE created_at
  END;
