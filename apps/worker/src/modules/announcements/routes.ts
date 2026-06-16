import type { Context, Hono } from "hono";

import type { AppContext } from "../../app/context";
import type { AnnouncementListScope } from "../../core/bindings";
import { requireSessionAuth, requireUser } from "../../app/context";
import { jsonError, recordAudit } from "../../app/services/audit-service";
import {
  announcementAudiences,
  announcementPriorities,
  announcementStatuses,
  announcementTypes,
  getAnnouncementAudienceRole,
  isAnnouncementVisible,
  resolveAnnouncementStatus
} from "../../shared/announcements";

const announcementPageSizes = new Set([3, 4, 5, 10, 20, 50]);

type AnnouncementRecord = Awaited<ReturnType<AppContext["Variables"]["store"]["announcements"]["create"]>>;
type AnnouncementReceiptRecord = Awaited<ReturnType<AppContext["Variables"]["store"]["announcements"]["acknowledge"]>>;

type AnnouncementJsonContext = {
  eligibleCounts: {
    admin: number;
    all: number;
    member: number;
  };
  now: Date;
  receiptCounts: Record<string, number>;
  receiptsByAnnouncementId: Map<string, AnnouncementReceiptRecord>;
};

function announcementJson(record: AnnouncementRecord, context: AnnouncementJsonContext) {
  const receipt = context.receiptsByAnnouncementId.get(record.id) ?? null;
  const signed = context.receiptCounts[record.id] ?? 0;
  const audienceRole = getAnnouncementAudienceRole(record.audience);
  const eligibleUserCount = audienceRole ? context.eligibleCounts[audienceRole] : context.eligibleCounts.all;
  const unsigned = Math.max(eligibleUserCount - signed, 0);

  return {
    id: record.id,
    title: record.title,
    summary: record.summary,
    type: record.type,
    status: resolveAnnouncementStatus(record, context.now),
    audience: record.audience,
    priority: record.priority,
    author: record.authorLabel,
    tags: JSON.parse(record.tagsJson) as string[],
    pinned: record.pinned,
    startAt: record.startAt,
    endAt: record.endAt,
    acknowledgedAt: receipt?.acknowledgedAt ?? null,
    receiptStatus: receipt ? "已签收" : "未签收",
    receiptSummary: {
      signed,
      unsigned
    },
    publishedAt: record.publishedAt,
    updatedAt: record.updatedAt
  };
}

async function buildAnnouncementJson(
  c: Context<AppContext>,
  records: AnnouncementRecord[],
  userId: string
) {
  const now = new Date();
  const announcementIds = records.map((record) => record.id);
  const [receipts, receiptCounts, allUserCount, adminUserCount, memberUserCount] = await Promise.all([
    c.get("store").announcements.listReceiptsByUser(userId, announcementIds),
    c.get("store").announcements.countReceipts(announcementIds),
    c.get("store").users.countActiveByRole(),
    c.get("store").users.countActiveByRole("admin"),
    c.get("store").users.countActiveByRole("member")
  ]);
  const receiptsByAnnouncementId = new Map(receipts.map((receipt) => [receipt.announcementId, receipt]));

  return records.map((record) =>
    announcementJson(record, {
      eligibleCounts: {
        admin: adminUserCount,
        all: allUserCount,
        member: memberUserCount
      },
      now,
      receiptCounts,
      receiptsByAnnouncementId
    })
  );
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.trunc(parsed);
}

function parseAnnouncementPageSize(value: string | undefined) {
  const parsed = parsePositiveInteger(value, 4);
  if (announcementPageSizes.has(parsed)) return parsed;
  if (parsed > 50) return 50;
  return 4;
}

function parseAnnouncementScope(userRole: "admin" | "member", value: string | undefined): AnnouncementListScope {
  return value === "manage" && userRole === "admin" ? "manage" : "visible";
}

function parseOptionalFilter(value: string | undefined) {
  if (!value || value === "all") return undefined;
  return value;
}

function parseAnnouncementTimeFilter(value: string | undefined) {
  return value === "7d" || value === "30d" ? value : undefined;
}

function isValidDateValue(value: string | null | undefined) {
  if (value === null || value === undefined || value === "") return true;
  return !Number.isNaN(new Date(value).getTime());
}

function hasValidDateWindow(startAt: string | null | undefined, endAt: string | null | undefined) {
  if (!startAt || !endAt) return true;
  const startTime = new Date(startAt).getTime();
  const endTime = new Date(endAt).getTime();
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) return false;
  return startTime <= endTime;
}

function normalizeTags(tags: unknown) {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function validateEnumValue(value: string | undefined, allowedValues: readonly string[], label: string) {
  if (!value) return null;
  return allowedValues.includes(value) ? null : `${label} is invalid`;
}

export function registerAnnouncementsRoutes(app: Hono<AppContext>) {
  app.get("/api/announcements", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    if (!c.req.query("page") && !c.req.query("pageSize")) {
      const visibilityOptions = {
        scope: parseAnnouncementScope(user.role, c.req.query("scope")),
        userRole: user.role
      };
      const result = await c.get("store").announcements.listPage({
        page: 1,
        pageSize: 50,
        ...visibilityOptions
      });
      const [announcementPayload, featuredAnnouncements, summary] = await Promise.all([
        buildAnnouncementJson(c, result.announcements, user.id),
        c.get("store").announcements.listFeatured(visibilityOptions).then((records) => buildAnnouncementJson(c, records, user.id)),
        c.get("store").announcements.summary(visibilityOptions)
      ]);
      return c.json({
        announcements: announcementPayload,
        featuredAnnouncements,
        page: 1,
        pageSize: result.pageSize,
        summary,
        total: result.total
      });
    }
    const visibilityOptions = {
      scope: parseAnnouncementScope(user.role, c.req.query("scope")),
      userRole: user.role
    };
    const result = await c.get("store").announcements.listPage({
      page: parsePositiveInteger(c.req.query("page"), 1),
      pageSize: parseAnnouncementPageSize(c.req.query("pageSize")),
      q: parseOptionalFilter(c.req.query("q")),
      status: parseOptionalFilter(c.req.query("status")),
      time: parseAnnouncementTimeFilter(c.req.query("time")),
      type: parseOptionalFilter(c.req.query("type")),
      ...visibilityOptions
    });
    const [announcementPayload, featuredAnnouncements, summary] = await Promise.all([
      buildAnnouncementJson(c, result.announcements, user.id),
      c.get("store").announcements.listFeatured(visibilityOptions).then((records) => buildAnnouncementJson(c, records, user.id)),
      c.get("store").announcements.summary(visibilityOptions)
    ]);
    return c.json({
      announcements: announcementPayload,
      featuredAnnouncements,
      page: result.page,
      pageSize: result.pageSize,
      summary,
      total: result.total
    });
  });

  app.get("/api/announcements/:id", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const announcement = await c.get("store").announcements.find(c.req.param("id"));
    if (
      !announcement ||
      !isAnnouncementVisible(announcement, {
        scope: parseAnnouncementScope(user.role, c.req.query("scope")),
        userRole: user.role
      })
    ) {
      return jsonError("Announcement not found", 404);
    }
    const [announcementPayload] = await buildAnnouncementJson(c, [announcement], user.id);
    return c.json({ announcement: announcementPayload });
  });

  app.post("/api/announcements", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);
    const payload = (await c.req.json()) as {
      title?: string;
      summary?: string;
      type?: string;
      status?: string;
      audience?: string;
      priority?: string;
      tags?: string[];
      pinned?: boolean;
      startAt?: string | null;
      endAt?: string | null;
    };
    const title = payload.title?.trim();
    const summary = payload.summary?.trim();
    if (!title || !summary) return jsonError("title and summary are required", 400);
    const enumError =
      validateEnumValue(payload.type, announcementTypes, "type") ??
      validateEnumValue(payload.status, announcementStatuses, "status") ??
      validateEnumValue(payload.audience, announcementAudiences, "audience") ??
      validateEnumValue(payload.priority, announcementPriorities, "priority");
    if (enumError) return jsonError(enumError, 400);
    if (!isValidDateValue(payload.startAt) || !isValidDateValue(payload.endAt)) return jsonError("startAt or endAt is invalid", 400);
    if (!hasValidDateWindow(payload.startAt, payload.endAt)) return jsonError("startAt must be before endAt", 400);
    const announcement = await c.get("store").announcements.create({
      title,
      summary,
      type: payload.type ?? "产品更新",
      status: payload.status ?? "已发布",
      audience: payload.audience ?? "全部成员",
      priority: payload.priority ?? "中",
      authorUserId: user.id,
      authorLabel: user.email,
      tagsJson: JSON.stringify(normalizeTags(payload.tags)),
      pinned: payload.pinned ?? false,
      startAt: payload.startAt ?? null,
      endAt: payload.endAt ?? null
    });
    await recordAudit(c.get("store"), "user", user.id, "announcement-create", { announcementId: announcement.id });
    const [announcementPayload] = await buildAnnouncementJson(c, [announcement], user.id);
    return c.json({ announcement: announcementPayload }, 201);
  });

  app.post("/api/announcements/:id/receipt", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const announcement = await c.get("store").announcements.find(c.req.param("id"));
    if (!announcement) return jsonError("Announcement not found", 404);
    if (!isAnnouncementVisible(announcement, { scope: "visible", userRole: user.role })) return jsonError("Announcement not found", 404);
    await c.get("store").announcements.acknowledge(announcement.id, user.id);
    await recordAudit(c.get("store"), "user", user.id, "announcement-receipt", { announcementId: announcement.id });
    const [announcementPayload] = await buildAnnouncementJson(c, [announcement], user.id);
    return c.json({ announcement: announcementPayload });
  });

  app.patch("/api/announcements/:id", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);
    const payload = (await c.req.json()) as {
      title?: string;
      summary?: string;
      type?: string;
      status?: string;
      audience?: string;
      priority?: string;
      tags?: string[];
      pinned?: boolean;
      startAt?: string | null;
      endAt?: string | null;
    };
    const existing = await c.get("store").announcements.find(c.req.param("id"));
    if (!existing) return jsonError("Announcement not found", 404);
    const enumError =
      validateEnumValue(payload.type, announcementTypes, "type") ??
      validateEnumValue(payload.status, announcementStatuses, "status") ??
      validateEnumValue(payload.audience, announcementAudiences, "audience") ??
      validateEnumValue(payload.priority, announcementPriorities, "priority");
    if (enumError) return jsonError(enumError, 400);
    const update: Partial<Omit<AnnouncementRecord, "id" | "publishedAt" | "updatedAt" | "authorUserId" | "authorLabel">> = {};
    if ("title" in payload) {
      const title = payload.title?.trim();
      if (!title) return jsonError("title is required", 400);
      update.title = title;
    }
    if ("summary" in payload) {
      const summary = payload.summary?.trim();
      if (!summary) return jsonError("summary is required", 400);
      update.summary = summary;
    }
    if ("type" in payload && payload.type) update.type = payload.type;
    if ("status" in payload && payload.status) update.status = payload.status;
    if ("audience" in payload && payload.audience) update.audience = payload.audience;
    if ("priority" in payload && payload.priority) update.priority = payload.priority;
    if ("tags" in payload) update.tagsJson = JSON.stringify(normalizeTags(payload.tags));
    if ("pinned" in payload) update.pinned = payload.pinned ?? false;
    if ("startAt" in payload) update.startAt = payload.startAt ?? null;
    if ("endAt" in payload) update.endAt = payload.endAt ?? null;
    const nextStartAt = "startAt" in update ? update.startAt : existing.startAt;
    const nextEndAt = "endAt" in update ? update.endAt : existing.endAt;
    if (!isValidDateValue(nextStartAt) || !isValidDateValue(nextEndAt)) return jsonError("startAt or endAt is invalid", 400);
    if (!hasValidDateWindow(nextStartAt, nextEndAt)) return jsonError("startAt must be before endAt", 400);

    const announcement = await c.get("store").announcements.update(c.req.param("id"), update);
    if (!announcement) return jsonError("Announcement not found", 404);
    await recordAudit(c.get("store"), "user", user.id, "announcement-update", { announcementId: announcement.id });
    const [announcementPayload] = await buildAnnouncementJson(c, [announcement], user.id);
    return c.json({ announcement: announcementPayload });
  });

  app.delete("/api/announcements/:id", async (c) => {
    const user = requireUser(c);
    if (!user || user.role !== "admin" || !requireSessionAuth(c)) return jsonError("Admin session required", 403);
    const deleted = await c.get("store").announcements.delete(c.req.param("id"));
    if (!deleted) return jsonError("Announcement not found", 404);
    await recordAudit(c.get("store"), "user", user.id, "announcement-delete", { announcementId: c.req.param("id") });
    return c.body(null, 204);
  });
}
