import type { FeatureToggles, MailDomainSummary } from "@wemail/shared";

export type { FeatureToggles } from "@wemail/shared";

export type RateLimiterBinding = {
  limit: (request: { key: string }) => Promise<{ success: boolean }>;
};

export type TelegramApiClient = {
  sendMessage: (params: { chatId: string; text: string }) => Promise<{ ok: boolean }>;
};

export type ResendClient = {
  sendEmail: (params: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
  }) => Promise<{ success: boolean; error?: string }>;
};

export type AttachmentRecord = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  key: string;
};

export type PersistedMessageRecord = {
  id: string;
  mailboxId: string;
  fromAddress: string;
  subject: string;
  previewText: string;
  bodyText: string;
  extractionJson: string;
  oversizeStatus: string | null;
  attachmentCount: number;
  receivedAt: string;
  expiresAt: string;
};

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  role: "admin" | "member";
  createdAt: string;
};

export type SessionRecord = {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
};

export type InviteRecord = {
  id: string;
  code: string;
  createdByUserId: string | null;
  redeemedByUserId: string | null;
  redeemedAt: string | null;
  disabledAt: string | null;
  createdAt: string;
};

export type MailboxRecord = {
  id: string;
  userId: string;
  address: string;
  label: string;
  createdAt: string;
};

export type ApiKeyRecord = {
  id: string;
  userId: string;
  label: string;
  prefix: string;
  keyHash: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type TelegramSubscriptionRecord = {
  id: string;
  userId: string;
  chatId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type QuotaRecord = {
  userId: string;
  dailyLimit: number;
  sendsToday: number;
  disabled: boolean;
  updatedAt: string;
};

export type AuditEventRecord = {
  id: string;
  actorType: string;
  actorId: string;
  eventType: string;
  payloadJson: string;
  createdAt: string;
};

export type AccountSettingsRecord = {
  id: string;
  creationJson: string;
  lifecycleJson: string;
  protectionJson: string;
  updatedAt: string;
};

export type MailSettingsRecord = {
  id: string;
  senderRulesJson: string;
  routingJson: string;
  workspaceDefaultsJson: string;
  updatedAt: string;
};

export type WebhookEndpointRecord = {
  id: string;
  userId: string;
  name: string;
  url: string;
  eventsJson: string;
  signingSecret: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WebhookDeliveryRecord = {
  id: string;
  endpointId: string;
  eventType: string;
  status: string;
  statusCode: number | null;
  durationMs: number | null;
  errorText: string | null;
  payloadJson: string;
  createdAt: string;
};

export type AnnouncementRecord = {
  id: string;
  title: string;
  summary: string;
  type: string;
  status: string;
  audience: string;
  priority: string;
  authorUserId: string | null;
  authorLabel: string;
  tagsJson: string;
  pinned: boolean;
  startAt: string | null;
  endAt: string | null;
  publishedAt: string;
  updatedAt: string;
};

export interface AppStore {
  users: {
    count: () => Promise<number>;
    findByEmail: (email: string) => Promise<UserRecord | null>;
    findById: (id: string) => Promise<UserRecord | null>;
    create: (input: { email: string; passwordHash: string; role: UserRecord["role"] }) => Promise<UserRecord>;
    updateRole: (id: string, role: UserRecord["role"]) => Promise<UserRecord | null>;
    list: () => Promise<UserRecord[]>;
  };
  sessions: {
    create: (input: { userId: string; expiresAt: string }) => Promise<SessionRecord>;
    findById: (id: string) => Promise<SessionRecord | null>;
    delete: (id: string) => Promise<void>;
  };
  invites: {
    create: (input: { code: string; createdByUserId: string | null }) => Promise<InviteRecord>;
    findByCode: (code: string) => Promise<InviteRecord | null>;
    redeem: (code: string, userId: string) => Promise<InviteRecord>;
    list: () => Promise<InviteRecord[]>;
    disable: (id: string) => Promise<void>;
  };
  mailboxes: {
    countByUser: (userId: string) => Promise<number>;
    create: (input: { userId: string; address: string; label: string }) => Promise<MailboxRecord>;
    listByUser: (userId: string) => Promise<MailboxRecord[]>;
    listAll: () => Promise<MailboxRecord[]>;
    findById: (id: string) => Promise<MailboxRecord | null>;
    findByAddress: (address: string) => Promise<MailboxRecord | null>;
    delete: (id: string) => Promise<void>;
  };
  messages: {
    create: (input: Omit<PersistedMessageRecord, "id">) => Promise<PersistedMessageRecord>;
    listByMailbox: (mailboxId: string) => Promise<PersistedMessageRecord[]>;
    findById: (id: string) => Promise<PersistedMessageRecord | null>;
    listExpired: (beforeIso: string) => Promise<PersistedMessageRecord[]>;
    deleteMany: (ids: string[]) => Promise<void>;
  };
  attachments: {
    createMany: (messageId: string, attachments: AttachmentRecord[]) => Promise<void>;
    listByMessage: (messageId: string) => Promise<AttachmentRecord[]>;
    listByMessageIds: (messageIds: string[]) => Promise<AttachmentRecord[]>;
    deleteByMessageIds: (messageIds: string[]) => Promise<void>;
  };
  outboundMessages: {
    create: (input: {
      mailboxId: string;
      toAddress: string;
      subject: string;
      status: "sent" | "failed";
      errorText: string | null;
    }) => Promise<void>;
    listByMailbox: (mailboxId: string) => Promise<
      {
        id: string;
        mailboxId: string;
        toAddress: string;
        subject: string;
        status: "sent" | "failed";
        errorText: string | null;
        createdAt: string;
      }[]
    >;
  };
  apiKeys: {
    create: (input: {
      userId: string;
      label: string;
      prefix: string;
      keyHash: string;
    }) => Promise<ApiKeyRecord>;
    listByUser: (userId: string) => Promise<ApiKeyRecord[]>;
    findActiveByHash: (hash: string) => Promise<ApiKeyRecord | null>;
    touch: (id: string) => Promise<void>;
    revoke: (id: string, userId: string) => Promise<void>;
  };
  telegram: {
    upsert: (input: { userId: string; chatId: string; enabled: boolean }) => Promise<TelegramSubscriptionRecord>;
    findByUserId: (userId: string) => Promise<TelegramSubscriptionRecord | null>;
  };
  quotas: {
    getByUserId: (userId: string, fallbackLimit: number) => Promise<QuotaRecord>;
    save: (quota: QuotaRecord) => Promise<void>;
  };
  settings: {
    getFeatureToggles: (defaults: FeatureToggles) => Promise<FeatureToggles>;
    saveFeatureToggles: (toggles: FeatureToggles) => Promise<FeatureToggles>;
  };
  mailDomains: {
    list: (defaults: MailDomainSummary[]) => Promise<MailDomainSummary[]>;
    saveAll: (domains: MailDomainSummary[]) => Promise<MailDomainSummary[]>;
  };
  audit: {
    record: (event: Omit<AuditEventRecord, "id" | "createdAt">) => Promise<void>;
    countByActorSince: (actorId: string, eventType: string, sinceIso: string) => Promise<number>;
  };
  accountSettings: {
    get: () => Promise<AccountSettingsRecord | null>;
    save: (record: Omit<AccountSettingsRecord, "id" | "updatedAt">) => Promise<AccountSettingsRecord>;
  };
  mailSettings: {
    get: () => Promise<MailSettingsRecord | null>;
    save: (record: Omit<MailSettingsRecord, "id" | "updatedAt">) => Promise<MailSettingsRecord>;
  };
  webhookEndpoints: {
    listByUser: (userId: string) => Promise<WebhookEndpointRecord[]>;
    create: (input: { userId: string; name: string; url: string; eventsJson: string; enabled: boolean }) => Promise<WebhookEndpointRecord>;
    update: (id: string, userId: string, input: { name: string; url: string; eventsJson: string; enabled: boolean }) => Promise<WebhookEndpointRecord | null>;
    delete: (id: string, userId: string) => Promise<void>;
  };
  webhookDeliveries: {
    listByUser: (userId: string) => Promise<WebhookDeliveryRecord[]>;
    record: (input: Omit<WebhookDeliveryRecord, "id" | "createdAt">) => Promise<WebhookDeliveryRecord>;
  };
  announcements: {
    list: () => Promise<AnnouncementRecord[]>;
    create: (input: Omit<AnnouncementRecord, "id" | "publishedAt" | "updatedAt">) => Promise<AnnouncementRecord>;
  };
}

export type AppBindings = {
  ENVIRONMENT?: string;
  APP_NAME: string;
  COOKIE_NAME: string;
  COOKIE_SECURE?: string;
  DEFAULT_MAIL_DOMAIN: string;
  MAILBOX_LIMIT: string;
  MESSAGE_RETENTION_DAYS: string;
  OUTBOUND_DAILY_LIMIT: string;
  AI_FALLBACK_LIMIT: string;
  MAX_ATTACHMENT_BYTES: string;
  MAX_TOTAL_ATTACHMENT_BYTES: string;
  ENABLE_AI: string;
  ENABLE_TELEGRAM: string;
  ENABLE_OUTBOUND: string;
  ENABLE_MAILBOX_CREATION: string;
  ADMIN_EMAILS: string;
  SESSION_TTL_HOURS?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  TELEGRAM_BOT_TOKEN?: string;
  RATE_LIMITER?: RateLimiterBinding;
  DB?: D1Database;
  ATTACHMENTS?: R2Bucket;
  AI?: Ai;
};
