export type MailboxAccountStatus = "enabled" | "disabled" | "archived" | "soft_deleted";

export type MailboxAccountRecord = {
  id: string;
  address: string;
  createdAt: string;
  tags: string[];
  status: MailboxAccountStatus;
  createdBy: string;
  lastActiveAt: string;
  messageCount: number;
  outboundCount: number;
  deletedAt: string | null;
};

export const mailboxAccountsMockData: MailboxAccountRecord[] = [
  {
    id: "acct_1001",
    address: "ops@wemail.ai",
    createdAt: "2026-03-01T08:30:00.000Z",
    tags: ["运营", "高优先级"],
    status: "enabled",
    createdBy: "Will",
    lastActiveAt: "2026-04-18T07:12:00.000Z",
    messageCount: 1240,
    outboundCount: 186,
    deletedAt: null
  },
  {
    id: "acct_1002",
    address: "growth@wemail.ai",
    createdAt: "2026-02-19T03:45:00.000Z",
    tags: ["增长"],
    status: "disabled",
    createdBy: "Ada",
    lastActiveAt: "2026-04-15T16:20:00.000Z",
    messageCount: 842,
    outboundCount: 93,
    deletedAt: null
  },
  {
    id: "acct_1003",
    address: "archive@wemail.ai",
    createdAt: "2026-01-09T12:10:00.000Z",
    tags: ["历史", "归档候选"],
    status: "archived",
    createdBy: "System",
    lastActiveAt: "2026-03-28T01:05:00.000Z",
    messageCount: 365,
    outboundCount: 24,
    deletedAt: null
  }
];

export type MailboxAccountPolicy = {
  creation: {
    defaultTagsEnabled: boolean;
    defaultTags: string;
    allowCreationOverride: boolean;
    defaultStatus: "启用" | "停用" | "待审核";
    requireCreatorNote: boolean;
  };
  lifecycle: {
    inactiveDays: number;
    inactiveAction: "仅标记" | "自动停用" | "自动归档";
    softDeleteRetentionDays: number;
    allowHardDelete: boolean;
    requireSoftDeleteBeforeHardDelete: boolean;
  };
  protection: {
    confirmStandardBulkActions: boolean;
    standardBulkLimit: number;
    requireDangerPhrase: boolean;
    hardDeleteLimit: number;
    auditLoggingEnabled: boolean;
  };
  lastUpdatedLabel: string;
};

export const mailboxAccountPolicyMock: MailboxAccountPolicy = {
  creation: {
    defaultTagsEnabled: true,
    defaultTags: "运营, 高优先级",
    allowCreationOverride: true,
    defaultStatus: "启用",
    requireCreatorNote: false
  },
  lifecycle: {
    inactiveDays: 30,
    inactiveAction: "自动归档",
    softDeleteRetentionDays: 30,
    allowHardDelete: false,
    requireSoftDeleteBeforeHardDelete: true
  },
  protection: {
    confirmStandardBulkActions: true,
    standardBulkLimit: 100,
    requireDangerPhrase: true,
    hardDeleteLimit: 20,
    auditLoggingEnabled: true
  },
  lastUpdatedLabel: "2026-04-17 22:30"
};
