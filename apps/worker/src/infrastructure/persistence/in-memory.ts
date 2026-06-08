import type { MailDomainSummary } from "@wemail/shared";

import type {
  AccountSettingsRecord,
  AnnouncementRecord,
  ApiKeyRecord,
  AppStore,
  AttachmentRecord,
  AuditEventRecord,
  FeatureToggles,
  InviteRecord,
  MailSettingsRecord,
  MailboxDetailRecord,
  MailboxDetailListQuery,
  MailboxRecord,
  PersistedMessageRecord,
  QuotaRecord,
  SessionRecord,
  TelegramSubscriptionRecord,
  UserRecord,
  WebhookDeliveryRecord,
  WebhookEndpointRecord
} from "../../core/bindings";

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

export function createInMemoryStore(): AppStore {
  const users = new Map<string, UserRecord>();
  const sessions = new Map<string, SessionRecord>();
  const invites = new Map<string, InviteRecord>();
  const mailboxes = new Map<string, MailboxRecord>();
  const messages = new Map<string, PersistedMessageRecord>();
  const attachments = new Map<string, AttachmentRecord[]>();
  const outboundMessages: Array<{
    id: string;
    mailboxId: string;
    toAddress: string;
    subject: string;
    status: "sent" | "failed";
    errorText: string | null;
    createdAt: string;
  }> = [];
  const apiKeys = new Map<string, ApiKeyRecord>();
  const telegramSubscriptions = new Map<string, TelegramSubscriptionRecord>();
  const quotas = new Map<string, QuotaRecord>();
  const settings = new Map<keyof FeatureToggles, boolean>();
  let mailDomains: MailDomainSummary[] | null = null;
  const auditEvents: AuditEventRecord[] = [];
  let accountSettingsRecord: AccountSettingsRecord | null = null;
  let mailSettingsRecord: MailSettingsRecord | null = null;
  const webhookEndpoints = new Map<string, WebhookEndpointRecord>();
  const webhookDeliveries: WebhookDeliveryRecord[] = [];
  const announcements: AnnouncementRecord[] = [];
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
        quotas.delete(id);
        telegramSubscriptions.delete(id);
        for (const [sessionId, session] of sessions) {
          if (session.userId === id) sessions.delete(sessionId);
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
          .sort((a, b) => a.email.localeCompare(b.email));
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
    sessions: {
      async create(input) {
        const record: SessionRecord = {
          id: `${crypto.randomUUID()}-${Math.random().toString(36).slice(2, 10)}`,
          userId: input.userId,
          expiresAt: input.expiresAt,
          createdAt: nowIso()
        };
        sessions.set(record.id, record);
        return clone(record);
      },
      async findById(id) {
        return clone(sessions.get(id) ?? null);
      },
      async delete(id) {
        sessions.delete(id);
      },
      async deleteByUserId(userId) {
        for (const [sessionId, session] of sessions) {
          if (session.userId === userId) sessions.delete(sessionId);
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
          createdAt: nowIso()
        };
        invites.set(record.id, record);
        return clone(record);
      },
      async findByCode(code) {
        return clone(Array.from(invites.values()).find((entry) => entry.code === code) ?? null);
      },
      async findById(id) {
        return clone(invites.get(id) ?? null);
      },
      async redeem(code, userId) {
        const invite = Array.from(invites.values()).find((entry) => entry.code === code);
        if (!invite) throw new Error("Invite not found");
        invite.redeemedByUserId = userId;
        invite.redeemedAt = nowIso();
        invites.set(invite.id, invite);
        return clone(invite);
      },
      async list() {
        return clone(Array.from(invites.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      },
      async listPage(options) {
        const sortedInvites = Array.from(invites.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const startIndex = (options.page - 1) * options.pageSize;
        return clone({
          available: sortedInvites.filter((invite) => !invite.redeemedAt && !invite.disabledAt).length,
          invites: sortedInvites.slice(startIndex, startIndex + options.pageSize),
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
        return Array.from(mailboxes.values()).filter((entry) => entry.userId === userId).length;
      },
      async create(input) {
        const record: MailboxRecord & {
          createdBy: string;
          createdByName: string | null;
          lastActiveAt: string | null;
          status: MailboxDetailRecord["status"];
        } = {
          id: crypto.randomUUID(),
          userId: input.userId,
          address: input.address,
          label: input.label,
          status: "enabled",
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
        mailboxes.set(id, record);
        return clone(toMailboxDetailRecord(record));
      },
      async listByUser(userId) {
        return clone(Array.from(mailboxes.values()).filter((entry) => entry.userId === userId));
      },
      async listAllWithDetails(query: MailboxDetailListQuery) {
        let filtered = Array.from(mailboxes.values());

        if (query.search) {
          const searchLower = query.search.toLowerCase();
          filtered = filtered.filter(
            (m) =>
              m.id.toLowerCase().includes(searchLower) ||
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
      async findByAddress(address) {
        return clone(Array.from(mailboxes.values()).find((entry) => entry.address === address) ?? null);
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
        outboundMessages.push({
          id: crypto.randomUUID(),
          mailboxId: input.mailboxId,
          toAddress: input.toAddress,
          subject: input.subject,
          status: input.status,
          errorText: input.errorText,
          createdAt: nowIso()
        });
      },
      async listByMailbox(mailboxId) {
        return clone(outboundMessages.filter((entry) => entry.mailboxId === mailboxId));
      }
    },
    apiKeys: {
      async create(input) {
        const record: ApiKeyRecord = {
          id: crypto.randomUUID(),
          userId: input.userId,
          label: input.label,
          prefix: input.prefix,
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
        telegramSubscriptions.set(input.userId, next);
        return clone(next);
      },
      async findByUserId(userId) {
        return clone(telegramSubscriptions.get(userId) ?? null);
      }
    },
    quotas: {
      async getByUserId(userId, fallbackLimit) {
        const existing = quotas.get(userId);
        if (existing) return clone(existing);
        const next: QuotaRecord = {
          userId,
          dailyLimit: fallbackLimit,
          sendsToday: 0,
          disabled: false,
          updatedAt: nowIso()
        };
        quotas.set(userId, next);
        return clone(next);
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
    mailDomains: {
      async list(defaults) {
        return clone(mailDomains ?? defaults);
      },
      async saveAll(next) {
        mailDomains = clone(next);
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
      async delete(id, userId) {
        const existing = webhookEndpoints.get(id);
        if (existing?.userId === userId) webhookEndpoints.delete(id);
      }
    },
    webhookDeliveries: {
      async listByUser(userId) {
        const endpointIds = new Set(Array.from(webhookEndpoints.values()).filter((entry) => entry.userId === userId).map((entry) => entry.id));
        return clone(webhookDeliveries.filter((entry) => endpointIds.has(entry.endpointId)));
      },
      async record(input) {
        const record = {
          id: crypto.randomUUID(),
          createdAt: nowIso(),
          ...input
        };
        webhookDeliveries.push(record);
        return clone(record);
      }
    },
    announcements: {
      async list() {
        return clone([...announcements].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)));
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
      }
    }
  };
}
