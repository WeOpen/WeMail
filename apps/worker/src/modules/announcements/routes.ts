import type { Hono } from "hono";

import type { AppContext } from "../../app/context";
import { requireSessionAuth, requireUser } from "../../app/context";
import { jsonError, recordAudit } from "../../app/services/audit-service";

function announcementJson(record: Awaited<ReturnType<AppContext["Variables"]["store"]["announcements"]["create"]>>) {
  return {
    id: record.id,
    title: record.title,
    summary: record.summary,
    type: record.type,
    status: record.status,
    audience: record.audience,
    priority: record.priority,
    author: record.authorLabel,
    tags: JSON.parse(record.tagsJson) as string[],
    pinned: record.pinned,
    startAt: record.startAt,
    endAt: record.endAt,
    publishedAt: record.publishedAt,
    updatedAt: record.updatedAt
  };
}

export function registerAnnouncementsRoutes(app: Hono<AppContext>) {
  app.get("/api/announcements", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);
    const announcements = await c.get("store").announcements.list();
    return c.json({ announcements: announcements.map(announcementJson) });
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
    if (!payload.title || !payload.summary) return jsonError("title and summary are required", 400);
    const announcement = await c.get("store").announcements.create({
      title: payload.title,
      summary: payload.summary,
      type: payload.type ?? "产品更新",
      status: payload.status ?? "已发布",
      audience: payload.audience ?? "全部成员",
      priority: payload.priority ?? "中",
      authorUserId: user.id,
      authorLabel: user.email,
      tagsJson: JSON.stringify(payload.tags ?? []),
      pinned: payload.pinned ?? false,
      startAt: payload.startAt ?? null,
      endAt: payload.endAt ?? null
    });
    await recordAudit(c.get("store"), "user", user.id, "announcement-create", { announcementId: announcement.id });
    return c.json({ announcement: announcementJson(announcement) }, 201);
  });
}
