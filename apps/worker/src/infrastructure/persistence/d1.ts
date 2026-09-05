import type { D1Database } from "@cloudflare/workers-types";

import type { AppStore } from "../../core/bindings";
import { createAnnouncementsAggregate } from "./d1/announcements";
import { createMailAggregate } from "./d1/mail";
import { createOpsAggregate } from "./d1/ops";
import { createSettingsAggregate } from "./d1/settings";
import { createUsersAggregate } from "./d1/users";

// The D1 store is composed from per-aggregate modules under ./d1. Each module
// owns the SQL, row mapping, and query-shaping logic for its domain; this file
// is only the assembly point that preserves the single AppStore entry.
export function createD1Store(db: D1Database): AppStore {
  return {
    ...createUsersAggregate(db),
    ...createMailAggregate(db),
    ...createSettingsAggregate(db),
    ...createOpsAggregate(db),
    ...createAnnouncementsAggregate(db)
  };
}
