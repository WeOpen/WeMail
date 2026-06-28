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

export const API_KEY_SCOPE_DEFINITIONS = [
  {
    id: "mail:read",
    label: "读取邮件",
    description: "读取邮箱账号、邮件列表、邮件详情和附件元数据。"
  },
  {
    id: "mail:send",
    label: "发送邮件",
    description: "通过已授权邮箱身份发送邮件。"
  },
  {
    id: "mailbox:manage",
    label: "管理邮箱",
    description: "创建、更新和删除邮箱账号。"
  },
  {
    id: "webhook:manage",
    label: "管理集成",
    description: "管理 Webhook、Telegram 等通知集成。"
  },
  {
    id: "settings:read",
    label: "读取设置",
    description: "读取系统域名、接口目录和低风险设置。"
  },
  {
    id: "admin:automation",
    label: "管理员自动化",
    description: "保留给管理员级自动化接口，默认不授予。"
  }
] as const;

export const DEFAULT_API_KEY_SCOPES = [
  "mail:read",
  "mail:send",
  "mailbox:manage",
  "webhook:manage",
  "settings:read"
] as const;
