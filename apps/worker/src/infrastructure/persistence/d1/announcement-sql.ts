// ---------------------------------------------------------------------------
// Announcement SQL pushdown.
//
// The WHERE fragments below must stay semantically identical to
// src/shared/announcements.ts (isAnnouncementVisible + matchesAnnouncementFilters).
// ISO-8601 text compares lexicographically == chronologically in SQLite.
// Manage scope + admin bypasses every check *including* the archived
// exclusion, exactly like isAnnouncementVisible.
// ---------------------------------------------------------------------------

import { DAY_MS, nowIso } from "./shared";

// ---------------------------------------------------------------------------
// Announcement SQL pushdown.
//
// The WHERE fragments below must stay semantically identical to
// src/shared/announcements.ts (isAnnouncementVisible + matchesAnnouncementFilters).
// ISO-8601 text compares lexicographically == chronologically in SQLite.
// Manage scope + admin bypasses every check *including* the archived
// exclusion, exactly like isAnnouncementVisible.
// ---------------------------------------------------------------------------

export type AnnouncementSqlFilter = {
  whereSql: string;
  params: (string | number)[];
};

function buildAnnouncementStatusPredicate(status: string) {
  // Mirrors resolveAnnouncementStatus branch-for-branch for non-archived rows.
  if (status === "已发布") {
    return "(status <> '已归档' AND start_at IS NULL AND end_at IS NULL)";
  }
  if (status === "即将开始") {
    return "(status <> '已归档' AND start_at IS NOT NULL AND start_at > ? AND (end_at IS NULL OR end_at >= ?))";
  }
  if (status === "已结束") {
    return "(status <> '已归档' AND end_at IS NOT NULL AND end_at < ?)";
  }
  if (status === "进行中") {
    return (
      "(status <> '已归档' AND (start_at IS NOT NULL OR end_at IS NOT NULL) AND " +
      "(start_at IS NULL OR start_at <= ?) AND (end_at IS NULL OR end_at >= ?))"
    );
  }
  return "(status = ?)";
}

function buildAnnouncementVisibilityPredicate(
  scope: "visible" | "manage" | undefined,
  userRole: "admin" | "member" | undefined,
  nowIsoValue: string
) {
  if (scope === "manage" && userRole === "admin") {
    return { sql: "1 = 1", params: [] as (string | number)[] };
  }
  const parts: string[] = ["status <> '已归档'"];
  const params: (string | number)[] = [];
  if (!userRole) {
    return { sql: "1 = 0", params };
  }
  // isAnnouncementAudienceVisible: 管理员→admin, 普通成员→member, else all.
  parts.push("(audience NOT IN ('管理员', '普通成员') OR audience = ?)");
  params.push(userRole === "admin" ? "管理员" : "普通成员");
  // isWithinPublishWindow (non-null dates are always valid per JS parse).
  parts.push("(start_at IS NULL OR start_at <= ?) AND (end_at IS NULL OR end_at >= ?)");
  params.push(nowIsoValue, nowIsoValue);
  return { sql: parts.join(" AND "), params };
}

export function buildAnnouncementFilter(options: {
  q?: string;
  scope?: "visible" | "manage";
  status?: string;
  time?: "7d" | "30d";
  type?: string;
  userRole?: "admin" | "member";
}): AnnouncementSqlFilter {
  const nowIsoValue = nowIso();
  const parts: string[] = [];
  const params: (string | number)[] = [];

  const visibility = buildAnnouncementVisibilityPredicate(options.scope, options.userRole, nowIsoValue);
  parts.push(visibility.sql);
  params.push(...visibility.params);

  const keyword = options.q?.trim().toLowerCase();
  if (keyword) {
    // instr() is a plain substring search with no wildcard metacharacters, so
    // the keyword is bound as-is; escaping (as a LIKE pattern would need) would
    // wrongly hide rows containing literal %, _, or \.
    parts.push(
      "(instr(lower(title), ?) > 0 OR instr(lower(summary), ?) > 0 OR instr(lower(tags_json), ?) > 0)"
    );
    params.push(keyword, keyword, keyword);
  }

  if (options.type) {
    parts.push("type = ?");
    params.push(options.type);
  }

  if (options.status) {
    const statusPredicate = buildAnnouncementStatusPredicate(options.status);
    parts.push(statusPredicate);
    if (statusPredicate === "(status = ?)") {
      params.push(options.status);
    } else {
      // 进行中 / 即将开始 / 已结束 reference `now` once or twice.
      const nowCount = (statusPredicate.match(/\?/g) ?? []).length;
      for (let i = 0; i < nowCount; i += 1) params.push(nowIsoValue);
    }
  }

  if (options.time) {
    const days = options.time === "7d" ? 7 : 30;
    const cutoff = new Date(Date.now() - days * DAY_MS).toISOString();
    parts.push("published_at >= ?");
    params.push(cutoff);
  }

  return { whereSql: `WHERE ${parts.join(" AND ")}`, params };
}
