#!/usr/bin/env node
// Validates that D1 migration files use unique sequential 0001-style numbers.
// Wrangler tracks applied migrations by filename, so a duplicate number is
// invisible to `d1 migrations list` today and only surfaces as ambiguity when
// someone later appends the "next" number.

import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const migrationsDir = resolve(process.cwd(), "apps/worker/src/infrastructure/db/migrations");

// Historical conflicts that are already applied in remote D1 databases.
// Renaming them would desync `wrangler d1 migrations` state, so exactly these
// two files are grandfathered. Any other 0013 file (added or renamed) fails.
// Do not add new entries.
const GRANDFATHERED_DUPLICATES = new Set([
  "0013-oauth-login.sql",
  "0013-telegram-chat-index.sql"
]);

function main() {
  const files = readdirSync(migrationsDir)
    .filter((name) => /^\d{4}-.*\.sql$/.test(name))
    .sort();

  const byNumber = new Map();
  for (const file of files) {
    const number = file.slice(0, 4);
    byNumber.set(number, [...(byNumber.get(number) ?? []), file]);
  }

  const failures = [];
  for (const [number, group] of byNumber) {
    if (group.length < 2) continue;

    const isExactlyGrandfathered =
      group.length === GRANDFATHERED_DUPLICATES.size && group.every((file) => GRANDFATHERED_DUPLICATES.has(file));
    if (isExactlyGrandfathered) {
      console.warn(`[migration-numbering] duplicate ${number} is grandfathered: ${group.join(", ")}`);
      continue;
    }
    failures.push(`${number}: ${group.join(", ")}`);
  }

  if (failures.length > 0) {
    console.error("Migration numbering check failed — duplicate numbers:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Migration numbering check passed (${files.length} files).`);
}

main();
