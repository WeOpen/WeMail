#!/usr/bin/env node
// Validates that D1 migration files use unique sequential 0001-style numbers.
// Wrangler tracks applied migrations by filename, so a duplicate number is
// invisible to `d1 migrations list` today and only surfaces as ambiguity when
// someone later appends the "next" number.

import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const migrationsDir = resolve(process.cwd(), "apps/worker/src/infrastructure/db/migrations");

// Historical conflicts that are already applied in remote D1 databases.
// Renaming them would desync `wrangler d1 migrations` state, so they are
// grandfathered here. Do not add new entries.
const GRANDFATHERED = new Set(["0013"]);

function main() {
  const files = readdirSync(migrationsDir)
    .filter((name) => /^\d{4}-.*\.sql$/.test(name))
    .sort();

  const seen = new Map();
  const duplicates = new Map();
  for (const file of files) {
    const number = file.slice(0, 4);
    if (seen.has(number)) {
      duplicates.set(number, [seen.get(number), file]);
    } else {
      seen.set(number, file);
    }
  }

  const failures = [];
  for (const [number, pair] of duplicates) {
    if (GRANDFATHERED.has(number)) {
      console.warn(`[migration-numbering] duplicate ${number} is grandfathered: ${pair.join(", ")}`);
      continue;
    }
    failures.push(`${number}: ${pair.join(", ")}`);
  }

  if (failures.length > 0) {
    console.error("Migration numbering check failed — duplicate numbers:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Migration numbering check passed (${files.length} files).`);
}

main();
