export type UserRole = "admin" | "member";
export type UserStatus = "active" | "disabled";
export type OAuthProviderId = "github" | "linuxdo";

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

export type SystemDiagnosticStatus = "ok" | "warning" | "error";

export type SystemDiagnosticCheck = {
  id: string;
  label: string;
  status: SystemDiagnosticStatus;
  message: string;
  action?: string;
};

export type SystemDiagnosticsSummary = {
  appName: string;
  environment: string;
  generatedAt: string;
  overallStatus: SystemDiagnosticStatus;
  checks: SystemDiagnosticCheck[];
};

export type SystemOperationEventSource = "diagnostic" | "webhook" | "telegram" | "outbound" | "storage";

export type SystemOperationEvent = {
  id: string;
  source: SystemOperationEventSource;
  severity: Exclude<SystemDiagnosticStatus, "ok">;
  label: string;
  message: string;
  occurredAt: string;
  actionLabel?: string;
  actionHref?: string;
};

export type SystemOperationSignal = {
  label: string;
  value: string;
  status: SystemDiagnosticStatus;
};

export type SystemOperationsSummary = {
  generatedAt: string;
  overallStatus: SystemDiagnosticStatus;
  signals: SystemOperationSignal[];
  recentEvents: SystemOperationEvent[];
};

export type ProductMaturityAreaId =
  | "observability"
  | "security"
  | "mail_workflow"
  | "notifications"
  | "outbound"
  | "commercial"
  | "documentation"
  | "data_reliability";

export type ProductMaturitySignal = {
  label: string;
  value: string;
  status?: SystemDiagnosticStatus;
};

export type ProductMaturityArea = {
  id: ProductMaturityAreaId;
  title: string;
  status: SystemDiagnosticStatus;
  progress: number;
  summary: string;
  signals: ProductMaturitySignal[];
  evidence: string[];
  nextActions: string[];
};

export type ProductMaturitySummary = {
  generatedAt: string;
  overallStatus: SystemDiagnosticStatus;
  completedAreas: number;
  totalAreas: number;
  areas: ProductMaturityArea[];
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

export type UserSessionSummary = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt?: string;
  isCurrent: boolean;
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
  expiresAt?: string;
};

export type MessageFilter = "all" | "code" | "link" | "attachment" | "unparsed";

export type MessageListQuery = {
  mailboxId?: string | null;
  page: number;
  pageSize: number;
  search?: string;
  filter?: MessageFilter;
  from?: string;
  subject?: string;
  startDate?: string;
  endDate?: string;
  hasAttachment?: boolean;
  extractionType?: ExtractionType;
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

export type MessageBatchAction = "delete" | "export";

export type MessageBatchActionResult = {
  action: MessageBatchAction;
  affected: number;
  requested: number;
  messages?: MessageSummary[];
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

export type OutboundSenderIdentitySummary = {
  id: string;
  label: string;
  address: string;
  domain: string | null;
  isDefault: boolean;
  status: SystemDiagnosticStatus;
  message: string;
};

export type OutboundDnsCheckSummary = {
  id: "spf" | "dkim" | "dmarc";
  label: string;
  domain: string;
  recordType: "TXT" | "CNAME";
  expectedValue: string;
  status: SystemDiagnosticStatus;
  message: string;
};

export type OutboundTemplateSummary = {
  id: string;
  name: string;
  description: string;
  subject: string;
  bodyText: string;
};

export type OutboundMaturitySummary = {
  generatedAt: string;
  featureEnabled: boolean;
  resendConfigured: boolean;
  defaultIdentity: string;
  quota: QuotaSummary;
  retryPolicy: {
    enabled: boolean;
    attempts: string;
    delay: string;
    failureRetention: string;
  };
  failureStats: {
    total: number;
    sent: number;
    failed: number;
    recentFailureReason: string | null;
  };
  returnPath: {
    status: SystemDiagnosticStatus;
    message: string;
  };
  identities: OutboundSenderIdentitySummary[];
  dnsChecks: OutboundDnsCheckSummary[];
  templates: OutboundTemplateSummary[];
};

export type ApiKeyScope =
  | "mail:read"
  | "mail:send"
  | "mailbox:manage"
  | "webhook:manage"
  | "settings:read"
  | "admin:automation";

export type ApiKeySummary = {
  id: string;
  label: string;
  owner?: UserSummary;
  prefix: string;
  scopes: ApiKeyScope[];
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

export type NotificationRuleTarget = "webhook" | "telegram" | "slack" | "discord" | "feishu" | "wecom";

export type NotificationRuleSummary = {
  id: string;
  name: string;
  enabled: boolean;
  target: NotificationRuleTarget;
  targetId: string | null;
  eventTypes: string[];
  mailboxIds: string[];
  keyword: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  createdAt: string;
  updatedAt: string;
};

export type NotificationRuleInput = {
  name: string;
  enabled: boolean;
  target: NotificationRuleTarget;
  targetId?: string | null;
  eventTypes: string[];
  mailboxIds?: string[];
  keyword?: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
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

export type InviteStatus = "ready" | "redeemed" | "disabled" | "expired";

export type InviteSummary = {
  id: string;
  code: string;
  createdAt: string;
  expiresAt: string | null;
  targetRole: UserRole;
  maxRedemptions: number;
  redemptionCount: number;
  redeemedByUserId: string | null;
  redeemedByUserName?: string | null;
  redeemedAt: string | null;
  disabledAt: string | null;
  status?: InviteStatus;
};

export type InviteCreateInput = {
  count?: number;
  targetRole?: UserRole;
  expiresInDays?: number | null;
  maxRedemptions?: number;
};

export type AdminLoginHistoryEvent = {
  id: string;
  userId: string | null;
  userEmail: string;
  method: "password" | "oauth";
  provider: OAuthProviderId | null;
  status: "success" | "failed";
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type AdminAuditEventSummary = {
  id: string;
  actorId: string;
  actorLabel: string;
  eventType: string;
  eventLabel: string;
  detail: string;
  createdAt: string;
};

export type AdminRateLimitPolicySummary = {
  key: "register" | "login" | "mailbox_create" | "mail_send" | "api_key" | "api_daily" | "outbound_daily";
  label: string;
  scope: string;
  policy: string;
  currentUsage: string;
  enforced: boolean;
};

export type AdminInviteGovernanceSummary = {
  total: number;
  available: number;
  redeemed: number;
  disabled: number;
  expired: number;
};

export type AdminGovernanceSummary = {
  generatedAt: string;
  loginHistory: AdminLoginHistoryEvent[];
  auditEvents: AdminAuditEventSummary[];
  inviteStats: AdminInviteGovernanceSummary;
  rateLimits: AdminRateLimitPolicySummary[];
};

export type PlanTierSummary = {
  id: "free" | "pro" | "team";
  name: string;
  priceLabel: string;
  mailboxLimit: number;
  retentionDays: number;
  apiDailyLimit: number;
  outboundDailyLimit: number;
  webhookLimit: number;
  teamSeats: number;
  features: string[];
};

export type TeamWorkspaceSummary = {
  id: string;
  name: string;
  planId: PlanTierSummary["id"];
  memberCount: number;
  adminCount: number;
  sharedMailboxCount: number;
  auditEventCount: number;
  usage: {
    mailboxes: number;
    messages: number;
    outboundSentToday: number;
    apiCallsToday: number;
  };
};

export type CommercialModelSummary = {
  generatedAt: string;
  currentPlanId: PlanTierSummary["id"];
  planTiers: PlanTierSummary[];
  quotaUsage: {
    users: number;
    activeUsers: number;
    mailboxes: number;
    mailboxLimit: number;
    messages: number;
    outboundDailyLimit: number;
    outboundSentToday: number;
    apiDailyLimit: number;
    apiCallsToday: number;
    webhookEndpoints: number;
  };
  teamWorkspaces: TeamWorkspaceSummary[];
  organizationAudit: AdminAuditEventSummary[];
};

export type CleanupRunSummary = {
  id: string;
  status: "success" | "failed";
  startedAt: string;
  finishedAt: string;
  deletedMessages: number;
  deletedAttachments: number;
  deletedAccounts: number;
  errorText: string | null;
};

export type DataReliabilitySummary = {
  generatedAt: string;
  status: SystemDiagnosticStatus;
  storage: {
    d1: SystemDiagnosticStatus;
    r2: SystemDiagnosticStatus;
    message: string;
  };
  migrations: Array<{
    id: string;
    title: string;
    status: SystemDiagnosticStatus;
    description: string;
  }>;
  cleanup: {
    expiredMessages: number;
    recentRuns: CleanupRunSummary[];
  };
  idempotency: {
    enabled: boolean;
    duplicateWindowMinutes: number;
    duplicateNotificationPrevention: boolean;
    message: string;
  };
  backupRunbook: Array<{
    title: string;
    command: string;
    cadence: string;
  }>;
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
