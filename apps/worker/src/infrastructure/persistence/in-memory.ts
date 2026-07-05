import {
  API_KEY_SCOPE_DEFINITIONS,
  applyDictionaryItemUpdate,
  buildDictionaryCatalog,
  DEFAULT_API_KEY_SCOPES,
  findDefaultDictionaryItem,
  type ApiKeyScope,
  type DictionaryItemSummary,
  type MailDomainSummary,
  type MessageFilter,
  type MessageListSummary,
  type OutboundListStatus
} from "@wemail/shared";

import type {
  AccountSettingsRecord,
  AnnouncementRecord,
  AnnouncementReceiptRecord,
  ApiKeyRecord,
  AppStore,
  AttachmentRecord,
  AuditEventRecord,
  CleanupRunRecord,
  FeatureToggles,
  InviteRecord,
  MailSettingsRecord,
  MailboxDetailRecord,
  MailboxDetailListQuery,
  MailboxRecord,
  NotificationRuleRecord,
  OAuthIdentityRecord,
  OAuthPendingLoginRecord,
  OAuthStateRecord,
  OutboundMessageRecord,
  PersistedMessageRecord,
  QuotaRecord,
  RuntimeSettingsRecord,
  SessionRecord,
  UserPreferencesRecord,
  TelegramSubscriptionRecord,
  UserRecord,
  WebhookDeliveryRecord,
  WebhookEndpointRecord
} from "../../core/bindings";
import {
  filterAnnouncements,
  getAnnouncementSummary,
  getFeaturedAnnouncements,
  paginateAnnouncements
} from "../../shared/announcements";

function nowIso() {
  return new Date().toISOString();
}

function clone<T>(value: T) {
  return JSON.parse(JSON.stringify(value)) as T;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function getSafePage(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 1;
}

function getSafePageSize(value: number) {
  if (!Number.isFinite(value) || value < 1) return 10;
  return Math.min(Math.trunc(value), 500);
}

function getActiveRangeDays(value: MailboxDetailListQuery["activeRange"]) {
  switch (value) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    default:
      return null;
  }
}

function getInactiveDays(value: number | undefined) {
  return Number.isFinite(value) && value && value > 0 ? Math.trunc(value) : 30;
}

function parseMessageExtraction(record: PersistedMessageRecord) {
  return JSON.parse(record.extractionJson) as { type?: string; value?: string; label?: string };
}

const apiKeyScopeIds = new Set<string>(API_KEY_SCOPE_DEFINITIONS.map((scope) => scope.id));

function normalizeApiKeyScopes(scopes: unknown[] | undefined): ApiKeyScope[] {
  const normalized = (scopes ?? []).filter((scope): scope is ApiKeyScope => typeof scope === "string" && apiKeyScopeIds.has(scope));
  return normalized.length > 0 ? normalized : [...DEFAULT_API_KEY_SCOPES];
}

function matchesMessageFilter(record: PersistedMessageRecord, filter: MessageFilter = "all") {
  const extraction = parseMessageExtraction(record);
  if (filter === "code") return extraction.type === "auth_code";
  if (filter === "link") return extraction.type !== "auth_code" && extraction.type !== "none";
  if (filter === "attachment") return record.attachmentCount > 0;
  if (filter === "unparsed") return extraction.type === "none";
  return true;
}

type StoredMailboxRecord = MailboxRecord & {
  createdBy: string;
  createdByName: string | null;
  deletedAt?: string | null;
  lastActiveAt: string | null;
  status: MailboxDetailRecord["status"];
  tags: string[];
};

function matchesMessageSearch(record: PersistedMessageRecord, searchValue?: string) {
  const normalizedSearch = searchValue?.trim().toLowerCase();
  if (!normalizedSearch) return true;

  const extraction = parseMessageExtraction(record);
  return [
    record.toAddress ?? "",
    record.fromAddress,
    record.subject,
    record.previewText,
    record.bodyText,
    extraction.value ?? "",
    extraction.label ?? ""
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedSearch);
}

function matchesMessageAdvancedFilters(record: PersistedMessageRecord, query: {
  from?: string;
  subject?: string;
  startDate?: string;
  endDate?: string;
  hasAttachment?: boolean;
  extractionType?: string;
}) {
  const normalizedFrom = query.from?.trim().toLowerCase();
  if (normalizedFrom && !record.fromAddress.toLowerCase().includes(normalizedFrom)) return false;

  const normalizedSubject = query.subject?.trim().toLowerCase();
  if (normalizedSubject && !record.subject.toLowerCase().includes(normalizedSubject)) return false;

  if (query.startDate && record.receivedAt < query.startDate) return false;
  if (query.endDate && record.receivedAt > query.endDate) return false;

  if (typeof query.hasAttachment === "boolean") {
    const hasAttachment = record.attachmentCount > 0;
    if (hasAttachment !== query.hasAttachment) return false;
  }

  if (query.extractionType) {
    const extraction = parseMessageExtraction(record);
    if (extraction.type !== query.extractionType) return false;
  }

  return true;
}

function summarizeMessageRecords(records: PersistedMessageRecord[]): MessageListSummary {
  return {
    messageCount: records.length,
    extractionCount: records.filter((record) => {
      const extraction = parseMessageExtraction(record);
      return extraction.type !== "none" && Boolean(extraction.value?.trim());
    }).length,
    attachmentCount: records.reduce((sum, record) => sum + record.attachmentCount, 0)
  };
}

function matchesOutboundSearch(record: OutboundMessageRecord, searchValue?: string) {
  const normalizedSearch = searchValue?.trim().toLowerCase();
  if (!normalizedSearch) return true;

  return [
    record.fromAddress,
    record.toAddress,
    record.subject,
    record.bodyText,
    record.errorText ?? "",
    record.providerMessageId ?? "",
    record.requestPayloadJson,
    record.responsePayloadJson ?? ""
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedSearch);
}

function matchesOutboundStatus(record: OutboundMessageRecord, status: OutboundListStatus = "all") {
  if (status === "sent") return record.status === "sent";
  if (status === "failed") return record.status === "failed";
  return true;
}

export function createInMemoryStore(): AppStore {
  const users = new Map<string, UserRecord>();
  const userPreferences = new Map<string, UserPreferencesRecord>();
  const sessions = new Map<string, SessionRecord>();
  const oauthStates = new Map<string, OAuthStateRecord>();
  const oauthPendingLogins = new Map<string, OAuthPendingLoginRecord>();
  const oauthIdentities = new Map<string, OAuthIdentityRecord>();
  const invites = new Map<string, InviteRecord>();
  const mailboxes = new Map<string, StoredMailboxRecord>();
  const messages = new Map<string, PersistedMessageRecord>();
  const attachments = new Map<string, AttachmentRecord[]>();
  const outboundMessages: OutboundMessageRecord[] = [];
  const apiKeys = new Map<string, ApiKeyRecord>();
  const telegramSubscriptions = new Map<string, TelegramSubscriptionRecord>();
  const quotas = new Map<string, QuotaRecord>();
  const settings = new Map<keyof FeatureToggles, boolean>();
  let runtimeSettings: RuntimeSettingsRecord | null = null;
  let mailDomains: MailDomainSummary[] | null = null;
  const dictionaryItems = new Map<string, DictionaryItemSummary>();
  const auditEvents: AuditEventRecord[] = [];
  const cleanupRuns: CleanupRunRecord[] = [];
  let accountSettingsRecord: AccountSettingsRecord | null = null;
  let mailSettingsRecord: MailSettingsRecord | null = null;
  const webhookEndpoints = new Map<string, WebhookEndpointRecord>();
  const webhookDeliveries: WebhookDeliveryRecord[] = [];
  const notificationRules = new Map<string, NotificationRuleRecord>();
  const announcements: AnnouncementRecord[] = [];
  const announcementReceipts: AnnouncementReceiptRecord[] = [];

  function withInviteDisplayUser(invite: InviteRecord): InviteRecord {
    const redeemedUser = invite.redeemedByUserId ? users.get(invite.redeemedByUserId) : null;
    return {
      ...invite,
      redeemedByUserName: redeemedUser?.name || redeemedUser?.email || null
    };
  }

  function dictionaryItemKey(groupKey: string, value: string) {
    return `${groupKey}\u0000${value}`;
  }

  function toMailboxDetailRecord(record: MailboxRecord): MailboxDetailRecord {
    const user = users.get(record.userId);
    return {
      id: record.id,
      userId: record.userId,
      address: record.address,
      label: record.label,
      status: (record as MailboxRecord & { status?: MailboxDetailRecord["status"] }).status ?? "enabled",
      tags: (record as MailboxRecord & { tags?: string[] }).tags ?? [],
      createdBy: (record as MailboxRecord & { createdBy?: string | null }).createdBy ?? record.userId,
      createdByName:
        (record as MailboxRecord & { createdByName?: string | null }).createdByName ?? user?.name ?? null,
      lastActiveAt: (record as MailboxRecord & { lastActiveAt?: string | null }).lastActiveAt ?? null,
      deletedAt: (record as MailboxRecord & { deletedAt?: string | null }).deletedAt ?? null,
      messageCount: Array.from(messages.values()).filter((message) => message.mailboxId === record.id).length,
      outboundCount: outboundMessages.filter((message) => message.mailboxId === record.id).length,
      createdAt: record.createdAt
    };
  }

  return {
    users: {
      async count() {
        return users.size;
      },
      async countActiveByRole(role) {
        return Array.from(users.values()).filter((user) => user.status === "active" && (!role || user.role === role)).length;
      },
      async findByEmail(email) {
        return clone(Array.from(users.values()).find((entry) => entry.email === email) ?? null);
      },
      async findById(id) {
        return clone(users.get(id) ?? null);
      },
      async create(input) {
        const createdAt = nowIso();
        const record: UserRecord = {
          id: crypto.randomUUID(),
          email: input.email,
          name: input.name,
          passwordHash: input.passwordHash,
          role: input.role,
          status: "active",
          createdAt,
          updatedAt: createdAt
        };
        users.set(record.id, record);
        return clone(record);
      },
      async updateProfile(id, input) {
        const record = users.get(id);
        if (!record) return null;
        record.name = input.name;
        record.updatedAt = nowIso();
        return clone(record);
      },
      async updateRole(id, role) {
        const record = users.get(id);
        if (!record) return null;
        record.role = role;
        record.updatedAt = nowIso();
        return clone(record);
      },
      async updatePasswordHash(id, passwordHash) {
        const record = users.get(id);
        if (!record) return null;
        record.passwordHash = passwordHash;
        record.updatedAt = nowIso();
        return clone(record);
      },
      async updateStatus(id, status) {
        const record = users.get(id);
        if (!record) return null;
        record.status = status;
        record.updatedAt = nowIso();
        return clone(record);
      },
      async delete(id) {
        if (!users.has(id)) return false;
        users.delete(id);
        userPreferences.delete(id);
        quotas.delete(id);
        telegramSubscriptions.delete(id);
        for (const [sessionId, session] of sessions) {
          if (session.userId === id) sessions.delete(sessionId);
        }
        for (const [identityId, identity] of oauthIdentities) {
          if (identity.userId === id) oauthIdentities.delete(identityId);
        }
        for (const [keyId, key] of apiKeys) {
          if (key.userId === id) apiKeys.delete(keyId);
        }
        return true;
      },
      async list(options) {
        const normalizedSearch = options.search?.toLowerCase();
        const filteredUsers = Array.from(users.values())
          .filter((user) => {
            const matchesSearch =
              !normalizedSearch ||
              user.email.toLowerCase().includes(normalizedSearch) ||
              user.name.toLowerCase().includes(normalizedSearch);
            const matchesRole = !options.role || user.role === options.role;
            const matchesStatus = !options.status || user.status === options.status;
            return matchesSearch && matchesRole && matchesStatus;
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
        const startIndex = (options.page - 1) * options.pageSize;

        return {
          users: clone(filteredUsers.slice(startIndex, startIndex + options.pageSize)),
          total: filteredUsers.length,
          page: options.page,
          pageSize: options.pageSize
        };
      },
      async summary() {
        const allUsers = Array.from(users.values());
        return {
          active: allUsers.filter((user) => user.status === "active").length,
          total: allUsers.length
        };
      }
    },
    userPreferences: {
      async getByUserId(userId) {
        return clone(userPreferences.get(userId) ?? null);
      },
      async save(record) {
        const next: UserPreferencesRecord = {
          ...record,
          updatedAt: nowIso()
        };
        userPreferences.set(record.userId, next);
        return clone(next);
      }
    },
    sessions: {
      async create(input) {
        const createdAt = nowIso();
        const record: SessionRecord = {
          id: `${crypto.randomUUID()}-${Math.random().toString(36).slice(2, 10)}`,
          userId: input.userId,
          userAgent: input.userAgent ?? null,
          ipAddress: input.ipAddress ?? null,
          expiresAt: input.expiresAt,
          lastSeenAt: createdAt,
          createdAt
        };
        sessions.set(record.id, record);
        return clone(record);
      },
      async findById(id) {
        return clone(sessions.get(id) ?? null);
      },
      async listByUser(userId) {
        return clone(
          Array.from(sessions.values())
            .filter((session) => session.userId === userId)
            .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt) || b.createdAt.localeCompare(a.createdAt))
        );
      },
      async touch(id, input = {}) {
        const record = sessions.get(id);
        if (!record) return;
        record.lastSeenAt = nowIso();
        if (typeof input.userAgent !== "undefined" && input.userAgent !== null) record.userAgent = input.userAgent;
        if (typeof input.ipAddress !== "undefined" && input.ipAddress !== null) record.ipAddress = input.ipAddress;
        sessions.set(id, record);
      },
      async delete(id) {
        sessions.delete(id);
      },
      async deleteByUserId(userId) {
        for (const [sessionId, session] of sessions) {
          if (session.userId === userId) sessions.delete(sessionId);
        }
      },
      async deleteByUserIdExcept(userId, keepSessionId) {
        for (const [sessionId, session] of sessions) {
          if (session.userId === userId && sessionId !== keepSessionId) sessions.delete(sessionId);
        }
      }
    },
    oauthStates: {
      async create(input) {
        const record: OAuthStateRecord = {
          id: `${crypto.randomUUID()}-${Math.random().toString(36).slice(2, 10)}`,
          provider: input.provider,
          redirectTo: input.redirectTo,
          expiresAt: input.expiresAt,
          createdAt: nowIso()
        };
        oauthStates.set(record.id, record);
        return clone(record);
      },
      async consume(id) {
        const record = oauthStates.get(id) ?? null;
        oauthStates.delete(id);
        if (!record || new Date(record.expiresAt) <= new Date()) return null;
        return clone(record);
      }
    },
    oauthPendingLogins: {
      async create(input) {
        const record: OAuthPendingLoginRecord = {
          id: `${crypto.randomUUID()}-${Math.random().toString(36).slice(2, 10)}`,
          provider: input.provider,
          providerUserId: input.providerUserId,
          providerEmail: input.providerEmail,
          providerName: input.providerName,
          providerLogin: input.providerLogin,
          redirectTo: input.redirectTo,
          expiresAt: input.expiresAt,
          createdAt: nowIso()
        };
        oauthPendingLogins.set(record.id, record);
        return clone(record);
      },
      async findById(id) {
        const record = oauthPendingLogins.get(id) ?? null;
        if (!record) return null;
        if (new Date(record.expiresAt) > new Date()) return clone(record);
        oauthPendingLogins.delete(id);
        return null;
      },
      async consume(id) {
        const record = oauthPendingLogins.get(id) ?? null;
        oauthPendingLogins.delete(id);
        if (!record || new Date(record.expiresAt) <= new Date()) return null;
        return clone(record);
      }
    },
    oauthIdentities: {
      async findByProviderUser(provider, providerUserId) {
        const record = Array.from(oauthIdentities.values()).find(
          (identity) => identity.provider === provider && identity.providerUserId === providerUserId
        );
        return clone(record ?? null);
      },
      async upsert(input) {
        const existing = Array.from(oauthIdentities.values()).find(
          (identity) => identity.provider === input.provider && identity.providerUserId === input.providerUserId
        );
        const updatedAt = nowIso();
        if (existing) {
          const next: OAuthIdentityRecord = {
            ...existing,
            userId: input.userId,
            providerEmail: input.providerEmail,
            providerLogin: input.providerLogin,
            updatedAt
          };
          oauthIdentities.set(next.id, next);
          return clone(next);
        }

        const record: OAuthIdentityRecord = {
          id: crypto.randomUUID(),
          userId: input.userId,
          provider: input.provider,
          providerUserId: input.providerUserId,
          providerEmail: input.providerEmail,
          providerLogin: input.providerLogin,
          createdAt: updatedAt,
          updatedAt
        };
        oauthIdentities.set(record.id, record);
        return clone(record);
      },
      async deleteByUserId(userId) {
        for (const [identityId, identity] of oauthIdentities) {
          if (identity.userId === userId) oauthIdentities.delete(identityId);
        }
      }
    },
    invites: {
      async create(input) {
        const record: InviteRecord = {
          id: crypto.randomUUID(),
          code: input.code,
          createdByUserId: input.createdByUserId,
          redeemedByUserId: null,
          redeemedAt: null,
          disabledAt: null,
          expiresAt: input.expiresAt ?? null,
          targetRole: input.targetRole ?? "member",
          maxRedemptions: input.maxRedemptions ?? 1,
          redemptionCount: 0,
          createdAt: nowIso()
        };
        invites.set(record.id, record);
        return clone(withInviteDisplayUser(record));
      },
      async findByCode(code) {
        const invite = Array.from(invites.values()).find((entry) => entry.code === code) ?? null;
        return clone(invite ? withInviteDisplayUser(invite) : null);
      },
      async findById(id) {
        const invite = invites.get(id) ?? null;
        return clone(invite ? withInviteDisplayUser(invite) : null);
      },
      async redeem(code, userId) {
        const invite = Array.from(invites.values()).find((entry) => entry.code === code);
        if (!invite) throw new Error("Invite not found");
        if (invite.redemptionCount >= invite.maxRedemptions) throw new Error("Invite already redeemed");
        invite.redeemedByUserId = userId;
        invite.redeemedAt = nowIso();
        invite.redemptionCount += 1;
        invites.set(invite.id, invite);
        return clone(withInviteDisplayUser(invite));
      },
      async list() {
        return clone(Array.from(invites.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(withInviteDisplayUser));
      },
      async listPage(options) {
        const sortedInvites = Array.from(invites.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const startIndex = (options.page - 1) * options.pageSize;
        const now = new Date();
        return clone({
          available: sortedInvites.filter(
            (invite) =>
              invite.redemptionCount < invite.maxRedemptions &&
              !invite.disabledAt &&
              (!invite.expiresAt || new Date(invite.expiresAt) > now)
          ).length,
          invites: sortedInvites.slice(startIndex, startIndex + options.pageSize).map(withInviteDisplayUser),
          page: options.page,
          pageSize: options.pageSize,
          total: sortedInvites.length
        });
      },
      async disable(id) {
        const invite = invites.get(id);
        if (!invite) return;
        invite.disabledAt = nowIso();
        invites.set(id, invite);
      }
    },
    mailboxes: {
      async countByUser(userId) {
        return Array.from(mailboxes.values()).filter(
          (entry) => entry.userId === userId && entry.status !== "soft_deleted"
        ).length;
      },
      async create(input) {
        const record: MailboxRecord & {
          createdBy: string;
          createdByName: string | null;
          lastActiveAt: string | null;
          status: MailboxDetailRecord["status"];
          tags: string[];
        } = {
          id: crypto.randomUUID(),
          userId: input.userId,
          address: input.address,
          label: input.label,
          status: input.status ?? "enabled",
          tags: input.tags ?? [],
          createdBy: input.userId,
          createdByName: users.get(input.userId)?.name ?? null,
          lastActiveAt: input.lastActiveAt ?? null,
          createdAt: nowIso()
        };
        mailboxes.set(record.id, record);
        return clone(record);
      },
      async update(id, input) {
        const record = mailboxes.get(id);
        if (!record) return null;
        if (typeof input.label !== "undefined") record.label = input.label;
        if (typeof input.status !== "undefined") {
          (record as MailboxRecord & { status: MailboxDetailRecord["status"] }).status = input.status;
          (record as MailboxRecord & { deletedAt?: string | null }).deletedAt =
            input.status === "soft_deleted" ? nowIso() : null;
        }
        if (typeof input.deletedAt !== "undefined") {
          (record as MailboxRecord & { deletedAt?: string | null }).deletedAt = input.deletedAt;
        }
        if (typeof input.lastActiveAt !== "undefined") {
          (record as MailboxRecord & { lastActiveAt?: string | null }).lastActiveAt = input.lastActiveAt;
        }
        if (typeof input.tags !== "undefined") {
          (record as MailboxRecord & { tags: string[] }).tags = input.tags;
        }
        mailboxes.set(id, record);
        return clone(toMailboxDetailRecord(record));
      },
      async listByUser(userId) {
        return clone(Array.from(mailboxes.values()).filter((entry) => entry.userId === userId));
      },
      async listAllWithDetails(query: MailboxDetailListQuery) {
        let filtered = Array.from(mailboxes.values());

        if (query.userId) {
          filtered = filtered.filter((m) => m.userId === query.userId);
        }

        if (query.search) {
          const searchLower = query.search.toLowerCase();
          filtered = filtered.filter(
            (m) =>
              m.id.toLowerCase().includes(searchLower) ||
              m.label.toLowerCase().includes(searchLower) ||
              m.address.toLowerCase().includes(searchLower) ||
              (users.get(m.userId)?.name ?? "").toLowerCase().includes(searchLower)
          );
        }

        if (query.status && query.status !== "all") {
          filtered = filtered.filter((m) => (m as any).status === query.status);
        }

        if (query.createdBy && query.createdBy !== "all") {
          filtered = filtered.filter((m) => users.get(m.userId)?.name === query.createdBy);
        }

        const activeRangeDays = getActiveRangeDays(query.activeRange);
        if (activeRangeDays) {
          const cutoff = Date.now() - activeRangeDays * DAY_MS;
          filtered = filtered.filter((m) => {
            const lastActiveAt = (m as any).lastActiveAt as string | null | undefined;
            if (!lastActiveAt) return false;
            return new Date(lastActiveAt).getTime() >= cutoff;
          });
        }

        if (query.quickFilter === "anomaly") {
          filtered = filtered.filter((m) => ((m as any).status || "enabled") !== "enabled");
        }

        if (query.quickFilter === "inactive") {
          const cutoff = Date.now() - getInactiveDays(query.inactiveDays) * DAY_MS;
          filtered = filtered.filter((m) => {
            const lastActiveAt = (m as any).lastActiveAt as string | null | undefined;
            return !lastActiveAt || new Date(lastActiveAt).getTime() < cutoff;
          });
        }

        const total = filtered.length;
        const page = getSafePage(query.page);
        const pageSize = getSafePageSize(query.pageSize);
        const offset = (page - 1) * pageSize;
        const paged = filtered.slice(offset, offset + pageSize);

        const accounts = paged.map(toMailboxDetailRecord);

        return clone({ accounts, total });
      },
      async listAll() {
        return clone(Array.from(mailboxes.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      },
      async listPage(options) {
        const sortedMailboxes = Array.from(mailboxes.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const startIndex = (options.page - 1) * options.pageSize;
        return clone({
          latestMailbox: sortedMailboxes[0] ?? null,
          mailboxes: sortedMailboxes.slice(startIndex, startIndex + options.pageSize),
          page: options.page,
          pageSize: options.pageSize,
          total: sortedMailboxes.length
        });
      },
      async findById(id) {
        return clone(mailboxes.get(id) ?? null);
      },
      async findDetailById(id) {
        const record = mailboxes.get(id);
        return record ? clone(toMailboxDetailRecord(record)) : null;
      },
      async findByAddress(address) {
        return clone(
          Array.from(mailboxes.values()).find(
            (entry) =>
              entry.address === address &&
              ((entry as MailboxRecord & { status?: MailboxDetailRecord["status"] }).status ?? "enabled") !== "soft_deleted"
          ) ?? null
        );
      },
      async delete(id) {
        mailboxes.delete(id);
      }
    },
    messages: {
      async create(input) {
        const record: PersistedMessageRecord = {
          id: crypto.randomUUID(),
          ...input
        };
        messages.set(record.id, record);
        return clone(record);
      },
      async listForMailboxes(query) {
        if (query.mailboxIds.length === 0 && !query.includeUnmatched) {
          return {
            messages: [],
            page: getSafePage(query.page),
            pageSize: getSafePageSize(query.pageSize),
            summary: summarizeMessageRecords([]),
            total: 0
          };
        }

        const mailboxIds = new Set(query.mailboxIds);
        const filteredMessages = Array.from(messages.values())
          .filter((entry) => mailboxIds.has(entry.mailboxId) || (query.includeUnmatched && entry.mailboxId.startsWith("unmatched:")))
          .filter((entry) => matchesMessageFilter(entry, query.filter))
          .filter((entry) => matchesMessageSearch(entry, query.search))
          .filter((entry) => matchesMessageAdvancedFilters(entry, query))
          .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
        const page = getSafePage(query.page);
        const pageSize = getSafePageSize(query.pageSize);
        const startIndex = (page - 1) * pageSize;

        return clone({
          messages: filteredMessages.slice(startIndex, startIndex + pageSize),
          page,
          pageSize,
          summary: summarizeMessageRecords(filteredMessages),
          total: filteredMessages.length
        });
      },
      async listByMailbox(mailboxId) {
        return clone(
          Array.from(messages.values())
            .filter((entry) => entry.mailboxId === mailboxId)
            .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
        );
      },
      async findById(id) {
        return clone(messages.get(id) ?? null);
      },
      async listExpired(beforeIso) {
        return clone(Array.from(messages.values()).filter((entry) => entry.expiresAt <= beforeIso));
      },
      async deleteMany(ids) {
        for (const id of ids) messages.delete(id);
      }
    },
    attachments: {
      async createMany(messageId, nextAttachments) {
        attachments.set(messageId, clone(nextAttachments));
      },
      async listByMessage(messageId) {
        return clone(attachments.get(messageId) ?? []);
      },
      async listByMessageIds(messageIds) {
        return clone(messageIds.flatMap((messageId) => attachments.get(messageId) ?? []));
      },
      async deleteByMessageIds(messageIds) {
        for (const messageId of messageIds) attachments.delete(messageId);
      }
    },
    outboundMessages: {
      async create(input) {
        const record = {
          id: crypto.randomUUID(),
          ...input,
          createdAt: nowIso()
        };
        outboundMessages.push(record);
        return clone(record);
      },
      async listByMailbox(query) {
        const searchedMessages = outboundMessages
          .filter((entry) => entry.mailboxId === query.mailboxId)
          .filter((entry) => matchesOutboundSearch(entry, query.search))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const filteredMessages = searchedMessages.filter((entry) => matchesOutboundStatus(entry, query.status));
        const page = getSafePage(query.page);
        const pageSize = getSafePageSize(query.pageSize);
        const startIndex = (page - 1) * pageSize;

        return clone({
          messages: filteredMessages.slice(startIndex, startIndex + pageSize),
          page,
          pageSize,
          summary: {
            totalCount: searchedMessages.length,
            sentCount: searchedMessages.filter((entry) => entry.status === "sent").length,
            failedCount: searchedMessages.filter((entry) => entry.status === "failed").length
          },
          total: filteredMessages.length
        });
      },
      async findById(id) {
        return clone(outboundMessages.find((entry) => entry.id === id) ?? null);
      }
    },
    apiKeys: {
      async create(input) {
        const record: ApiKeyRecord = {
          id: crypto.randomUUID(),
          userId: input.userId,
          label: input.label,
          prefix: input.prefix,
          scopes: normalizeApiKeyScopes(input.scopes),
          keyHash: input.keyHash,
          createdAt: nowIso(),
          lastUsedAt: null,
          revokedAt: null
        };
        apiKeys.set(record.id, record);
        return clone(record);
      },
      async listByUser(userId) {
        return clone(Array.from(apiKeys.values()).filter((entry) => entry.userId === userId));
      },
      async findActiveByHash(hash) {
        return clone(
          Array.from(apiKeys.values()).find((entry) => entry.keyHash === hash && entry.revokedAt === null) ?? null
        );
      },
      async touch(id) {
        const key = apiKeys.get(id);
        if (!key) return;
        key.lastUsedAt = nowIso();
        apiKeys.set(id, key);
      },
      async revoke(id, userId) {
        const key = apiKeys.get(id);
        if (!key || key.userId !== userId) return;
        key.revokedAt = nowIso();
        apiKeys.set(id, key);
      }
    },
    telegram: {
      async upsert(input) {
        const existing = telegramSubscriptions.get(input.userId);
        const next: TelegramSubscriptionRecord = {
          id: existing?.id ?? crypto.randomUUID(),
          userId: input.userId,
          chatId: input.chatId,
          enabled: input.enabled,
          createdAt: existing?.createdAt ?? nowIso(),
          updatedAt: nowIso()
        };
        for (const [userId, subscription] of telegramSubscriptions) {
          if (userId !== input.userId && subscription.chatId === input.chatId) {
            telegramSubscriptions.delete(userId);
          }
        }
        telegramSubscriptions.set(input.userId, next);
        return clone(next);
      },
      async findByUserId(userId) {
        return clone(telegramSubscriptions.get(userId) ?? null);
      },
      async findByChatId(chatId) {
        const subscription = Array.from(telegramSubscriptions.values())
          .filter((entry) => entry.chatId === chatId)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
        return clone(subscription ?? null);
      }
    },
    quotas: {
      async getByUserId(userId, fallbackLimit, fallbackApiDailyLimit) {
        const existing = quotas.get(userId);
        if (existing) return clone(existing);
        const next: QuotaRecord = {
          userId,
          apiDailyLimit: fallbackApiDailyLimit,
          apiCallsToday: 0,
          dailyLimit: fallbackLimit,
          sendsToday: 0,
          disabled: false,
          updatedAt: nowIso()
        };
        quotas.set(userId, next);
        return clone(next);
      },
      async consumeApiCall(userId, fallbackLimit, fallbackApiDailyLimit) {
        const quota = quotas.get(userId) ?? {
          userId,
          apiDailyLimit: fallbackApiDailyLimit,
          apiCallsToday: 0,
          dailyLimit: fallbackLimit,
          sendsToday: 0,
          disabled: false,
          updatedAt: nowIso()
        };
        const today = new Date().toISOString().slice(0, 10);
        if (quota.updatedAt.slice(0, 10) !== today) {
          quota.sendsToday = 0;
          quota.apiCallsToday = 0;
        }
        if (quota.apiCallsToday >= quota.apiDailyLimit) {
          quotas.set(userId, clone(quota));
          return null;
        }
        quota.apiCallsToday += 1;
        quota.updatedAt = nowIso();
        quotas.set(userId, clone(quota));
        return clone(quota);
      },
      async consumeOutboundSend(userId, fallbackLimit, fallbackApiDailyLimit) {
        const quota = quotas.get(userId) ?? {
          userId,
          apiDailyLimit: fallbackApiDailyLimit,
          apiCallsToday: 0,
          dailyLimit: fallbackLimit,
          sendsToday: 0,
          disabled: false,
          updatedAt: nowIso()
        };
        const today = new Date().toISOString().slice(0, 10);
        if (quota.updatedAt.slice(0, 10) !== today) {
          quota.sendsToday = 0;
          quota.apiCallsToday = 0;
        }
        if (quota.disabled || quota.sendsToday >= quota.dailyLimit) {
          quotas.set(userId, clone(quota));
          return null;
        }
        quota.sendsToday += 1;
        quota.updatedAt = nowIso();
        quotas.set(userId, clone(quota));
        return clone(quota);
      },
      async save(quota) {
        quotas.set(quota.userId, clone(quota));
      }
    },
    settings: {
      async getFeatureToggles(defaults) {
        return {
          aiEnabled: settings.get("aiEnabled") ?? defaults.aiEnabled,
          telegramEnabled: settings.get("telegramEnabled") ?? defaults.telegramEnabled,
          outboundEnabled: settings.get("outboundEnabled") ?? defaults.outboundEnabled,
          mailboxCreationEnabled: settings.get("mailboxCreationEnabled") ?? defaults.mailboxCreationEnabled
        };
      },
      async saveFeatureToggles(next) {
        settings.set("aiEnabled", next.aiEnabled);
        settings.set("telegramEnabled", next.telegramEnabled);
        settings.set("outboundEnabled", next.outboundEnabled);
        settings.set("mailboxCreationEnabled", next.mailboxCreationEnabled);
        return clone(next);
      }
    },
    runtimeSettings: {
      async get() {
        return clone(runtimeSettings);
      },
      async save(record) {
        runtimeSettings = clone({
          ...record,
          updatedAt: nowIso()
        });
        return clone(runtimeSettings);
      }
    },
    mailDomains: {
      async list(defaults) {
        return clone(mailDomains ?? defaults);
      },
      async saveAll(next) {
        mailDomains = clone(next);
        return clone(next);
      }
    },
    dictionaries: {
      async listGroups(groupKeys, options) {
        return clone(
          buildDictionaryCatalog({
            groupKeys,
            includeDisabled: options?.includeDisabled,
            items: Array.from(dictionaryItems.values())
          })
        );
      },
      async updateItem(groupKey, value, input) {
        const key = dictionaryItemKey(groupKey, value);
        const existing = dictionaryItems.get(key) ?? findDefaultDictionaryItem(groupKey, value);
        if (!existing) return null;
        const next = applyDictionaryItemUpdate(existing, {
          ...input,
          metadata: typeof input.metadata === "undefined" ? existing.metadata : input.metadata
        });
        next.updatedAt = nowIso();
        dictionaryItems.set(key, clone(next));
        return clone(next);
      }
    },
    audit: {
      async record(event) {
        auditEvents.push({
          id: crypto.randomUUID(),
          createdAt: nowIso(),
          ...event
        });
      },
      async countByActorSince(actorId, eventType, sinceIso) {
        return auditEvents.filter(
          (entry) => entry.actorId === actorId && entry.eventType === eventType && entry.createdAt >= sinceIso
        ).length;
      },
      async listByActorAndTypes(actorId, eventTypes, limit) {
        const eventTypeSet = new Set(eventTypes);
        return clone(
          auditEvents
            .filter((entry) => entry.actorId === actorId && eventTypeSet.has(entry.eventType))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, limit)
        );
      },
      async listRecent(options) {
        const eventTypeSet = new Set(options?.eventTypes ?? []);
        const limit = getSafePageSize(options?.limit ?? 30);
        return clone(
          auditEvents
            .filter((entry) => eventTypeSet.size === 0 || eventTypeSet.has(entry.eventType))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, limit)
        );
      }
    },
    cleanupRuns: {
      async record(input) {
        const record = {
          id: crypto.randomUUID(),
          ...input
        };
        cleanupRuns.push(record);
        return clone(record);
      },
      async listRecent(limit) {
        return clone(
          cleanupRuns
            .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
            .slice(0, getSafePageSize(limit))
        );
      }
    },
    accountSettings: {
      async get() {
        return clone(accountSettingsRecord);
      },
      async save(record) {
        accountSettingsRecord = {
          id: "account_settings",
          updatedAt: nowIso(),
          ...record
        };
        return clone(accountSettingsRecord);
      }
    },
    mailSettings: {
      async get() {
        return clone(mailSettingsRecord);
      },
      async save(record) {
        mailSettingsRecord = {
          id: "mail_settings",
          updatedAt: nowIso(),
          ...record
        };
        return clone(mailSettingsRecord);
      }
    },
    webhookEndpoints: {
      async listByUser(userId) {
        return clone(Array.from(webhookEndpoints.values()).filter((entry) => entry.userId === userId));
      },
      async listByUserPage(userId, options) {
        const sorted = Array.from(webhookEndpoints.values())
          .filter((entry) => entry.userId === userId)
          .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
        const startIndex = (options.page - 1) * options.pageSize;
        return {
          endpoints: clone(sorted.slice(startIndex, startIndex + options.pageSize)),
          total: sorted.length,
          page: options.page,
          pageSize: options.pageSize
        };
      },
      async create(input) {
        const now = nowIso();
        const record = {
          id: crypto.randomUUID(),
          userId: input.userId,
          name: input.name,
          url: input.url,
          eventsJson: input.eventsJson,
          signingSecret: crypto.randomUUID().replaceAll("-", ""),
          enabled: input.enabled,
          createdAt: now,
          updatedAt: now
        };
        webhookEndpoints.set(record.id, record);
        return clone(record);
      },
      async update(id, userId, input) {
        const existing = webhookEndpoints.get(id);
        if (!existing || existing.userId !== userId) return null;
        const next = {
          ...existing,
          name: input.name,
          url: input.url,
          eventsJson: input.eventsJson,
          enabled: input.enabled,
          updatedAt: nowIso()
        };
        webhookEndpoints.set(id, next);
        return clone(next);
      },
      async rotateSecret(id, userId) {
        const existing = webhookEndpoints.get(id);
        if (!existing || existing.userId !== userId) return null;
        const next = {
          ...existing,
          signingSecret: crypto.randomUUID().replaceAll("-", ""),
          updatedAt: nowIso()
        };
        webhookEndpoints.set(id, next);
        return clone(next);
      },
      async delete(id, userId) {
        const existing = webhookEndpoints.get(id);
        if (existing?.userId === userId) {
          webhookEndpoints.delete(id);
          for (let index = webhookDeliveries.length - 1; index >= 0; index -= 1) {
            if (webhookDeliveries[index].endpointId === id) webhookDeliveries.splice(index, 1);
          }
        }
      }
    },
    webhookDeliveries: {
      async listByUser(userId) {
        const endpointIds = new Set(Array.from(webhookEndpoints.values()).filter((entry) => entry.userId === userId).map((entry) => entry.id));
        return clone(webhookDeliveries.filter((entry) => endpointIds.has(entry.endpointId)));
      },
      async listByUserPage(userId, query) {
        const endpointIds = new Set(Array.from(webhookEndpoints.values()).filter((entry) => entry.userId === userId).map((entry) => entry.id));
        const filtered = webhookDeliveries
          .filter((entry) => endpointIds.has(entry.endpointId))
          .filter((entry) => !query.endpointId || entry.endpointId === query.endpointId)
          .filter((entry) => !query.status || query.status === "all" || entry.status === query.status)
          .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
        const startIndex = (query.page - 1) * query.pageSize;
        return clone({
          deliveries: filtered.slice(startIndex, startIndex + query.pageSize),
          total: filtered.length,
          page: query.page,
          pageSize: query.pageSize
        });
      },
      async findByUser(id, userId) {
        const endpointIds = new Set(Array.from(webhookEndpoints.values()).filter((entry) => entry.userId === userId).map((entry) => entry.id));
        return clone(webhookDeliveries.find((entry) => entry.id === id && endpointIds.has(entry.endpointId)) ?? null);
      },
      async record(input) {
        const { createdAt, id, ...recordInput } = input;
        const record = {
          id: id ?? crypto.randomUUID(),
          createdAt: createdAt ?? nowIso(),
          ...recordInput
        };
        webhookDeliveries.push(record);
        return clone(record);
      }
    },
    notificationRules: {
      async listByUser(userId) {
        return clone(
          Array.from(notificationRules.values())
            .filter((entry) => entry.userId === userId)
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        );
      },
      async create(input) {
        const record: NotificationRuleRecord = {
          id: crypto.randomUUID(),
          createdAt: nowIso(),
          updatedAt: nowIso(),
          ...input
        };
        notificationRules.set(record.id, record);
        return clone(record);
      },
      async update(id, userId, input) {
        const existing = notificationRules.get(id);
        if (!existing || existing.userId !== userId) return null;
        const next: NotificationRuleRecord = {
          ...existing,
          ...input,
          updatedAt: nowIso()
        };
        notificationRules.set(id, next);
        return clone(next);
      },
      async delete(id, userId) {
        const existing = notificationRules.get(id);
        if (existing?.userId === userId) notificationRules.delete(id);
      }
    },
    announcements: {
      async list() {
        return clone([...announcements].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.publishedAt.localeCompare(a.publishedAt)));
      },
      async listPage(options) {
        const filteredAnnouncements = filterAnnouncements([...announcements], options);
        return {
          announcements: clone(paginateAnnouncements(filteredAnnouncements, options)),
          total: filteredAnnouncements.length,
          page: options.page,
          pageSize: options.pageSize
        };
      },
      async listFeatured(options) {
        return clone(getFeaturedAnnouncements([...announcements], options));
      },
      async summary(options) {
        return getAnnouncementSummary([...announcements], options);
      },
      async create(input) {
        const now = nowIso();
        const record = {
          id: crypto.randomUUID(),
          publishedAt: now,
          updatedAt: now,
          ...input
        };
        announcements.unshift(record);
        return clone(record);
      },
      async find(id) {
        return clone(announcements.find((announcement) => announcement.id === id) ?? null);
      },
      async update(id, input) {
        const announcement = announcements.find((record) => record.id === id);
        if (!announcement) return null;
        Object.assign(announcement, input, { updatedAt: nowIso() });
        return clone(announcement);
      },
      async delete(id) {
        const index = announcements.findIndex((announcement) => announcement.id === id);
        if (index < 0) return false;
        announcements.splice(index, 1);
        for (let receiptIndex = announcementReceipts.length - 1; receiptIndex >= 0; receiptIndex -= 1) {
          if (announcementReceipts[receiptIndex]?.announcementId === id) {
            announcementReceipts.splice(receiptIndex, 1);
          }
        }
        return true;
      },
      async acknowledge(announcementId, userId) {
        const acknowledgedAt = nowIso();
        const existing = announcementReceipts.find(
          (receipt) => receipt.announcementId === announcementId && receipt.userId === userId
        );
        if (existing) {
          existing.acknowledgedAt = acknowledgedAt;
          return clone(existing);
        }
        const receipt = { announcementId, userId, acknowledgedAt };
        announcementReceipts.push(receipt);
        return clone(receipt);
      },
      async listReceiptsByUser(userId, announcementIds) {
        const idSet = new Set(announcementIds);
        return clone(announcementReceipts.filter((receipt) => receipt.userId === userId && idSet.has(receipt.announcementId)));
      },
      async countReceipts(announcementIds) {
        const idSet = new Set(announcementIds);
        return announcementReceipts.reduce<Record<string, number>>((counts, receipt) => {
          if (!idSet.has(receipt.announcementId)) return counts;
          counts[receipt.announcementId] = (counts[receipt.announcementId] ?? 0) + 1;
          return counts;
        }, {});
      }
    }
  };
}
