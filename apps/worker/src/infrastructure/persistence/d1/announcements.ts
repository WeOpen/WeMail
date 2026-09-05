import type { D1Database } from "@cloudflare/workers-types";
import { announcementStatuses } from "../../../shared/announcements";
import type { AppStore } from "../../../core/bindings";
import { buildAnnouncementFilter } from "./announcement-sql";
import { toAnnouncementRecord, toAnnouncementReceiptRecord } from "./row-mappers";
import { getSafePage, getSafePageSize, nowIso } from "./shared";

type AnnouncementsAggregate = Pick<AppStore, "announcements">;

export function createAnnouncementsAggregate(db: D1Database): AnnouncementsAggregate {
  return {
    announcements: {
      async list() {
        const result = await db.prepare("SELECT * FROM announcements ORDER BY pinned DESC, published_at DESC").all();
        return (result.results ?? []).map(toAnnouncementRecord);
      },
      async listPage(options) {
        const page = getSafePage(options.page);
        const pageSize = getSafePageSize(options.pageSize);
        // Filtering and pagination are pushed into SQL; the JS helpers in
        // shared/announcements.ts remain the source of truth for semantics and
        // are exercised against the in-memory store in tests.
        const filter = buildAnnouncementFilter(options);
        const baseParams = [...filter.params];
        const countResult = await db
          .prepare(`SELECT COUNT(*) AS count FROM announcements ${filter.whereSql}`)
          .bind(...baseParams)
          .first<{ count: number }>();
        const rows = await db
          .prepare(
            `SELECT * FROM announcements ${filter.whereSql} ORDER BY pinned DESC, published_at DESC LIMIT ? OFFSET ?`
          )
          .bind(...baseParams, pageSize, (page - 1) * pageSize)
          .all();
        return {
          announcements: (rows.results ?? []).map(toAnnouncementRecord),
          total: countResult?.count ?? 0,
          page,
          pageSize
        };
      },
      async listFeatured(options) {
        const filter = buildAnnouncementFilter(options);
        const rows = await db
          .prepare(
            `SELECT * FROM announcements ${filter.whereSql} AND pinned = 1 ORDER BY pinned DESC, published_at DESC`
          )
          .bind(...filter.params)
          .all();
        return (rows.results ?? []).map(toAnnouncementRecord);
      },
      async summary(options) {
        // Group the derived status in SQL with the same predicates the JS
        // resolver uses, falling back to the stored status for 已归档. Branch
        // order matches resolveAnnouncementStatus: upcoming is decided by
        // start_at alone, before the ended check.
        const filter = buildAnnouncementFilter(options);
        const nowIsoValue = nowIso();
        const rows = await db
          .prepare(
            `SELECT
              CASE
                WHEN status = '已归档' THEN '已归档'
                WHEN start_at IS NOT NULL AND start_at > ? THEN '即将开始'
                WHEN end_at IS NOT NULL AND end_at < ? THEN '已结束'
                WHEN start_at IS NULL AND end_at IS NULL THEN '已发布'
                ELSE '进行中'
              END AS derived_status,
              COUNT(*) AS count
             FROM announcements ${filter.whereSql}
             GROUP BY derived_status`
          )
          .bind(nowIsoValue, nowIsoValue, ...filter.params)
          .all();
        const counts = new Map<string, number>();
        for (const row of (rows.results ?? []) as Array<{ derived_status: string; count: number }>) {
          counts.set(row.derived_status, row.count);
        }
        return announcementStatuses.map((status) => ({ label: status, value: counts.get(status) ?? 0 }));
      },
      async create(input) {
        const now = nowIso();
        const record = { id: crypto.randomUUID(), publishedAt: now, updatedAt: now, ...input };
        await db
          .prepare(
            "INSERT INTO announcements (id, title, summary, type, status, audience, priority, author_user_id, author_label, tags_json, pinned, start_at, end_at, published_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(
            record.id,
            record.title,
            record.summary,
            record.type,
            record.status,
            record.audience,
            record.priority,
            record.authorUserId,
            record.authorLabel,
            record.tagsJson,
            record.pinned ? 1 : 0,
            record.startAt,
            record.endAt,
            record.publishedAt,
            record.updatedAt
          )
          .run();
        return record;
      },
      async find(id) {
        const row = await db.prepare("SELECT * FROM announcements WHERE id = ?").bind(id).first();
        return row ? toAnnouncementRecord(row) : null;
      },
      async update(id, input) {
        const existing = await db.prepare("SELECT * FROM announcements WHERE id = ?").bind(id).first();
        if (!existing) return null;
        const current = toAnnouncementRecord(existing);
        const record = {
          ...current,
          ...input,
          updatedAt: nowIso()
        };
        await db
          .prepare(
            "UPDATE announcements SET title = ?, summary = ?, type = ?, status = ?, audience = ?, priority = ?, tags_json = ?, pinned = ?, start_at = ?, end_at = ?, updated_at = ? WHERE id = ?"
          )
          .bind(
            record.title,
            record.summary,
            record.type,
            record.status,
            record.audience,
            record.priority,
            record.tagsJson,
            record.pinned ? 1 : 0,
            record.startAt,
            record.endAt,
            record.updatedAt,
            id
          )
          .run();
        return record;
      },
      async delete(id) {
        await db.prepare("DELETE FROM announcement_receipts WHERE announcement_id = ?").bind(id).run();
        const result = await db.prepare("DELETE FROM announcements WHERE id = ?").bind(id).run();
        return Number(result.meta.changes ?? 0) > 0;
      },
      async acknowledge(announcementId, userId) {
        const acknowledgedAt = nowIso();
        await db
          .prepare(
            "INSERT INTO announcement_receipts (announcement_id, user_id, acknowledged_at) VALUES (?, ?, ?) ON CONFLICT(announcement_id, user_id) DO UPDATE SET acknowledged_at = excluded.acknowledged_at"
          )
          .bind(announcementId, userId, acknowledgedAt)
          .run();
        return { announcementId, userId, acknowledgedAt };
      },
      async listReceiptsByUser(userId, announcementIds) {
        if (announcementIds.length === 0) return [];
        const placeholders = announcementIds.map(() => "?").join(", ");
        const result = await db
          .prepare(`SELECT * FROM announcement_receipts WHERE user_id = ? AND announcement_id IN (${placeholders})`)
          .bind(userId, ...announcementIds)
          .all();
        return (result.results ?? []).map(toAnnouncementReceiptRecord);
      },
      async countReceipts(announcementIds) {
        if (announcementIds.length === 0) return {};
        const placeholders = announcementIds.map(() => "?").join(", ");
        const result = await db
          .prepare(`SELECT announcement_id, COUNT(*) AS signed FROM announcement_receipts WHERE announcement_id IN (${placeholders}) GROUP BY announcement_id`)
          .bind(...announcementIds)
          .all<{ announcement_id: string; signed: number }>();
        return (result.results ?? []).reduce<Record<string, number>>((counts, row) => {
          counts[row.announcement_id] = Number(row.signed ?? 0);
          return counts;
        }, {});
      }
    }
  };
}
