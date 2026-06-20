import type {
  DictionaryCatalogGroup,
  DictionaryItemSummary,
  DictionaryItemUpdateInput,
  FeatureToggles,
  MailDomainSummary,
  MailboxStatus,
  MessageFilter,
  MessageListSummary,
  OutboundListStatus,
  OutboundListSummary,
  UserStatus
} from "@wemail/shared";

export type { FeatureToggles } from "@wemail/shared";

export type RateLimiterBinding = {
  limit: (request: { key: string }) => Promise<{ success: boolean }>;
};

export type TelegramApiClient = {
  sendMessage: (params: { chatId: string; text: string }) => Promise<{ ok: boolean }>;
  getChat: (params: { chatId: string }) => Promise<{ ok: boolean; description: string | null }>;
};

export type ResendClient = {
  sendEmail: (params: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
  }) => Promise<{ success: boolean; error?: string; messageId?: string; responsePayload?: unknown }>;
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
  toAddress?: string | null;
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
  name: string;
  passwordHash: string;
  role: "admin" | "member";
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
};

export type UserListOptions = {
  page: number;
  pageSize: number;
  search?: string;
  role?: UserRecord["role"];
  status?: UserRecord["status"];
};

export type UserListResult = {
  users: UserRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export type UserSummaryStats = {
  active: number;
  total: number;
};

export type PageListOptions = {
  page: number;
  pageSize: number;
};

export type AnnouncementListScope = "visible" | "manage";

export type AnnouncementListOptions = PageListOptions & {
  q?: string;
  scope?: AnnouncementListScope;
  status?: string;
  time?: "7d" | "30d";
  type?: string;
  userRole?: UserRecord["role"];
};

export type AnnouncementVisibilityOptions = {
  scope?: AnnouncementListScope;
  userRole?: UserRecord["role"];
};

export type MessageRecordListQuery = {
  mailboxIds: string[];
  includeUnmatched?: boolean;
  page: number;
  pageSize: number;
  search?: string;
  filter?: MessageFilter;
};

export type MessageRecordListResult = {
  messages: PersistedMessageRecord[];
  page: number;
  pageSize: number;
  summary: MessageListSummary;
  total: number;
};

export type OutboundMessageRecord = {
  id: string;
  mailboxId: string;
  fromAddress: string;
  toAddress: string;
  subject: string;
  bodyText: string;
  status: "sent" | "failed";
  errorText: string | null;
  providerMessageId: string | null;
  requestPayloadJson: string;
  responsePayloadJson: string | null;
  createdAt: string;
};

export type OutboundMessageListQuery = {
  mailboxId: string;
  page: number;
  pageSize: number;
  search?: string;
  status?: OutboundListStatus;
};

export type OutboundMessageListResult = {
  messages: OutboundMessageRecord[];
  page: number;
  pageSize: number;
  summary: OutboundListSummary;
  total: number;
};

export type InviteListResult = {
  available: number;
  invites: InviteRecord[];
  page: number;
  pageSize: number;
  total: number;
};

export type MailboxListResult = {
  latestMailbox: MailboxRecord | null;
  mailboxes: MailboxRecord[];
  page: number;
  pageSize: number;
  total: number;
};

export type SessionRecord = {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
};

export type UserPreferencesRecord = {
  userId: string;
  bio: string;
  locale: string;
  timezone: string;
  dateFormat: string;
  landingPage: string;
  density: string;
  updatedAt: string;
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

export type MailboxDetailRecord = {
  id: string;
  userId: string;
  address: string;
  label: string;
  status: string;
  tags: string[];
  createdBy: string | null;
  createdByName: string | null;
  lastActiveAt: string | null;
  deletedAt: string | null;
  messageCount: number;
  outboundCount: number;
  createdAt: string;
};

export type MailboxDetailListResult = {
  accounts: MailboxDetailRecord[];
  total: number;
};

export type MailboxDetailListQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  activeRange?: "7d" | "30d" | "90d";
  createdBy?: string;
  inactiveDays?: number;
  quickFilter?: "anomaly" | "inactive";
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
  apiDailyLimit: number;
  apiCallsToday: number;
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

export type RuntimeSettingsRecord = {
  mailboxLimit: string;
  messageRetentionDays: string;
  outboundDailyLimit: string;
  apiDailyLimit: string;
  maxAttachmentBytes: string;
  maxTotalAttachmentBytes: string;
  aiFallbackLimit: string;
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

export type WebhookEndpointListResult = {
  endpoints: WebhookEndpointRecord[];
  total: number;
  page: number;
  pageSize: number;
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
  responseText: string | null;
  createdAt: string;
};

export type WebhookDeliveryListStatus = "all" | "success" | "failed";

export type WebhookDeliveryListQuery = PageListOptions & {
  endpointId?: string;
  status?: WebhookDeliveryListStatus;
};

export type WebhookDeliveryListResult = {
  deliveries: WebhookDeliveryRecord[];
  total: number;
  page: number;
  pageSize: number;
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

export type AnnouncementReceiptRecord = {
  announcementId: string;
  userId: string;
  acknowledgedAt: string;
};

export type AnnouncementListResult = {
  announcements: AnnouncementRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export type AnnouncementSummaryItem = {
  label: string;
  value: number;
};

export interface AppStore {
  users: {
    count: () => Promise<number>;
    countActiveByRole: (role?: UserRecord["role"]) => Promise<number>;
    findByEmail: (email: string) => Promise<UserRecord | null>;
    findById: (id: string) => Promise<UserRecord | null>;
    create: (input: { email: string; name: string; passwordHash: string; role: UserRecord["role"] }) => Promise<UserRecord>;
    updateProfile: (id: string, input: { name: string }) => Promise<UserRecord | null>;
    updateRole: (id: string, role: UserRecord["role"]) => Promise<UserRecord | null>;
    updatePasswordHash: (id: string, passwordHash: string) => Promise<UserRecord | null>;
    updateStatus: (id: string, status: UserRecord["status"]) => Promise<UserRecord | null>;
    delete: (id: string) => Promise<boolean>;
    list: (options: UserListOptions) => Promise<UserListResult>;
    summary: () => Promise<UserSummaryStats>;
  };
  userPreferences: {
    getByUserId: (userId: string) => Promise<UserPreferencesRecord | null>;
    save: (record: Omit<UserPreferencesRecord, "updatedAt">) => Promise<UserPreferencesRecord>;
  };
  sessions: {
    create: (input: { userId: string; expiresAt: string }) => Promise<SessionRecord>;
    findById: (id: string) => Promise<SessionRecord | null>;
    delete: (id: string) => Promise<void>;
    deleteByUserId: (userId: string) => Promise<void>;
  };
  invites: {
    create: (input: { code: string; createdByUserId: string | null }) => Promise<InviteRecord>;
    findByCode: (code: string) => Promise<InviteRecord | null>;
    findById: (id: string) => Promise<InviteRecord | null>;
    redeem: (code: string, userId: string) => Promise<InviteRecord>;
    list: () => Promise<InviteRecord[]>;
    listPage: (options: PageListOptions) => Promise<InviteListResult>;
    disable: (id: string) => Promise<void>;
  };
  mailboxes: {
    countByUser: (userId: string) => Promise<number>;
    create: (input: {
      userId: string;
      address: string;
      label: string;
      lastActiveAt?: string | null;
      status?: MailboxStatus;
      tags?: string[];
    }) => Promise<MailboxRecord>;
    update: (
      id: string,
      input: { label?: string; status?: MailboxStatus; tags?: string[]; deletedAt?: string | null; lastActiveAt?: string | null }
    ) => Promise<MailboxDetailRecord | null>;
    listByUser: (userId: string) => Promise<MailboxRecord[]>;
    listAll: () => Promise<MailboxRecord[]>;
    listAllWithDetails: (query: MailboxDetailListQuery) => Promise<MailboxDetailListResult>;
    listPage: (options: PageListOptions) => Promise<MailboxListResult>;
    findById: (id: string) => Promise<MailboxRecord | null>;
    findDetailById: (id: string) => Promise<MailboxDetailRecord | null>;
    findByAddress: (address: string) => Promise<MailboxRecord | null>;
    delete: (id: string) => Promise<void>;
  };
  messages: {
    create: (input: Omit<PersistedMessageRecord, "id">) => Promise<PersistedMessageRecord>;
    listForMailboxes: (query: MessageRecordListQuery) => Promise<MessageRecordListResult>;
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
      fromAddress: string;
      toAddress: string;
      subject: string;
      bodyText: string;
      status: "sent" | "failed";
      errorText: string | null;
      providerMessageId: string | null;
      requestPayloadJson: string;
      responsePayloadJson: string | null;
    }) => Promise<OutboundMessageRecord>;
    listByMailbox: (query: OutboundMessageListQuery) => Promise<OutboundMessageListResult>;
    findById: (id: string) => Promise<OutboundMessageRecord | null>;
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
    getByUserId: (userId: string, fallbackLimit: number, fallbackApiDailyLimit: number) => Promise<QuotaRecord>;
    consumeApiCall: (userId: string, fallbackLimit: number, fallbackApiDailyLimit: number) => Promise<QuotaRecord | null>;
    consumeOutboundSend: (userId: string, fallbackLimit: number, fallbackApiDailyLimit: number) => Promise<QuotaRecord | null>;
    save: (quota: QuotaRecord) => Promise<void>;
  };
  settings: {
    getFeatureToggles: (defaults: FeatureToggles) => Promise<FeatureToggles>;
    saveFeatureToggles: (toggles: FeatureToggles) => Promise<FeatureToggles>;
  };
  runtimeSettings: {
    get: () => Promise<RuntimeSettingsRecord | null>;
    save: (record: Omit<RuntimeSettingsRecord, "updatedAt">) => Promise<RuntimeSettingsRecord>;
  };
  mailDomains: {
    list: (defaults: MailDomainSummary[]) => Promise<MailDomainSummary[]>;
    saveAll: (domains: MailDomainSummary[]) => Promise<MailDomainSummary[]>;
  };
  dictionaries: {
    listGroups: (
      groupKeys?: string[],
      options?: { includeDisabled?: boolean }
    ) => Promise<DictionaryCatalogGroup[]>;
    updateItem: (
      groupKey: string,
      value: string,
      input: DictionaryItemUpdateInput
    ) => Promise<DictionaryItemSummary | null>;
  };
  audit: {
    record: (event: Omit<AuditEventRecord, "id" | "createdAt">) => Promise<void>;
    countByActorSince: (actorId: string, eventType: string, sinceIso: string) => Promise<number>;
    listByActorAndTypes: (actorId: string, eventTypes: string[], limit: number) => Promise<AuditEventRecord[]>;
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
    listByUserPage: (userId: string, options: PageListOptions) => Promise<WebhookEndpointListResult>;
    create: (input: { userId: string; name: string; url: string; eventsJson: string; enabled: boolean }) => Promise<WebhookEndpointRecord>;
    update: (id: string, userId: string, input: { name: string; url: string; eventsJson: string; enabled: boolean }) => Promise<WebhookEndpointRecord | null>;
    rotateSecret: (id: string, userId: string) => Promise<WebhookEndpointRecord | null>;
    delete: (id: string, userId: string) => Promise<void>;
  };
  webhookDeliveries: {
    listByUser: (userId: string) => Promise<WebhookDeliveryRecord[]>;
    listByUserPage: (userId: string, query: WebhookDeliveryListQuery) => Promise<WebhookDeliveryListResult>;
    findByUser: (id: string, userId: string) => Promise<WebhookDeliveryRecord | null>;
    record: (input: Omit<WebhookDeliveryRecord, "id" | "createdAt"> & { id?: string; createdAt?: string }) => Promise<WebhookDeliveryRecord>;
  };
  announcements: {
    list: () => Promise<AnnouncementRecord[]>;
    listPage: (options: AnnouncementListOptions) => Promise<AnnouncementListResult>;
    listFeatured: (options: AnnouncementVisibilityOptions) => Promise<AnnouncementRecord[]>;
    summary: (options: AnnouncementVisibilityOptions) => Promise<AnnouncementSummaryItem[]>;
    create: (input: Omit<AnnouncementRecord, "id" | "publishedAt" | "updatedAt">) => Promise<AnnouncementRecord>;
    find: (id: string) => Promise<AnnouncementRecord | null>;
    update: (
      id: string,
      input: Partial<Omit<AnnouncementRecord, "id" | "publishedAt" | "updatedAt" | "authorUserId" | "authorLabel">>
    ) => Promise<AnnouncementRecord | null>;
    delete: (id: string) => Promise<boolean>;
    acknowledge: (announcementId: string, userId: string) => Promise<AnnouncementReceiptRecord>;
    listReceiptsByUser: (userId: string, announcementIds: string[]) => Promise<AnnouncementReceiptRecord[]>;
    countReceipts: (announcementIds: string[]) => Promise<Record<string, number>>;
  };
}

export type AppBindings = {
  ENVIRONMENT?: string;
  APP_NAME: string;
  COOKIE_NAME: string;
  COOKIE_SECURE?: string;
  CORS_ALLOWED_ORIGINS?: string;
  DEFAULT_MAIL_DOMAIN?: string;
  MAILBOX_LIMIT?: string;
  MESSAGE_RETENTION_DAYS?: string;
  OUTBOUND_DAILY_LIMIT?: string;
  API_DAILY_LIMIT?: string;
  AI_FALLBACK_LIMIT?: string;
  MAX_ATTACHMENT_BYTES?: string;
  MAX_TOTAL_ATTACHMENT_BYTES?: string;
  ENABLE_AI?: string;
  ENABLE_TELEGRAM?: string;
  ENABLE_OUTBOUND?: string;
  ENABLE_MAILBOX_CREATION?: string;
  ADMIN_EMAILS?: string;
  SESSION_TTL_HOURS?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_BOT_USERNAME?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  RATE_LIMITER?: RateLimiterBinding;
  CACHE?: KVNamespace;
  DB?: D1Database;
  ATTACHMENTS?: R2Bucket;
  AI?: Ai;
};
