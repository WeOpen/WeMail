export type UserRole = "admin" | "member";
export type UserStatus = "active" | "disabled";

export type ExtractionType =
  | "auth_code"
  | "auth_link"
  | "service_link"
  | "subscription_link"
  | "other_link"
  | "none";

export type ExtractionMethod = "regex" | "ai" | "none";

export type ExtractionResult = {
  method: ExtractionMethod;
  type: ExtractionType;
  value: string;
  label: string;
};

export type FeatureToggles = {
  aiEnabled: boolean;
  telegramEnabled: boolean;
  outboundEnabled: boolean;
  mailboxCreationEnabled: boolean;
};

export type MailDomainSummary = {
  domain: string;
  allowedRoles: UserRole[];
};

export type MailDomainSettings = {
  domains: MailDomainSummary[];
  primaryDomain: string;
};

export type RuntimeSettings = {
  mailbox: {
    limit: number;
  };
  message: {
    retentionDays: number;
  };
  outbound: {
    dailyLimit: number;
  };
  api: {
    dailyLimit: number;
  };
  attachments: {
    maxBytes: number;
    maxTotalBytes: number;
  };
  ai: {
    fallbackLimit: number;
  };
  lastUpdatedLabel: string;
};

export type RuntimeSettingsUpdateInput = {
  mailbox?: Partial<RuntimeSettings["mailbox"]>;
  message?: Partial<RuntimeSettings["message"]>;
  outbound?: Partial<RuntimeSettings["outbound"]>;
  api?: Partial<RuntimeSettings["api"]>;
  attachments?: Partial<RuntimeSettings["attachments"]>;
  ai?: Partial<RuntimeSettings["ai"]>;
};

export type UserSummary = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
};

export type SessionSummary = {
  user: UserSummary;
  featureToggles: FeatureToggles;
};

export type UserProfileLocale = "zh-CN" | "en-US";
export type UserProfileTimezone = "Asia/Shanghai" | "Asia/Tokyo" | "America/New_York";
export type UserProfileDateFormat = "yyyy-mm-dd" | "mm-dd-yyyy" | "dd-mm-yyyy";
export type UserProfileLandingPage = "/dashboard" | "/mail/list" | "/api-keys";
export type UserProfileDensity = "comfortable" | "compact";

export type UserProfilePreferences = {
  bio: string;
  locale: UserProfileLocale;
  timezone: UserProfileTimezone;
  dateFormat: UserProfileDateFormat;
  landingPage: UserProfileLandingPage;
  density: UserProfileDensity;
  updatedAt: string;
};

export type UserProfileSummary = {
  user: UserSummary;
  preferences: UserProfilePreferences;
};

export type UserProfileUpdateInput = {
  name?: string;
  preferences?: Partial<Omit<UserProfilePreferences, "updatedAt">>;
};

export type MailboxStatus = "enabled" | "disabled" | "archived" | "soft_deleted";
export type AccountCreationStatus = Exclude<MailboxStatus, "soft_deleted">;
export type AccountInactiveAction = "mark" | "disable" | "archive";
export type AccountBulkDeleteMode = "soft" | "hard";

export type AccountCreationPolicy = {
  defaultTagsEnabled: boolean;
  defaultTags: string;
  allowCreationOverride: boolean;
  defaultStatus: AccountCreationStatus;
  requireCreatorNote: boolean;
};

export type AccountLifecyclePolicy = {
  inactiveDays: number;
  inactiveAction: AccountInactiveAction;
  softDeleteRetentionDays: number;
  allowHardDelete: boolean;
  requireSoftDeleteBeforeHardDelete: boolean;
};

export type AccountProtectionPolicy = {
  confirmStandardBulkActions: boolean;
  standardBulkLimit: number;
  requireDangerPhrase: boolean;
  hardDeleteLimit: number;
  auditLoggingEnabled: boolean;
};

export type AccountPolicy = {
  creation: AccountCreationPolicy;
  lifecycle: AccountLifecyclePolicy;
  protection: AccountProtectionPolicy;
  lastUpdatedLabel: string;
};

export type AccountPolicyUpdateInput = {
  creation?: Partial<AccountCreationPolicy>;
  lifecycle?: Partial<AccountLifecyclePolicy>;
  protection?: Partial<AccountProtectionPolicy>;
};

export type AccountBulkDeleteInput = {
  accountIds: string[];
  mode: AccountBulkDeleteMode;
  confirmationPhrase?: string;
};

export type MailboxSummary = {
  id: string;
  address: string;
  label: string;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string;
};

export type MailboxDetail = {
  id: string;
  address: string;
  label: string;
  status: MailboxStatus;
  tags: string[];
  createdBy: string | null;
  createdByName: string | null;
  lastActiveAt: string | null;
  deletedAt: string | null;
  messageCount: number;
  outboundCount: number;
  createdAt: string;
};

export type MessageAttachmentSummary = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  key: string;
};

export type MessageSummary = {
  id: string;
  mailboxId: string;
  toAddress?: string | null;
  fromAddress: string;
  subject: string;
  previewText: string;
  bodyText: string;
  extraction: ExtractionResult;
  oversizeStatus: string | null;
  attachmentCount: number;
  attachments: MessageAttachmentSummary[];
  receivedAt: string;
};

export type MessageFilter = "all" | "code" | "link" | "attachment" | "unparsed";

export type MessageListQuery = {
  mailboxId?: string | null;
  page: number;
  pageSize: number;
  search?: string;
  filter?: MessageFilter;
};

export type MessageListSummary = {
  messageCount: number;
  extractionCount: number;
  attachmentCount: number;
};

export type MessageListResult = {
  messages: MessageSummary[];
  total: number;
  page: number;
  pageSize: number;
  summary: MessageListSummary;
};

export type OutboundMessageSummary = {
  id: string;
  mailboxId: string;
  fromAddress: string;
  toAddress: string;
  subject: string;
  bodyText?: string;
  status: "sent" | "failed";
  errorText: string | null;
  providerMessageId?: string | null;
  requestPayloadJson?: string | null;
  responsePayloadJson?: string | null;
  createdAt: string;
};

export type OutboundMessageDetail = OutboundMessageSummary & {
  bodyText: string;
  providerMessageId: string | null;
  requestPayloadJson: string;
  responsePayloadJson: string | null;
};

export type OutboundListStatus = "all" | "sent" | "failed";

export type OutboundListQuery = {
  mailboxId: string;
  page: number;
  pageSize: number;
  search?: string;
  status?: OutboundListStatus;
};

export type OutboundListSummary = {
  totalCount: number;
  sentCount: number;
  failedCount: number;
};

export type OutboundListResult = {
  messages: OutboundMessageSummary[];
  total: number;
  page: number;
  pageSize: number;
  summary: OutboundListSummary;
};

export type ApiKeySummary = {
  id: string;
  label: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type TelegramSubscriptionSummary = {
  chatId: string;
  enabled: boolean;
};

export type TelegramSubscriptionDetail = TelegramSubscriptionSummary & {
  updatedAt: string;
};

export type TelegramSupportedEventId =
  | "message.received"
  | "message.extraction.detected"
  | "api_key.created"
  | "api_key.revoked";

export type TelegramDeliveryEventId = TelegramSupportedEventId | "telegram.test";

export type TelegramSupportedEvent = {
  id: TelegramSupportedEventId;
  label: string;
  description: string;
  enabled: boolean;
};

export type TelegramOverviewSummary = {
  featureEnabled: boolean;
  botConfigured: boolean;
  canSendTest: boolean;
  subscription: TelegramSubscriptionDetail | null;
  supportedEvents: TelegramSupportedEvent[];
};

export type TelegramTestMessageResult = {
  delivered: boolean;
  attemptedAt: string;
  reason: string | null;
};

export type TelegramLinkCodeSummary = {
  code: string;
  deepLinkUrl: string | null;
  expiresAt: string;
  startCommand: string;
};

export type TelegramDeliverySummary = {
  id: string;
  eventId: TelegramDeliveryEventId;
  label: string;
  delivered: boolean;
  reason: string | null;
  chatId: string | null;
  createdAt: string;
};

export type MailSettingsSenderRules = {
  defaultIdentity: string;
  signature: string;
  retryEnabled: boolean;
  retryAttempts: string;
  retryDelay: string;
  failureRetention: string;
  allowManualOverride: boolean;
};

export type MailSettingsRouting = {
  webhookEnabled: boolean;
  webhookEndpoint: string;
  telegramEnabled: boolean;
  telegramTarget: string;
  failureAlerts: boolean;
  exceptionAlerts: boolean;
  exceptionStrategy: string;
  fallbackOwner: string;
};

export type MailSettingsWorkspaceDefaults = {
  defaultMailRoute: string;
  outboundDefaultFilter: string;
  expandExceptionsByDefault: boolean;
  listDensity: string;
  openLatestFailureFirst: boolean;
};

export type MailSettings = {
  senderRules: MailSettingsSenderRules;
  routing: MailSettingsRouting;
  workspaceDefaults: MailSettingsWorkspaceDefaults;
  lastUpdatedLabel: string;
};

export type MailSettingsUpdateInput = {
  senderRules?: Partial<MailSettingsSenderRules>;
  routing?: Partial<MailSettingsRouting>;
  workspaceDefaults?: Partial<MailSettingsWorkspaceDefaults>;
};

export type InviteSummary = {
  id: string;
  code: string;
  createdAt: string;
  redeemedAt: string | null;
  disabledAt: string | null;
};

export type QuotaSummary = {
  userId: string;
  apiDailyLimit: number;
  apiCallsToday: number;
  dailyLimit: number;
  sendsToday: number;
  disabled: boolean;
  updatedAt: string;
};
