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
      async redeem(code, userId) {
        const invite = Array.from(invites.values()).find((entry) => entry.code === code);
        if (!invite) throw new Error("Invite not found");
        invite.redeemedByUserId = userId;
        invite.redeemedAt = nowIso();
        invites.set(invite.id, invite);
        return clone(invite);
      },
      async list() {
        return clone(Array.from(invites.values()));
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
        const record: MailboxRecord = {
          id: crypto.randomUUID(),
          userId: input.userId,
          address: input.address,
          label: input.label,
          createdAt: nowIso()
        };
        mailboxes.set(record.id, record);
        return clone(record);
      },
      async listByUser(userId) {
        return clone(Array.from(mailboxes.values()).filter((entry) => entry.userId === userId));
      },
      async listAll() {
        return clone(Array.from(mailboxes.values()));
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
