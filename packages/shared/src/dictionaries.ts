export type DictionaryMetadata = Record<string, unknown>;

export type DictionaryGroupSummary = {
  groupKey: string;
  label: string;
  description: string | null;
  isSystem: boolean;
  version: number;
  updatedAt?: string;
};

export type DictionaryItemSummary = {
  groupKey: string;
  value: string;
  label: string;
  description: string | null;
  sortOrder: number;
  enabled: boolean;
  metadata: DictionaryMetadata;
  updatedAt?: string;
};

export type DictionaryCatalogGroup = DictionaryGroupSummary & {
  items: DictionaryItemSummary[];
};

export type DictionaryItemUpdateInput = Partial<{
  label: string;
  description: string | null;
  sortOrder: number;
  enabled: boolean;
  metadata: DictionaryMetadata;
}>;

export type DictionaryCatalogOptions = {
  groupKeys?: string[];
  groups?: DictionaryGroupSummary[];
  includeDisabled?: boolean;
  items?: DictionaryItemSummary[];
};

export const DEFAULT_DICTIONARY_GROUPS: DictionaryGroupSummary[] = [
  {
    groupKey: "user.role",
    label: "用户角色",
    description: "控制权限边界的系统角色。",
    isSystem: true,
    version: 1
  },
  {
    groupKey: "user.status",
    label: "用户状态",
    description: "用户账号登录和使用状态。",
    isSystem: true,
    version: 1
  },
  {
    groupKey: "mailbox.status",
    label: "邮箱账号状态",
    description: "邮箱账号生命周期状态。",
    isSystem: true,
    version: 1
  },
  {
    groupKey: "message.filter",
    label: "邮件筛选",
    description: "收件箱列表筛选项。",
    isSystem: true,
    version: 1
  },
  {
    groupKey: "outbound.status",
    label: "发件状态",
    description: "发件历史和筛选状态。",
    isSystem: true,
    version: 1
  },
  {
    groupKey: "webhook.delivery_status",
    label: "Webhook 投递状态",
    description: "Webhook 投递记录筛选状态。",
    isSystem: true,
    version: 1
  },
  {
    groupKey: "announcement.type",
    label: "公告类型",
    description: "公告内容分类。",
    isSystem: true,
    version: 1
  },
  {
    groupKey: "announcement.status",
    label: "公告状态",
    description: "公告发布和展示状态。",
    isSystem: true,
    version: 1
  },
  {
    groupKey: "announcement.audience",
    label: "公告受众",
    description: "公告可见用户范围。",
    isSystem: true,
    version: 1
  },
  {
    groupKey: "announcement.priority",
    label: "公告优先级",
    description: "公告优先级展示。",
    isSystem: true,
    version: 1
  },
  {
    groupKey: "announcement.time_filter",
    label: "公告时间筛选",
    description: "公告列表时间窗口。",
    isSystem: true,
    version: 1
  },
  {
    groupKey: "account.inactive_action",
    label: "账号闲置动作",
    description: "账号生命周期策略动作。",
    isSystem: true,
    version: 1
  },
  {
    groupKey: "account.bulk_delete_mode",
    label: "账号批量删除模式",
    description: "账号批量删除策略。",
    isSystem: true,
    version: 1
  },
  {
    groupKey: "account.active_range",
    label: "账号活跃范围",
    description: "账号管理活跃时间筛选。",
    isSystem: true,
    version: 1
  },
  {
    groupKey: "profile.locale",
    label: "个人语言",
    description: "个人资料语言偏好。",
    isSystem: true,
    version: 1
  },
  {
    groupKey: "profile.timezone",
    label: "个人时区",
    description: "个人资料时区偏好。",
    isSystem: true,
    version: 1
  },
  {
    groupKey: "profile.date_format",
    label: "日期格式",
    description: "个人资料日期显示格式。",
    isSystem: true,
    version: 1
  },
  {
    groupKey: "profile.landing_page",
    label: "默认入口",
    description: "登录后的默认页面。",
    isSystem: true,
    version: 1
  },
  {
    groupKey: "profile.density",
    label: "界面密度",
    description: "个人资料界面密度偏好。",
    isSystem: true,
    version: 1
  }
];

export const DEFAULT_DICTIONARY_ITEMS: DictionaryItemSummary[] = [
  item("user.role", "admin", "管理员", 10),
  item("user.role", "member", "成员", 20),
  item("user.status", "active", "正常", 10),
  item("user.status", "disabled", "停用", 20),
  item("mailbox.status", "enabled", "已启用", 10),
  item("mailbox.status", "disabled", "已停用", 20),
  item("mailbox.status", "archived", "已归档", 30),
  item("mailbox.status", "soft_deleted", "已软删除", 40),
  item("message.filter", "all", "全部", 10),
  item("message.filter", "code", "验证码", 20),
  item("message.filter", "link", "链接", 30),
  item("message.filter", "attachment", "附件", 40),
  item("message.filter", "unparsed", "未解析", 50),
  item("outbound.status", "all", "全部", 10),
  item("outbound.status", "sent", "已发送", 20),
  item("outbound.status", "failed", "失败", 30),
  item("webhook.delivery_status", "all", "全部", 10),
  item("webhook.delivery_status", "success", "成功", 20),
  item("webhook.delivery_status", "failed", "失败", 30),
  item("announcement.type", "产品更新", "产品更新", 10),
  item("announcement.type", "维护通知", "维护通知", 20),
  item("announcement.type", "运营通知", "运营通知", 30),
  item("announcement.type", "安全提醒", "安全提醒", 40),
  item("announcement.status", "已发布", "已发布", 10),
  item("announcement.status", "进行中", "进行中", 20),
  item("announcement.status", "即将开始", "即将开始", 30),
  item("announcement.status", "已结束", "已结束", 40),
  item("announcement.status", "已归档", "已归档", 50),
  item("announcement.audience", "全部成员", "全部成员", 10),
  item("announcement.audience", "管理员", "管理员", 20),
  item("announcement.audience", "普通成员", "普通成员", 30),
  item("announcement.priority", "高", "高", 10),
  item("announcement.priority", "中", "中", 20),
  item("announcement.priority", "低", "低", 30),
  item("announcement.time_filter", "7d", "最近 7 天", 10),
  item("announcement.time_filter", "30d", "最近 30 天", 20),
  item("account.inactive_action", "mark", "标记", 10),
  item("account.inactive_action", "disable", "停用", 20),
  item("account.inactive_action", "archive", "归档", 30),
  item("account.bulk_delete_mode", "soft", "软删除", 10),
  item("account.bulk_delete_mode", "hard", "硬删除", 20),
  item("account.active_range", "7d", "7 天内活跃", 10),
  item("account.active_range", "30d", "30 天内活跃", 20),
  item("account.active_range", "90d", "90 天内活跃", 30),
  item("profile.locale", "zh-CN", "简体中文", 10),
  item("profile.locale", "en-US", "English", 20),
  item("profile.timezone", "Asia/Shanghai", "上海", 10),
  item("profile.timezone", "Asia/Tokyo", "东京", 20),
  item("profile.timezone", "America/New_York", "纽约", 30),
  item("profile.date_format", "yyyy-mm-dd", "YYYY-MM-DD", 10),
  item("profile.date_format", "mm-dd-yyyy", "MM-DD-YYYY", 20),
  item("profile.date_format", "dd-mm-yyyy", "DD-MM-YYYY", 30),
  item("profile.landing_page", "/dashboard", "工作台", 10),
  item("profile.landing_page", "/mail/list", "收件箱", 20),
  item("profile.landing_page", "/api-keys", "API 密钥", 30),
  item("profile.density", "comfortable", "舒适", 10),
  item("profile.density", "compact", "紧凑", 20)
];

function item(
  groupKey: string,
  value: string,
  label: string,
  sortOrder: number,
  description: string | null = null,
  metadata: DictionaryMetadata = {}
): DictionaryItemSummary {
  return {
    groupKey,
    value,
    label,
    description,
    sortOrder,
    enabled: true,
    metadata
  };
}

function itemKey(groupKey: string, value: string) {
  return `${groupKey}\u0000${value}`;
}

function cloneItem(item: DictionaryItemSummary): DictionaryItemSummary {
  return {
    ...item,
    metadata: { ...item.metadata }
  };
}

function compareGroups(left: string, right: string, defaultOrder: Map<string, number>) {
  const leftIndex = defaultOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
  const rightIndex = defaultOrder.get(right) ?? Number.MAX_SAFE_INTEGER;
  if (leftIndex !== rightIndex) return leftIndex - rightIndex;
  return left.localeCompare(right);
}

function compareItems(left: DictionaryItemSummary, right: DictionaryItemSummary) {
  if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
  const labelCompare = left.label.localeCompare(right.label);
  return labelCompare === 0 ? left.value.localeCompare(right.value) : labelCompare;
}

export function applyDictionaryItemUpdate(
  base: DictionaryItemSummary,
  input: DictionaryItemUpdateInput
): DictionaryItemSummary {
  return {
    ...base,
    ...input,
    metadata: typeof input.metadata === "undefined" ? { ...base.metadata } : { ...input.metadata }
  };
}

export function buildDictionaryCatalog(options: DictionaryCatalogOptions = {}): DictionaryCatalogGroup[] {
  const defaultOrder = new Map(DEFAULT_DICTIONARY_GROUPS.map((group, index) => [group.groupKey, index]));
  const groups = new Map(DEFAULT_DICTIONARY_GROUPS.map((group) => [group.groupKey, { ...group }]));
  const items = new Map(DEFAULT_DICTIONARY_ITEMS.map((entry) => [itemKey(entry.groupKey, entry.value), cloneItem(entry)]));

  for (const group of options.groups ?? []) {
    groups.set(group.groupKey, { ...(groups.get(group.groupKey) ?? group), ...group });
  }

  for (const entry of options.items ?? []) {
    items.set(itemKey(entry.groupKey, entry.value), cloneItem({ ...(items.get(itemKey(entry.groupKey, entry.value)) ?? entry), ...entry }));
    if (!groups.has(entry.groupKey)) {
      groups.set(entry.groupKey, {
        groupKey: entry.groupKey,
        label: entry.groupKey,
        description: null,
        isSystem: false,
        version: 1,
        updatedAt: entry.updatedAt
      });
    }
  }

  const requestedGroupKeys = options.groupKeys?.map((groupKey) => groupKey.trim()).filter(Boolean);
  const groupKeys =
    requestedGroupKeys && requestedGroupKeys.length > 0
      ? requestedGroupKeys
      : Array.from(groups.keys()).sort((left, right) => compareGroups(left, right, defaultOrder));

  return groupKeys
    .filter((groupKey, index, source) => source.indexOf(groupKey) === index)
    .map((groupKey) => groups.get(groupKey))
    .filter((group): group is DictionaryGroupSummary => Boolean(group))
    .map((group) => ({
      ...group,
      items: Array.from(items.values())
        .filter((entry) => entry.groupKey === group.groupKey)
        .filter((entry) => options.includeDisabled || entry.enabled)
        .sort(compareItems)
    }));
}

export function findDefaultDictionaryItem(groupKey: string, value: string) {
  const match = DEFAULT_DICTIONARY_ITEMS.find((entry) => entry.groupKey === groupKey && entry.value === value);
  return match ? cloneItem(match) : null;
}

export function findDefaultDictionaryGroup(groupKey: string) {
  const match = DEFAULT_DICTIONARY_GROUPS.find((entry) => entry.groupKey === groupKey);
  return match ? { ...match } : null;
}
