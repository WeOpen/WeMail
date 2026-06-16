export const APP_LIMITS = {
  mailboxLimit: 5,
  messageRetentionDays: 7,
  attachmentRetentionDays: 7,
  maxAttachmentBytes: 10 * 1024 * 1024,
  maxTotalAttachmentBytes: 15 * 1024 * 1024,
  outboundDailyLimit: 20,
  apiDailyLimit: 20_000,
  aiFallbackLimit: 20
} as const;

export const DEFAULT_FEATURE_TOGGLES = {
  aiEnabled: true,
  telegramEnabled: true,
  outboundEnabled: true,
  mailboxCreationEnabled: true
} as const;
