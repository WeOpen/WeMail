import type {
  AdminAuditEventSummary,
  CommercialModelSummary,
  AdminGovernanceSummary,
  AdminLoginHistoryEvent,
  AdminRateLimitPolicySummary,
  PlanTierSummary,
  UserRole,
  UserStatus
} from "@wemail/shared";

import type { AppBindings, AppStore, AuditEventRecord, InviteRecord, PageListOptions, UserListOptions, UserRecord } from "../../core/bindings";
import { hashPassword } from "../../shared/auth";
import { jsonError, recordAudit } from "../services/audit-service";
import { getResolvedApiDailyLimit, getResolvedOutboundLimit } from "../services/config-service";
import { getRuntimeSettings } from "../services/runtime-settings-service";

type AdminUseCaseContext = {
  store: AppStore;
  env: AppBindings;
};

export async function listAdminUsers(context: AdminUseCaseContext, options: UserListOptions) {
  const result = await context.store.users.list(options);
  return {
    users: result.users.map(toAdminUserSummary),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize
  };
}

export async function getAdminUserSettingsSummary(context: AdminUseCaseContext, options: PageListOptions = { page: 1, pageSize: 5 }) {
  const stats = await context.store.users.summary();
  const quotaUsers = await context.store.users.list(options);

  return {
    quotaUsers: quotaUsers.users.map(toAdminUserSummary),
    quotaUsersPage: quotaUsers.page,
    quotaUsersPageSize: quotaUsers.pageSize,
    quotaUsersTotal: quotaUsers.total,
    stats
  };
}

function toAdminUserSummary(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export async function createAdminUserUseCase(
  context: AdminUseCaseContext,
  payload: { actorUserId: string; email: string; name: string; password: string; role: UserRole }
) {
  if (await context.store.users.findByEmail(payload.email)) return jsonError("User already exists", 409);

  const user = await context.store.users.create({
    email: payload.email,
    name: payload.name,
    passwordHash: await hashPassword(payload.password),
    role: payload.role
  });

  const [apiDailyLimit, dailyLimit] = await Promise.all([
    getResolvedApiDailyLimit(context.store, context.env),
    getResolvedOutboundLimit(context.store, context.env)
  ]);
  await context.store.quotas.save({
    userId: user.id,
    apiDailyLimit,
    apiCallsToday: 0,
    dailyLimit,
    sendsToday: 0,
    disabled: false,
    updatedAt: new Date().toISOString()
  });
  await recordAudit(context.store, "user", payload.actorUserId, "user-create", {
    userId: user.id,
    role: user.role
  });

  return toAdminUserSummary(user);
}

export async function updateUserRoleUseCase(
  context: AdminUseCaseContext,
  payload: { actorUserId: string; userId: string; role: UserRole }
) {
  const user = await context.store.users.updateRole(payload.userId, payload.role);
  if (!user) return jsonError("User not found", 404);

  await recordAudit(context.store, "user", payload.actorUserId, "user-role-update", {
    userId: user.id,
    role: user.role
  });

  return toAdminUserSummary(user);
}

export async function updateUserProfileUseCase(
  context: AdminUseCaseContext,
  payload: { actorUserId: string; userId: string; name?: string; role?: UserRole }
) {
  let user = await context.store.users.findById(payload.userId);
  if (!user) return jsonError("User not found", 404);

  if (payload.name) {
    user = await context.store.users.updateProfile(payload.userId, { name: payload.name });
  }
  if (payload.role) {
    user = await context.store.users.updateRole(payload.userId, payload.role);
  }
  if (!user) return jsonError("User not found", 404);

  await recordAudit(context.store, "user", payload.actorUserId, "user-update", {
    userId: user.id,
    name: user.name,
    role: user.role
  });

  return toAdminUserSummary(user);
}

export async function resetUserPasswordUseCase(
  context: AdminUseCaseContext,
  payload: { actorUserId: string; userId: string; password: string }
) {
  const user = await context.store.users.updatePasswordHash(payload.userId, await hashPassword(payload.password));
  if (!user) return jsonError("User not found", 404);
  await context.store.sessions.deleteByUserId(payload.userId);
  await recordAudit(context.store, "user", payload.actorUserId, "user-password-reset", { userId: user.id });
  return toAdminUserSummary(user);
}

export async function updateUserStatusUseCase(
  context: AdminUseCaseContext,
  payload: { actorUserId: string; userId: string; status: UserStatus }
) {
  if (payload.actorUserId === payload.userId && payload.status === "disabled") {
    return jsonError("Cannot disable current user", 400);
  }

  const user = await context.store.users.updateStatus(payload.userId, payload.status);
  if (!user) return jsonError("User not found", 404);
  if (payload.status === "disabled") await context.store.sessions.deleteByUserId(payload.userId);
  await recordAudit(context.store, "user", payload.actorUserId, "user-status-update", {
    userId: user.id,
    status: user.status
  });
  return toAdminUserSummary(user);
}

export async function deleteUserUseCase(
  context: AdminUseCaseContext,
  payload: { actorUserId: string; userId: string }
) {
  if (payload.actorUserId === payload.userId) return jsonError("Cannot delete current user", 400);
  const deleted = await context.store.users.delete(payload.userId);
  if (!deleted) return jsonError("User not found", 404);
  await recordAudit(context.store, "user", payload.actorUserId, "user-delete", { userId: payload.userId });
  return { ok: true };
}

export async function listAdminInvites(context: AdminUseCaseContext, options: PageListOptions) {
  return context.store.invites.listPage(options);
}

export async function listAdminMailboxes(context: AdminUseCaseContext, options: PageListOptions) {
  return context.store.mailboxes.listPage(options);
}

function createInviteCode() {
  return `INVITE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function createInvitesUseCase(
  context: AdminUseCaseContext,
  actorUserId: string,
  input: { count: number; expiresInDays: number | null; targetRole: UserRole; maxRedemptions: number }
) {
  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;
  const invites: InviteRecord[] = [];
  for (let index = 0; index < input.count; index += 1) {
    invites.push(
      await context.store.invites.create({
        code: createInviteCode(),
        createdByUserId: actorUserId,
        expiresAt,
        targetRole: input.targetRole,
        maxRedemptions: input.maxRedemptions
      })
    );
  }
  await recordAudit(context.store, "user", actorUserId, "invite-create", {
    count: invites.length,
    expiresAt,
    targetRole: input.targetRole,
    maxRedemptions: input.maxRedemptions,
    inviteIds: invites.map((invite) => invite.id)
  });
  return invites;
}

export async function disableInviteUseCase(
  context: AdminUseCaseContext,
  payload: { actorUserId: string; inviteId: string }
) {
  const invite = await context.store.invites.findById(payload.inviteId);
  if (!invite) return jsonError("Invite not found", 404);
  if (isInviteFullyRedeemed(invite)) return jsonError("Invite already redeemed", 409);
  if (invite.disabledAt) return jsonError("Invite already disabled", 409);

  await context.store.invites.disable(payload.inviteId);
  await recordAudit(context.store, "user", payload.actorUserId, "invite-disable", {
    inviteId: payload.inviteId
  });
  return { ok: true };
}

export async function getQuotaUseCase(context: AdminUseCaseContext, userId: string) {
  const [outboundLimit, apiDailyLimit] = await Promise.all([
    getResolvedOutboundLimit(context.store, context.env),
    getResolvedApiDailyLimit(context.store, context.env)
  ]);
  return context.store.quotas.getByUserId(userId, outboundLimit, apiDailyLimit);
}

export async function updateQuotaUseCase(
  context: AdminUseCaseContext,
  payload: { actorUserId: string; userId: string; apiDailyLimit: number; dailyLimit: number; disabled: boolean }
) {
  const [outboundLimit, apiDailyLimit] = await Promise.all([
    getResolvedOutboundLimit(context.store, context.env),
    getResolvedApiDailyLimit(context.store, context.env)
  ]);
  const existing = await context.store.quotas.getByUserId(payload.userId, outboundLimit, apiDailyLimit);
  existing.apiDailyLimit = payload.apiDailyLimit;
  existing.dailyLimit = payload.dailyLimit;
  existing.disabled = payload.disabled;
  existing.updatedAt = new Date().toISOString();
  await context.store.quotas.save(existing);
  await recordAudit(context.store, "user", payload.actorUserId, "quota-update", { userId: existing.userId });
  return existing;
}

function parseAuditPayload(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function isInviteExpired(invite: InviteRecord) {
  return Boolean(invite.expiresAt && new Date(invite.expiresAt) <= new Date());
}

function isInviteFullyRedeemed(invite: InviteRecord) {
  return invite.redemptionCount >= invite.maxRedemptions;
}

function formatAuditEventLabel(eventType: string) {
  const labels: Record<string, string> = {
    "api-key-create": "创建 API Key",
    "api-key-revoke": "吊销 API Key",
    "invite-create": "创建邀请码",
    "invite-disable": "停用邀请码",
    "login": "密码登录",
    "login-failed": "密码登录失败",
    "oauth_login": "OAuth 登录",
    "oauth_register": "OAuth 注册",
    "oauth-login-failed": "OAuth 登录失败",
    "quota-update": "更新配额",
    "session-revoke": "撤销会话",
    "session-revoke-others": "退出其他设备",
    "user-create": "创建用户",
    "user-delete": "删除用户",
    "user-password-reset": "重置密码",
    "user-status-update": "更新用户状态",
    "user-update": "更新用户资料"
  };
  return labels[eventType] ?? eventType;
}

function formatAuditUserLabel(user: UserRecord | null) {
  if (!user) return "未知用户";
  return user.name || user.email;
}

function formatAuditActorLabel(event: AuditEventRecord, actor: UserRecord | undefined) {
  if (actor) return `${actor.name} / ${actor.email}`;
  return event.actorType === "user" ? "未知用户" : event.actorId;
}

function formatAuditEventDetail(event: AuditEventRecord, payload: Record<string, unknown>, usersById: Map<string, UserRecord>) {
  if (event.eventType === "invite-create") return `数量 ${String(payload.count ?? 1)}，角色 ${String(payload.targetRole ?? "member")}`;
  if (event.eventType === "login-failed" || event.eventType === "oauth-login-failed") return String(payload.reason ?? "unknown");
  if (typeof payload.userId === "string") return `用户 ${formatAuditUserLabel(usersById.get(payload.userId) ?? null)}`;
  if (typeof payload.provider === "string") return `来源 ${payload.provider}`;
  if (typeof payload.email === "string") return payload.email;
  return "已记录";
}

function mapLoginHistoryEvent(event: AuditEventRecord, usersById: Map<string, UserRecord>): AdminLoginHistoryEvent {
  const payload = parseAuditPayload(event.payloadJson);
  const isOauth = event.eventType === "oauth_login" || event.eventType === "oauth_register" || event.eventType === "oauth-login-failed";
  const status = event.eventType.endsWith("failed") ? "failed" : "success";
  const user = usersById.get(event.actorId) ?? null;
  const providerValue = typeof payload.provider === "string" && (payload.provider === "github" || payload.provider === "linuxdo") ? payload.provider : null;
  return {
    id: event.id,
    userId: event.actorType === "user" ? event.actorId : null,
    userEmail: user?.email ?? (typeof payload.email === "string" ? payload.email : event.actorId),
    method: isOauth ? "oauth" : "password",
    provider: providerValue,
    status,
    reason: typeof payload.reason === "string" ? payload.reason : null,
    ipAddress: typeof payload.ipAddress === "string" ? payload.ipAddress : null,
    userAgent: typeof payload.userAgent === "string" ? payload.userAgent : null,
    createdAt: event.createdAt
  };
}

function mapAuditEvent(event: AuditEventRecord, usersById: Map<string, UserRecord>): AdminAuditEventSummary {
  const payload = parseAuditPayload(event.payloadJson);
  const actor = usersById.get(event.actorId);
  return {
    id: event.id,
    actorId: event.actorId,
    actorLabel: formatAuditActorLabel(event, actor),
    eventType: event.eventType,
    eventLabel: formatAuditEventLabel(event.eventType),
    detail: formatAuditEventDetail(event, payload, usersById),
    createdAt: event.createdAt
  };
}

async function listAllUsers(context: AdminUseCaseContext) {
  const summary = await context.store.users.summary();
  return (
    await context.store.users.list({
      page: 1,
      pageSize: Math.max(summary.total, 1)
    })
  ).users;
}

async function buildRateLimitPolicies(context: AdminUseCaseContext, users: UserRecord[]): Promise<AdminRateLimitPolicySummary[]> {
  const [apiDailyLimit, outboundDailyLimit] = await Promise.all([
    getResolvedApiDailyLimit(context.store, context.env),
    getResolvedOutboundLimit(context.store, context.env)
  ]);
  const quotas = await Promise.all(users.map((user) => context.store.quotas.getByUserId(user.id, outboundDailyLimit, apiDailyLimit)));
  const apiCallsToday = quotas.reduce((sum, quota) => sum + quota.apiCallsToday, 0);
  const sendsToday = quotas.reduce((sum, quota) => sum + quota.sendsToday, 0);
  const rateLimiterEnabled = Boolean(context.env.RATE_LIMITER);

  return [
    {
      key: "register",
      label: "注册",
      scope: "IP + /api/auth/register",
      policy: "Cloudflare Rate Limiter",
      currentUsage: rateLimiterEnabled ? "平台限流器接管" : "未绑定 RATE_LIMITER",
      enforced: rateLimiterEnabled
    },
    {
      key: "login",
      label: "登录",
      scope: "IP + /api/auth/login",
      policy: "Cloudflare Rate Limiter",
      currentUsage: rateLimiterEnabled ? "平台限流器接管" : "未绑定 RATE_LIMITER",
      enforced: rateLimiterEnabled
    },
    {
      key: "mailbox_create",
      label: "创建邮箱",
      scope: "IP + /api/accounts",
      policy: "Rate Limiter + 用户邮箱上限",
      currentUsage: rateLimiterEnabled ? "请求限流已启用" : "仅用户上限生效",
      enforced: rateLimiterEnabled
    },
    {
      key: "mail_send",
      label: "发信",
      scope: "IP + /api/mail/send",
      policy: "Rate Limiter + 用户发信配额",
      currentUsage: `${sendsToday} / ${outboundDailyLimit * Math.max(users.length, 1)} 今日发送`,
      enforced: rateLimiterEnabled
    },
    {
      key: "api_key",
      label: "API Key 创建",
      scope: "IP + /api/api-keys",
      policy: "Cloudflare Rate Limiter",
      currentUsage: rateLimiterEnabled ? "请求限流已启用" : "未绑定 RATE_LIMITER",
      enforced: rateLimiterEnabled
    },
    {
      key: "api_daily",
      label: "API 调用",
      scope: "用户每日",
      policy: `${apiDailyLimit} / 用户 / 天`,
      currentUsage: `${apiCallsToday} / ${apiDailyLimit * Math.max(users.length, 1)} 今日调用`,
      enforced: true
    },
    {
      key: "outbound_daily",
      label: "外发邮件",
      scope: "用户每日",
      policy: `${outboundDailyLimit} / 用户 / 天`,
      currentUsage: `${sendsToday} / ${outboundDailyLimit * Math.max(users.length, 1)} 今日发送`,
      enforced: true
    }
  ];
}

export async function getAdminGovernanceSummary(context: AdminUseCaseContext): Promise<AdminGovernanceSummary> {
  const [users, invites, loginEvents, auditEvents] = await Promise.all([
    listAllUsers(context),
    context.store.invites.list(),
    context.store.audit.listRecent({
      eventTypes: ["login", "login-failed", "oauth_login", "oauth_register", "oauth-login-failed"],
      limit: 12
    }),
    context.store.audit.listRecent({ limit: 12 })
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const inviteStats = invites.reduce(
    (stats, invite) => {
      if (invite.disabledAt) stats.disabled += 1;
      else if (isInviteExpired(invite)) stats.expired += 1;
      else if (isInviteFullyRedeemed(invite)) stats.redeemed += 1;
      else stats.available += 1;
      stats.total += 1;
      return stats;
    },
    { available: 0, disabled: 0, expired: 0, redeemed: 0, total: 0 }
  );

  return {
    generatedAt: new Date().toISOString(),
    loginHistory: loginEvents.map((event) => mapLoginHistoryEvent(event, usersById)),
    auditEvents: auditEvents.map((event) => mapAuditEvent(event, usersById)),
    inviteStats,
    rateLimits: await buildRateLimitPolicies(context, users)
  };
}

function buildPlanTiers(settings: Awaited<ReturnType<typeof getRuntimeSettings>>): PlanTierSummary[] {
  return [
    {
      id: "free",
      name: "免费版",
      priceLabel: "¥0",
      mailboxLimit: settings.mailbox.limit,
      retentionDays: settings.message.retentionDays,
      apiDailyLimit: settings.api.dailyLimit,
      outboundDailyLimit: settings.outbound.dailyLimit,
      webhookLimit: 1,
      teamSeats: 1,
      features: ["基础收件", "验证码识别", "个人 API Key"]
    },
    {
      id: "pro",
      name: "高级版",
      priceLabel: "按月订阅",
      mailboxLimit: settings.mailbox.limit * 4,
      retentionDays: settings.message.retentionDays * 4,
      apiDailyLimit: settings.api.dailyLimit * 5,
      outboundDailyLimit: settings.outbound.dailyLimit * 5,
      webhookLimit: 10,
      teamSeats: 3,
      features: ["更高配额", "Webhook 投递日志", "发信模板", "自助诊断"]
    },
    {
      id: "team",
      name: "团队版",
      priceLabel: "联系销售",
      mailboxLimit: settings.mailbox.limit * 20,
      retentionDays: settings.message.retentionDays * 12,
      apiDailyLimit: settings.api.dailyLimit * 20,
      outboundDailyLimit: settings.outbound.dailyLimit * 20,
      webhookLimit: 50,
      teamSeats: 25,
      features: ["团队空间", "共享邮箱", "成员角色", "组织审计", "高级可靠性 runbook"]
    }
  ];
}

function resolveCurrentPlanId(input: { users: UserRecord[]; mailboxCount: number; freeMailboxLimit: number }): PlanTierSummary["id"] {
  if (input.users.length > 1) return "team";
  if (input.mailboxCount > input.freeMailboxLimit) return "pro";
  return "free";
}

async function countOutboundUsage(context: AdminUseCaseContext, mailboxIds: string[]) {
  if (mailboxIds.length === 0) return { sentToday: 0, total: 0 };
  const todayPrefix = new Date().toISOString().slice(0, 10);
  const results = await Promise.all(
    mailboxIds.map((mailboxId) =>
      context.store.outboundMessages.listByMailbox({
        mailboxId,
        page: 1,
        pageSize: 500
      })
    )
  );
  const messages = results.flatMap((result) => result.messages);
  return {
    sentToday: messages.filter((message) => message.status === "sent" && message.createdAt.startsWith(todayPrefix)).length,
    total: messages.length
  };
}

export async function getAdminCommercialSummary(context: AdminUseCaseContext): Promise<CommercialModelSummary> {
  const [settings, users, mailboxes, auditEvents] = await Promise.all([
    getRuntimeSettings(context.store, context.env),
    listAllUsers(context),
    context.store.mailboxes.listAll(),
    context.store.audit.listRecent({ limit: 20 })
  ]);
  const mailboxIds = mailboxes.map((mailbox) => mailbox.id);
  const [messageList, outboundUsage, webhookEndpointBatches] = await Promise.all([
    context.store.messages.listForMailboxes({
      mailboxIds,
      page: 1,
      pageSize: 1
    }),
    countOutboundUsage(context, mailboxIds),
    Promise.all(users.map((user) => context.store.webhookEndpoints.listByUser(user.id)))
  ]);
  const quotas = await Promise.all(
    users.map((user) => context.store.quotas.getByUserId(user.id, settings.outbound.dailyLimit, settings.api.dailyLimit))
  );
  const planTiers = buildPlanTiers(settings);
  const currentPlanId = resolveCurrentPlanId({
    users,
    mailboxCount: mailboxes.length,
    freeMailboxLimit: settings.mailbox.limit
  });
  const usersById = new Map(users.map((user) => [user.id, user]));
  const apiCallsToday = quotas.reduce((sum, quota) => sum + quota.apiCallsToday, 0);
  const quotaSendsToday = quotas.reduce((sum, quota) => sum + quota.sendsToday, 0);
  const outboundSentToday = Math.max(quotaSendsToday, outboundUsage.sentToday);

  return {
    generatedAt: new Date().toISOString(),
    currentPlanId,
    planTiers,
    quotaUsage: {
      users: users.length,
      activeUsers: users.filter((user) => user.status === "active").length,
      mailboxes: mailboxes.length,
      mailboxLimit: planTiers.find((tier) => tier.id === currentPlanId)?.mailboxLimit ?? settings.mailbox.limit,
      messages: messageList.total,
      outboundDailyLimit: quotas.reduce((sum, quota) => sum + quota.dailyLimit, 0),
      outboundSentToday,
      apiDailyLimit: quotas.reduce((sum, quota) => sum + quota.apiDailyLimit, 0),
      apiCallsToday,
      webhookEndpoints: webhookEndpointBatches.flat().length
    },
    teamWorkspaces: [
      {
        id: "default",
        name: "WeMail 默认组织",
        planId: currentPlanId,
        memberCount: users.length,
        adminCount: users.filter((user) => user.role === "admin").length,
        sharedMailboxCount: mailboxes.length,
        auditEventCount: auditEvents.length,
        usage: {
          mailboxes: mailboxes.length,
          messages: messageList.total,
          outboundSentToday,
          apiCallsToday
        }
      }
    ],
    organizationAudit: auditEvents.map((event) => mapAuditEvent(event, usersById))
  };
}
