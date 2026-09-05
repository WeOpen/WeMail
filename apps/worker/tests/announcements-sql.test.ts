import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import type { AnnouncementListOptions, AnnouncementVisibilityOptions } from "../src/core/bindings";
import { createD1Store } from "../src/infrastructure/persistence/d1";
import {
  announcementStatuses,
  filterAnnouncements,
  getAnnouncementSummary,
  getFeaturedAnnouncements,
  paginateAnnouncements
} from "../src/shared/announcements";

// The D1 announcement methods push filtering into SQL. This suite proves the
// SQL predicates stay equivalent to the JS helpers in shared/announcements.ts
// by running the real store statements through node:sqlite and diffing results
// against the pure functions over the same rows.

type AnnouncementRow = {
  id: string;
  title: string;
  summary: string;
  type: string;
  status: string;
  audience: string;
  priority: string;
  author_user_id: string | null;
  author_label: string;
  tags_json: string;
  pinned: number;
  start_at: string | null;
  end_at: string | null;
  published_at: string;
  updated_at: string;
};

// Seed dates are anchored to Date.now() so every case stays meaningful
// forever: fixed absolute dates would drift past the predicate edges (7d
// cutoff, upcoming window) and the suite would keep passing vacuously.
const NOW_MS = Date.now();
const SEED_DAY_MS = 24 * 60 * 60 * 1000;
const iso = (daysFromNow: number) => new Date(NOW_MS + daysFromNow * SEED_DAY_MS).toISOString();

function buildSeedRows(): AnnouncementRow[] {
  const rows: AnnouncementRow[] = [];
  const base = {
    summary: "维护说明摘要",
    type: "产品更新",
    priority: "中",
    author_user_id: null,
    author_label: "系统",
    tags_json: JSON.stringify(["发布", "release"]),
    updated_at: iso(0)
  };
  const counter = { value: 0 };
  const add = (overrides: Partial<AnnouncementRow> & { title: string }) => {
    counter.value += 1;
    rows.push({
      ...base,
      id: `ann-${String(counter.value).padStart(3, "0")}`,
      status: "已发布",
      audience: "全部成员",
      pinned: 0,
      start_at: null,
      end_at: null,
      published_at: iso(-3),
      ...overrides
    });
  };

  add({ title: "默认已发布" });
  add({ title: "置顶已发布", pinned: 1, published_at: iso(-10) });
  add({ title: "即将开始", start_at: iso(5), end_at: iso(12) });
  add({ title: "进行中窗口", start_at: iso(-3), end_at: iso(12) });
  add({ title: "已结束", end_at: iso(-5) });
  add({ title: "已归档", status: "已归档" });
  add({ title: "仅管理员", audience: "管理员" });
  add({ title: "仅普通成员", audience: "普通成员" });
  add({ title: "安全提醒类型", type: "安全提醒" });
  add({ title: "老公告三十天外", published_at: iso(-45) });
  add({ title: "含搜索词 ribbon 的公告" });
  add({ title: "标签含 release 的搜索", tags_json: JSON.stringify(["ribbon-tag"]) });
  // Keyword-parity rows: boundary spanning, adjacent tags, mixed-type tags,
  // and an inverted window (unreachable via the API, pins predicate order).
  add({ title: "Release", summary: "Notes 更新说明" });
  add({ title: "相邻标签公告", tags_json: JSON.stringify(["release", "notes"]) });
  add({ title: "混合类型标签公告", tags_json: '[123, "ok"]' });
  add({ title: "窗口倒置公告", start_at: iso(5), end_at: iso(-5) });
  return rows;
}

const SEED_ROWS = buildSeedRows();

function createSqliteBackedStore() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      audience TEXT NOT NULL,
      priority TEXT NOT NULL,
      author_user_id TEXT,
      author_label TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      pinned INTEGER NOT NULL,
      start_at TEXT,
      end_at TEXT,
      published_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  const insert = sqlite.prepare(
    "INSERT INTO announcements (id, title, summary, type, status, audience, priority, author_user_id, author_label, tags_json, pinned, start_at, end_at, published_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const row of SEED_ROWS) {
    insert.run(
      row.id,
      row.title,
      row.summary,
      row.type,
      row.status,
      row.audience,
      row.priority,
      row.author_user_id,
      row.author_label,
      row.tags_json,
      row.pinned,
      row.start_at,
      row.end_at,
      row.published_at,
      row.updated_at
    );
  }

  // D1 adapter: translate prepare/bind/first/all onto node:sqlite.
  const db = {
    prepare(sql: string) {
      let bound: unknown[] = [];
      const statement = {
        bind(...values: unknown[]) {
          bound = values;
          return statement;
        },
        async first<T>() {
          const row = sqlite.prepare(sql).get(...(bound as never[])) as T | undefined;
          return row ?? null;
        },
        async all() {
          const results = sqlite.prepare(sql).all(...(bound as never[])) as unknown[];
          return { results };
        },
        async run() {
          sqlite.prepare(sql).run(...(bound as never[]));
          return { success: true };
        }
      };
      return statement;
    }
  } as unknown as D1Database;
  return { store: createD1Store(db), sqlite };
}

function toRecord(row: AnnouncementRow) {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    type: row.type,
    status: row.status,
    audience: row.audience,
    priority: row.priority,
    authorUserId: row.author_user_id,
    authorLabel: row.author_label,
    tagsJson: row.tags_json,
    pinned: row.pinned === 1,
    startAt: row.start_at,
    endAt: row.end_at,
    publishedAt: row.published_at,
    updatedAt: row.updated_at
  };
}

const RECORDS = SEED_ROWS.map(toRecord);

const VISIBILITY_CASES: Array<{ label: string; options: AnnouncementVisibilityOptions }> = [
  { label: "member visible", options: { scope: "visible", userRole: "member" } },
  { label: "admin visible", options: { scope: "visible", userRole: "admin" } },
  { label: "admin manage", options: { scope: "manage", userRole: "admin" } }
];

const LIST_CASES: Array<{ label: string; options: AnnouncementListOptions }> = [
  { label: "no filters", options: { page: 1, pageSize: 10, scope: "visible", userRole: "member" } },
  { label: "keyword", options: { page: 1, pageSize: 10, q: "ribbon", scope: "visible", userRole: "member" } },
  {
    label: "keyword across title/summary boundary",
    options: { page: 1, pageSize: 10, q: "release notes", scope: "visible", userRole: "member" }
  },
  { label: "json punctuation keyword", options: { page: 1, pageSize: 10, q: ",", scope: "visible", userRole: "member" } },
  {
    label: "manage scope inverted window upcoming",
    options: { page: 1, pageSize: 10, status: "即将开始", scope: "manage", userRole: "admin" }
  },
  { label: "type filter", options: { page: 1, pageSize: 10, type: "安全提醒", scope: "visible", userRole: "member" } },
  { label: "time 7d", options: { page: 1, pageSize: 10, time: "7d", scope: "visible", userRole: "member" } },
  { label: "time 30d", options: { page: 1, pageSize: 10, time: "30d", scope: "visible", userRole: "member" } },
  ...announcementStatuses.map((status) => ({
    label: `status ${status}`,
    options: { page: 1, pageSize: 10, status, scope: "visible", userRole: "member" } as AnnouncementListOptions
  })),
  { label: "manage scope with status", options: { page: 1, pageSize: 10, status: "已归档", scope: "manage", userRole: "admin" } }
];

describe("D1 announcement SQL pushdown", () => {
  for (const { label, options } of VISIBILITY_CASES) {
    it(`listFeatured matches the JS helper for ${label}`, async () => {
      const { store, sqlite } = createSqliteBackedStore();
      try {
        const expected = getFeaturedAnnouncements(RECORDS, options);
        const actual = await store.announcements.listFeatured(options);
        expect(actual.map((entry) => entry.id)).toEqual(expected.map((entry) => entry.id));
      } finally {
        sqlite.close();
      }
    });

    it(`summary matches the JS helper for ${label}`, async () => {
      const { store, sqlite } = createSqliteBackedStore();
      try {
        const expected = getAnnouncementSummary(RECORDS, options);
        const actual = await store.announcements.summary(options);
        expect(actual).toEqual(expected);
      } finally {
        sqlite.close();
      }
    });
  }

  for (const { label, options } of LIST_CASES) {
    it(`listPage matches the JS helper for ${label}`, async () => {
      const { store, sqlite } = createSqliteBackedStore();
      try {
        // filterAnnouncements returns the full filtered list; the expected page
        // must apply the same pagination the SQL LIMIT/OFFSET implements.
        const expected = filterAnnouncements(RECORDS, options);
        const expectedPage = paginateAnnouncements(expected, options);
        const actual = await store.announcements.listPage(options);
        expect(actual.announcements.map((entry) => entry.id)).toEqual(expectedPage.map((entry) => entry.id));
        expect(actual.total).toBe(expected.length);
      } finally {
        sqlite.close();
      }
    });
  }

  it("paginates without loading the whole table", async () => {
    const { store, sqlite } = createSqliteBackedStore();
    try {
      const pageOne = await store.announcements.listPage({ page: 1, pageSize: 3, scope: "visible", userRole: "member" });
      const pageTwo = await store.announcements.listPage({ page: 2, pageSize: 3, scope: "visible", userRole: "member" });
      expect(pageOne.announcements).toHaveLength(3);
      expect(pageTwo.announcements.every((entry) => !pageOne.announcements.some((p) => p.id === entry.id))).toBe(true);
      expect(pageOne.total).toBe(pageTwo.total);
    } finally {
      sqlite.close();
    }
  });

  it("matches keywords containing % literally, matching the JS helper", async () => {
    // instr() has no wildcard semantics: a keyword like "50%" must match rows
    // containing a literal "50%". Escaping (as a LIKE pattern would) would
    // regress this to zero matches.
    const { store, sqlite } = createSqliteBackedStore();
    try {
      sqlite
        .prepare(
          "INSERT INTO announcements (id, title, summary, type, status, audience, priority, author_user_id, author_label, tags_json, pinned, start_at, end_at, published_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run(
          "ann-percent",
          "折扣 50% 限时",
          "维护说明摘要",
          "产品更新",
          "已发布",
          "全部成员",
          "中",
          null,
          "系统",
          "[]",
          0,
          null,
          null,
          iso(-3),
          iso(0)
        );
      const result = await store.announcements.listPage({
        page: 1,
        pageSize: 10,
        q: "50%",
        scope: "visible",
        userRole: "member"
      });
      expect(result.total).toBe(1);
      expect(result.announcements[0]?.id).toBe("ann-percent");
    } finally {
      sqlite.close();
    }
  });
});
