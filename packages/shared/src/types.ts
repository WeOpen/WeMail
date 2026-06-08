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

export type MailboxSummary = {
  id: string;
  address: string;
  label: string;
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

export type OutboundMessageSummary = {
  id: string;
  mailboxId: string;
  toAddress: string;
  subject: string;
  status: "sent" | "failed";
  errorText: string | null;
  createdAt: string;
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

export type InviteSummary = {
  id: string;
  code: string;
  createdAt: string;
  redeemedAt: string | null;
  disabledAt: string | null;
};

export type QuotaSummary = {
  userId: string;
  dailyLimit: number;
  sendsToday: number;
  disabled: boolean;
  updatedAt: string;
};
