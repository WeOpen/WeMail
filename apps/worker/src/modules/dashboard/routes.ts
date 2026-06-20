import type { Hono } from "hono";

import type { AppContext } from "../../app/context";
import { requireUser } from "../../app/context";
import { jsonError } from "../../app/services/audit-service";
import { getResolvedApiDailyLimit, getResolvedOutboundLimit } from "../../app/services/config-service";
import type { AppStore, MailboxDetailRecord, OutboundMessageRecord, PersistedMessageRecord, UserRecord } from "../../core/bindings";

const DARK_TONE = "#111827";
const ACCENT_TONE = "#ff7a00";
const SOFT_ACCENT_TONE = "#ffcf99";
const DAY_MS = 24 * 60 * 60 * 1000;

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function countBetween<T>(records: T[], resolveTime: (record: T) => string | null | undefined, start: Date, end: Date) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return records.filter((record) => {
    const value = resolveTime(record);
    if (!value) return false;
    const time = new Date(value).getTime();
    return Number.isFinite(time) && time >= startTime && time < endTime;
  }).length;
}

function buildWeekGrowth(users: UserRecord[], mailboxes: MailboxDetailRecord[]) {
  const today = startOfDay(new Date());
  const labels = ["4 天前", "3 天前", "前天", "昨天", "今天"];

  return labels.map((label, index) => {
    const start = new Date(today.getTime() - (labels.length - 1 - index) * DAY_MS);
    const end = new Date(start.getTime() + DAY_MS);
    return {
      label,
      accounts: countBetween(users, (user) => user.createdAt, start, end),
      mailboxes: countBetween(mailboxes, (mailbox) => mailbox.createdAt, start, end)
    };
  });
}

function buildMonthGrowth(users: UserRecord[], mailboxes: MailboxDetailRecord[]) {
  const today = startOfDay(new Date());
  const windowStart = new Date(today.getTime() - 27 * DAY_MS);

  return Array.from({ length: 4 }, (_, index) => {
    const start = new Date(windowStart.getTime() + index * 7 * DAY_MS);
    const end = index === 3 ? new Date(today.getTime() + DAY_MS) : new Date(start.getTime() + 7 * DAY_MS);
    return {
      label: `第 ${index + 1} 周`,
      accounts: countBetween(users, (user) => user.createdAt, start, end),
      mailboxes: countBetween(mailboxes, (mailbox) => mailbox.createdAt, start, end)
    };
  });
}

function buildYearGrowth(users: UserRecord[], mailboxes: MailboxDetailRecord[]) {
  const currentMonth = startOfMonth(new Date());

  return Array.from({ length: 6 }, (_, index) => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - (5 - index), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    return {
      label: `${start.getMonth() + 1} 月`,
      accounts: countBetween(users, (user) => user.createdAt, start, end),
      mailboxes: countBetween(mailboxes, (mailbox) => mailbox.createdAt, start, end)
    };
  });
}

function buildTrendSeries(inboundMessages: PersistedMessageRecord[], outboundMessages: OutboundMessageRecord[]) {
  const today = startOfDay(new Date());
  const labels = ["4 天前", "3 天前", "前天", "昨天", "今天"];

  return labels.map((label, index) => {
    const start = new Date(today.getTime() - (labels.length - 1 - index) * DAY_MS);
    const end = new Date(start.getTime() + DAY_MS);
    return {
      day: label,
      inbound: countBetween(inboundMessages, (message) => message.receivedAt, start, end),
      outbound: countBetween(outboundMessages, (message) => message.createdAt, start, end)
    };
  });
}

async function getVisibleMailboxes(store: AppStore, user: { id: string; role: UserRecord["role"] }) {
  if (user.role === "admin") {
    const result = await store.mailboxes.listAllWithDetails({ page: 1, pageSize: 500 });
    return result.accounts;
  }

  const mailboxes = await store.mailboxes.listByUser(user.id);
  const details = await Promise.all(mailboxes.map((mailbox) => store.mailboxes.findDetailById(mailbox.id)));
  return details.filter((mailbox): mailbox is MailboxDetailRecord => Boolean(mailbox));
}

function buildAccountDistribution(mailboxes: MailboxDetailRecord[]) {
  const total = mailboxes.length;
  const activeCount = mailboxes.filter((mailbox) => mailbox.status === "enabled").length;
  const pendingCount = mailboxes.filter((mailbox) => mailbox.status === "pending").length;
  const pausedCount = Math.max(0, total - activeCount - pendingCount);

  return [
    { label: "活跃账号", value: percent(activeCount, total), tone: DARK_TONE },
    { label: "待激活账号", value: percent(pendingCount, total), tone: ACCENT_TONE },
    { label: "暂停账号", value: percent(pausedCount, total), tone: SOFT_ACCENT_TONE }
  ].filter((slice) => slice.value > 0 || total === 0);
}

function buildUserRoles(adminCount: number, memberCount: number) {
  const total = adminCount + memberCount;
  return [
    { label: "管理员", value: percent(adminCount, total), tone: DARK_TONE },
    { label: "成员", value: percent(memberCount, total), tone: ACCENT_TONE }
  ].filter((slice) => slice.value > 0 || total === 0);
}

export function registerDashboardRoutes(app: Hono<AppContext>) {
  app.get("/api/dashboard", async (c) => {
    const user = requireUser(c);
    if (!user) return jsonError("Authentication required", 401);

    const store = c.get("store");
    const mailboxes = await getVisibleMailboxes(store, user);
    const activeMailboxes = mailboxes.filter((mailbox) => mailbox.status !== "soft_deleted");
    const mailboxIds = activeMailboxes.map((mailbox) => mailbox.id);

    const [
      messageResult,
      outboundResults,
      apiKeys,
      webhookEndpoints,
      announcementSummary,
      featuredAnnouncements,
      invitePage,
      quota,
      userSummary,
      userPage,
      adminCount,
      memberCount
    ] = await Promise.all([
      store.messages.listForMailboxes({ mailboxIds, page: 1, pageSize: 500 }),
      Promise.all(
        mailboxIds.map((mailboxId) =>
          store.outboundMessages.listByMailbox({ mailboxId, page: 1, pageSize: 500 })
        )
      ),
      store.apiKeys.listByUser(user.id),
      store.webhookEndpoints.listByUser(user.id),
      store.announcements.summary({ scope: user.role === "admin" ? "manage" : "visible", userRole: user.role }),
      store.announcements.listFeatured({ scope: user.role === "admin" ? "manage" : "visible", userRole: user.role }),
      user.role === "admin" ? store.invites.listPage({ page: 1, pageSize: 1 }) : Promise.resolve({ available: 0, invites: [], page: 1, pageSize: 1, total: 0 }),
      (async () => {
        const [outboundLimit, apiDailyLimit] = await Promise.all([
          getResolvedOutboundLimit(store, c.env),
          getResolvedApiDailyLimit(store, c.env)
        ]);
        return store.quotas.getByUserId(user.id, outboundLimit, apiDailyLimit);
      })(),
      user.role === "admin" ? store.users.summary() : Promise.resolve({ active: 1, total: 1 }),
      user.role === "admin" ? store.users.list({ page: 1, pageSize: 500 }) : Promise.resolve({ users: [], total: 0, page: 1, pageSize: 500 }),
      user.role === "admin" ? store.users.countActiveByRole("admin") : Promise.resolve(0),
      user.role === "admin" ? store.users.countActiveByRole("member") : Promise.resolve(0)
    ]);
    const outboundTotal = outboundResults.reduce((sum, result) => sum + result.summary.totalCount, 0);
    const outboundSent = outboundResults.reduce((sum, result) => sum + result.summary.sentCount, 0);
    const outboundFailed = outboundResults.reduce((sum, result) => sum + result.summary.failedCount, 0);
    const outboundMessages = outboundResults.flatMap((result) => result.messages);
    const activeApiKeys = apiKeys.filter((key) => !key.revokedAt).length;
    const revokedApiKeys = apiKeys.length - activeApiKeys;
    const enabledWebhookEndpoints = webhookEndpoints.filter((endpoint) => endpoint.enabled).length;
    const publishedAnnouncements = announcementSummary
      .filter((item) => item.label !== "已归档")
      .reduce((sum, item) => sum + item.value, 0);

    return c.json({
      kpis: [
        {
          kicker: "今日收件",
          label: "收件总量",
          value: formatNumber(messageResult.total),
          detail: "当前可见邮箱收件总量",
          change: "较昨日 0"
        },
        {
          kicker: "今日发件",
          label: "发件总量",
          value: formatNumber(outboundTotal),
          detail: `平均成功率 ${outboundTotal > 0 ? ((outboundSent / outboundTotal) * 100).toFixed(1) : "0.0"}%`,
          change: `失败重试 ${formatNumber(outboundFailed)} 次`
        },
        {
          kicker: "API 密钥数",
          label: "活跃密钥",
          value: formatNumber(activeApiKeys),
          detail: `${formatNumber(activeApiKeys)} 个正在使用`,
          change: `${formatNumber(revokedApiKeys)} 个已停用`
        },
        {
          kicker: "Webhook",
          label: "投递端点",
          value: formatNumber(webhookEndpoints.length),
          detail: `${formatNumber(enabledWebhookEndpoints)} 个正常投递`,
          change: `停用 ${formatNumber(webhookEndpoints.length - enabledWebhookEndpoints)} 个`
        },
        {
          kicker: "公告",
          label: "已发布公告",
          value: formatNumber(publishedAnnouncements),
          detail: `${formatNumber(featuredAnnouncements.length)} 条正在展示`,
          change: `状态合计 ${formatNumber(publishedAnnouncements)} 条`
        }
      ],
      trend: {
        week: buildTrendSeries(messageResult.messages, outboundMessages),
        month: [{ day: "本月", inbound: messageResult.total, outbound: outboundTotal }],
        year: [{ day: "今年", inbound: messageResult.total, outbound: outboundTotal }]
      },
      accountDistribution: buildAccountDistribution(activeMailboxes),
      accountTotal: activeMailboxes.length,
      resources: [
        {
          label: "可用邀请码",
          value: `${formatNumber(invitePage.available)} 个`,
          detail: `共 ${formatNumber(invitePage.total)} 个邀请码`,
          progress: clampPercent(percent(invitePage.available, Math.max(invitePage.total, 1))),
          tone: DARK_TONE
        },
        {
          label: "默认配额池",
          value: `${formatNumber(quota.dailyLimit)} / 天`,
          detail: `今日已用 ${formatNumber(quota.sendsToday)}`,
          progress: clampPercent(percent(quota.sendsToday, Math.max(quota.dailyLimit, 1))),
          tone: ACCENT_TONE
        }
      ],
      growth: {
        week: buildWeekGrowth(userPage.users, activeMailboxes),
        month: buildMonthGrowth(userPage.users, activeMailboxes),
        year: buildYearGrowth(userPage.users, activeMailboxes)
      },
      userRoles: user.role === "admin" ? buildUserRoles(adminCount, memberCount) : [],
      userTotal: user.role === "admin" ? userSummary.total : 0,
      featureToggles: c.get("featureToggles")
    });
  });
}
