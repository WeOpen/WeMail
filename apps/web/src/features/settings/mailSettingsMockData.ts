export const mailSettingsMockData = {
  senderRules: {
    defaultIdentity: "WeMail QA <qa@example.com>",
    signature: "Sent from the WeMail QA workspace.",
    retryEnabled: true,
    retryAttempts: "2 次",
    retryDelay: "5 分钟",
    failureRetention: "30 天",
    allowManualOverride: true
  },
  routing: {
    webhookEnabled: true,
    webhookEndpoint: "https://hooks.example.com/wemail",
    telegramEnabled: true,
    telegramTarget: "Telegram Chat 123456",
    failureAlerts: true,
    exceptionAlerts: true,
    exceptionStrategy: "异常 / 无匹配邮件进入发件箱异常视图",
    fallbackOwner: "QA 值班邮箱"
  },
  workspaceDefaults: {
    defaultMailRoute: "/mail/outbound",
    outboundDefaultFilter: "异常 / 无匹配",
    expandExceptionsByDefault: true,
    listDensity: "舒适",
    openLatestFailureFirst: true
  },
  options: {
    senderIdentities: [
      "WeMail QA <qa@example.com>",
      "WeMail Support <support@example.com>",
      "WeMail Ops <ops@example.com>"
    ],
    retryAttempts: ["1 次", "2 次", "3 次"],
    retryDelays: ["立即重试", "5 分钟", "15 分钟"],
    failureRetentions: ["7 天", "14 天", "30 天"],
    exceptionStrategies: ["异常 / 无匹配邮件进入发件箱异常视图", "仅发送失败告警，不自动入队", "自动转交到值班邮箱"],
    fallbackOwners: ["QA 值班邮箱", "研发值班邮箱", "支持团队"],
    defaultMailRoutes: [
      { value: "/mail/list", label: "邮件列表" },
      { value: "/mail/outbound", label: "发件箱" },
      { value: "/mail/settings", label: "邮件设置" }
    ],
    outboundDefaultFilters: ["全部", "已发送", "失败", "异常 / 无匹配"],
    listDensities: ["紧凑", "舒适", "宽松"]
  },
  lastUpdatedLabel: "今天 09:30"
} as const;
