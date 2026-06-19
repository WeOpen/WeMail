import type {
  AnnouncementListOptions,
  AnnouncementRecord,
  AnnouncementSummaryItem,
  AnnouncementVisibilityOptions,
  UserRecord
} from "../core/bindings";

export const announcementAudiences = ["全部成员", "管理员", "普通成员"] as const;
export const announcementPriorities = ["高", "中", "低"] as const;
export const announcementStatuses = ["已发布", "进行中", "即将开始", "已结束", "已归档"] as const;
export const announcementTypes = ["产品更新", "维护通知", "运营通知", "安全提醒"] as const;

const oneDayMs = 24 * 60 * 60 * 1000;

export function getAnnouncementAudienceRole(audience: string): UserRecord["role"] | null {
  if (audience === "管理员") return "admin";
  if (audience === "普通成员") return "member";
  return null;
}

export function isAnnouncementAudienceVisible(audience: string, userRole: UserRecord["role"]) {
  const audienceRole = getAnnouncementAudienceRole(audience);
  return !audienceRole || audienceRole === userRole;
}

function isWithinPublishWindow(record: AnnouncementRecord, now: Date) {
  const nowTime = now.getTime();
  const startTime = record.startAt ? new Date(record.startAt).getTime() : null;
  const endTime = record.endAt ? new Date(record.endAt).getTime() : null;

  if (startTime !== null && !Number.isNaN(startTime) && startTime > nowTime) return false;
  if (endTime !== null && !Number.isNaN(endTime) && endTime < nowTime) return false;
  return true;
}

export function resolveAnnouncementStatus(record: AnnouncementRecord, now = new Date()) {
  if (record.status === "已归档") return "已归档";

  const nowTime = now.getTime();
  const startTime = record.startAt ? new Date(record.startAt).getTime() : null;
  const endTime = record.endAt ? new Date(record.endAt).getTime() : null;
  const hasStartTime = startTime !== null && !Number.isNaN(startTime);
  const hasEndTime = endTime !== null && !Number.isNaN(endTime);

  if (hasStartTime && startTime > nowTime) return "即将开始";
  if (hasEndTime && endTime < nowTime) return "已结束";
  if (hasStartTime || hasEndTime) return "进行中";
  return "已发布";
}

export function isAnnouncementVisible(record: AnnouncementRecord, options: AnnouncementVisibilityOptions, now = new Date()) {
  if (options.scope === "manage" && options.userRole === "admin") return true;
  if (record.status === "已归档") return false;
  if (!options.userRole || !isAnnouncementAudienceVisible(record.audience, options.userRole)) return false;
  return isWithinPublishWindow(record, now);
}

export function compareAnnouncements(left: AnnouncementRecord, right: AnnouncementRecord) {
  if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
  return right.publishedAt.localeCompare(left.publishedAt);
}

function matchesAnnouncementFilters(record: AnnouncementRecord, options: AnnouncementListOptions, now = new Date()) {
  if (!isAnnouncementVisible(record, options, now)) return false;

  const keyword = options.q?.trim().toLowerCase();
  if (keyword) {
    const tags = parseAnnouncementTags(record.tagsJson).join(" ");
    const searchableText = `${record.title} ${record.summary} ${tags}`.toLowerCase();
    if (!searchableText.includes(keyword)) return false;
  }

  if (options.type && record.type !== options.type) return false;
  if (options.status && resolveAnnouncementStatus(record, now) !== options.status) return false;

  if (options.time) {
    const publishedTime = new Date(record.publishedAt).getTime();
    const days = options.time === "7d" ? 7 : 30;
    if (!Number.isNaN(publishedTime) && now.getTime() - publishedTime > days * oneDayMs) return false;
  }

  return true;
}

export function filterAnnouncements(records: AnnouncementRecord[], options: AnnouncementListOptions, now = new Date()) {
  return records.filter((record) => matchesAnnouncementFilters(record, options, now)).sort(compareAnnouncements);
}

export function filterVisibleAnnouncements(records: AnnouncementRecord[], options: AnnouncementVisibilityOptions, now = new Date()) {
  return records.filter((record) => isAnnouncementVisible(record, options, now)).sort(compareAnnouncements);
}

export function getFeaturedAnnouncements(records: AnnouncementRecord[], options: AnnouncementVisibilityOptions, now = new Date()) {
  return filterVisibleAnnouncements(records, options, now).filter((record) => record.pinned);
}

export function getAnnouncementSummary(records: AnnouncementRecord[], options: AnnouncementVisibilityOptions, now = new Date()) {
  const counts = filterVisibleAnnouncements(records, options, now).reduce<Record<string, number>>((summary, record) => {
    const status = resolveAnnouncementStatus(record, now);
    summary[status] = (summary[status] ?? 0) + 1;
    return summary;
  }, {});

  return announcementStatuses.reduce<AnnouncementSummaryItem[]>((summary, status) => {
    const value = counts[status] ?? 0;
    summary.push({ label: status, value });
    return summary;
  }, []);
}

export function paginateAnnouncements(records: AnnouncementRecord[], options: AnnouncementListOptions) {
  const startIndex = (options.page - 1) * options.pageSize;
  return records.slice(startIndex, startIndex + options.pageSize);
}

export function parseAnnouncementTags(tagsJson: string) {
  try {
    const parsed = JSON.parse(tagsJson) as unknown;
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : [];
  } catch {
    return [];
  }
}
