import type {
  ApiKeySummary,
  FeatureToggles,
  MailboxSummary,
  QuotaSummary,
  SessionSummary,
  TelegramSubscriptionSummary,
  UserSummary
} from "@wemail/shared";

import type { InviteSummary } from "../features/admin/types";
import type { OutboundHistoryItem } from "../features/inbox/types";

type RouteKey =
  | "dashboard"
  | "accounts"
  | "mail"
  | "users"
  | "api-keys"
  | "webhook"
  | "telegram"
  | "docs"
  | "announcements"
  | "system";

type WorkspaceAction = {
  kind: "button" | "link";
  label: string;
  tone: "primary" | "secondary" | "ghost";
  onClick?: () => void;
  to?: string;
};

type WorkspaceHeroStat = {
  label: string;
  value: string;
  detail: string;
};

type WorkspaceHero = {
  variant?: "default" | "dashboard";
  eyebrow: string;
  title: string;
  description: string;
  stats: WorkspaceHeroStat[];
  actions: WorkspaceAction[];
};

export type WorkspaceRailIcon =
  | "dashboard"
  | "accounts"
  | "mail"
  | "users"
  | "keys"
  | "webhook"
  | "telegram"
  | "docs"
  | "announcements"
  | "system";

type WorkspaceSecondaryNavItem = {
  label: string;
  to: string;
};

type WorkspacePrimaryNavConfig = {
  id: RouteKey;
  section: "工作台" | "设置";
  label: string;
  to: string;
  icon: WorkspaceRailIcon;
  adminOnly?: boolean;
  children?: WorkspaceSecondaryNavItem[];
};

type WorkspaceRailItem = {
  id: RouteKey;
  icon: WorkspaceRailIcon;
  label: string;
  to: string;
  hint?: string;
};

type WorkspaceRailSection = {
  title: string;
  items: WorkspaceRailItem[];
};

export type WorkspaceShellState = {
  routeKey: RouteKey;
  routeLabel: string;
  activePrimaryId: RouteKey;
  activePrimaryLabel: string;
  secondaryNav: WorkspaceSecondaryNavItem[];
  railSections: WorkspaceRailSection[];
  hero: WorkspaceHero;
};

type WorkspaceShellInput = {
  pathname: string;
  session: SessionSummary;
  inbox: {
    mailboxes: MailboxSummary[];
    messages: Array<{ id: string }>;
    outboundHistory: OutboundHistoryItem[];
    selectedMailboxId: string | null;
  };
  settings: {
    apiKeys: ApiKeySummary[];
    telegram: TelegramSubscriptionSummary | null;
  };
  admin: {
    adminUsers: UserSummary[];
    adminInvites: InviteSummary[];
    adminQuota: QuotaSummary | null;
    adminMailboxes: MailboxSummary[];
  };
  onOpenMailboxComposer: () => void;
};

const workspacePrimaryNav: WorkspacePrimaryNavConfig[] = [
  {
    id: "dashboard",
    section: "工作台",
    label: "仪表盘",
    to: "/dashboard",
    icon: "dashboard"
  },
  {
    id: "accounts",
    section: "工作台",
    label: "账号",
    to: "/accounts/list",
    icon: "accounts",
    children: [
      { label: "账号列表", to: "/accounts/list" },
      { label: "创建账号", to: "/accounts/create" },
      { label: "账号设置", to: "/accounts/settings" }
    ]
  },
  {
    id: "mail",
    section: "工作台",
    label: "邮件",
    to: "/mail/list",
    icon: "mail",
    children: [
      { label: "邮件列表", to: "/mail/list" },
      { label: "无收件人邮件", to: "/mail/unassigned" },
      { label: "发件箱", to: "/mail/outbound" },
      { label: "邮件设置", to: "/mail/settings" }
    ]
  },
  {
    id: "users",
    section: "工作台",
    label: "用户",
    to: "/users/list",
    icon: "users",
    adminOnly: true,
    children: [
      { label: "用户列表", to: "/users/list" },
      { label: "用户设置", to: "/users/settings" }
    ]
  },
  {
    id: "api-keys",
    section: "设置",
    label: "API 密钥",
    to: "/api-keys",
    icon: "keys"
  },
  {
    id: "webhook",
    section: "设置",
    label: "Webhook",
    to: "/webhook",
    icon: "webhook"
  },
  {
    id: "telegram",
    section: "设置",
    label: "Telegram",
    to: "/telegram",
    icon: "telegram"
  },
  {
    id: "docs",
    section: "设置",
    label: "文档",
    to: "/docs",
    icon: "docs"
  },
  {
    id: "announcements",
    section: "设置",
    label: "公告",
    to: "/announcements",
    icon: "announcements"
  },
  {
    id: "system",
    section: "设置",
    label: "系统设置",
    to: "/system/appearance",
    icon: "system",
    children: [
      { label: "外观设置", to: "/system/appearance" },
      { label: "个人设置", to: "/system/profile" }
    ]
  }
];

function normalizeWorkspacePath(pathname: string) {
  if (pathname === "/" || pathname === "/dashboard") return "/dashboard";
  if (pathname === "/settings") return "/api-keys";
  if (pathname === "/admin") return "/users/list";
  if (pathname === "/accounts") return "/accounts/list";
  if (pathname === "/mail") return "/mail/list";
  if (pathname === "/users") return "/users/list";
  if (pathname === "/system") return "/system/appearance";
  return pathname;
}

function createRoleStat(session: SessionSummary): WorkspaceHeroStat {
  return {
    label: "当前角色",
    value: session.user.role === "admin" ? "管理员" : "成员",
    detail: session.user.email
  };
}

function createApiKeyStat(apiKeys: ApiKeySummary[]): WorkspaceHeroStat {
  return {
    label: "API 密钥",
    value: String(apiKeys.length),
    detail: apiKeys.length > 0 ? "自动化凭证已就绪" : "当前还没有自动化密钥"
  };
}

function createTelegramStat(telegram: TelegramSubscriptionSummary | null): WorkspaceHeroStat {
  return {
    label: "Telegram",
    value: telegram?.enabled ? "已启用" : "未启用",
    detail: telegram?.chatId ? `Chat ${telegram.chatId}` : "尚未绑定 Chat ID"
  };
}

function createMailboxStat(mailboxes: MailboxSummary[], selectedMailbox: MailboxSummary | null): WorkspaceHeroStat {
  return {
    label: "邮箱数",
    value: String(mailboxes.length),
    detail: selectedMailbox ? `${selectedMailbox.label} 当前已激活` : "创建第一个邮箱开始接收邮件"
  };
}

function createMessageStat(messageCount: number): WorkspaceHeroStat {
  return {
    label: "消息数",
    value: String(messageCount),
    detail: messageCount > 0 ? "当前邮箱的消息流已连接" : "消息流已准备好接收新邮件"
  };
}

function createOutboundStat(outboundCount: number, featureToggles: FeatureToggles): WorkspaceHeroStat {
  return {
    label: "外发数",
    value: String(outboundCount),
    detail: featureToggles.outboundEnabled ? "邮件外发能力已启用" : "邮件外发能力已暂停"
  };
}

function resolveActivePrimary(normalizedPath: string) {
  return (
    workspacePrimaryNav.find((item) =>
      item.children ? item.children.some((child) => child.to === normalizedPath) : item.to === normalizedPath
    ) ?? workspacePrimaryNav[0]
  );
}

function buildRailSections(session: SessionSummary): WorkspaceRailSection[] {
  const visibleItems = workspacePrimaryNav.filter((item) => !item.adminOnly || session.user.role === "admin");
  const sections = new Map<WorkspaceRailSection["title"], WorkspaceRailItem[]>();

  visibleItems.forEach((item) => {
    const nextItem: WorkspaceRailItem = {
      id: item.id,
      icon: item.icon,
      label: item.label,
      to: item.to,
      hint: item.children?.map((child) => child.label).join(" · ")
    };

    const currentItems = sections.get(item.section) ?? [];
    currentItems.push(nextItem);
    sections.set(item.section, currentItems);
  });

  return Array.from(sections, ([title, items]) => ({ title, items }));
}

type HeroContext = {
  activePrimary: WorkspacePrimaryNavConfig;
  currentSecondary: WorkspaceSecondaryNavItem | null;
  session: SessionSummary;
  inbox: WorkspaceShellInput["inbox"];
  settings: WorkspaceShellInput["settings"];
  admin: WorkspaceShellInput["admin"];
  selectedMailbox: MailboxSummary | null;
  onOpenMailboxComposer: () => void;
};

function buildHero({
  activePrimary,
  currentSecondary,
  session,
  inbox,
  settings,
  admin,
  selectedMailbox,
  onOpenMailboxComposer
}: HeroContext): WorkspaceHero {
  const isAdmin = session.user.role === "admin";
  const adminDisabled = activePrimary.id === "users" && !isAdmin;

  switch (activePrimary.id) {
    case "dashboard":
      return {
        variant: "dashboard",
        eyebrow: "仪表盘",
        title: "平台总览仪表盘",
        description: "先用 mock 数据验证管理后台首页的 KPI、趋势图和结构图布局，后续再逐步替换成真实平台指标。",
        stats: [],
        actions: [
          { kind: "link", label: "查看用户列表", to: "/users/list", tone: "primary" },
          { kind: "link", label: "打开邮件列表", to: "/mail/list", tone: "secondary" },
          isAdmin
            ? { kind: "link", label: "打开 API 密钥", to: "/api-keys", tone: "ghost" }
            : { kind: "link", label: "系统设置", to: "/system/appearance", tone: "ghost" }
        ]
      };
    case "accounts":
      return {
        eyebrow: "账号中心",
        title:
          currentSecondary?.label === "创建账号"
            ? "创建账号入口已预留"
            : currentSecondary?.label === "账号设置"
              ? "账号设置入口已预留"
              : "账号栏目已接入新导航骨架",
        description: "先按图片中的信息架构完成两级导航与占位，后续可逐项接入账号列表、创建账号与账号设置能力。",
        stats: [
          createMailboxStat(inbox.mailboxes, selectedMailbox),
          {
            label: "当前邮箱",
            value: selectedMailbox?.label ?? "未选择",
            detail: selectedMailbox?.address ?? "后续可映射为账号详情"
          },
          {
            label: "接入状态",
            value: "占位中",
            detail: "功能后续补齐"
          }
        ],
        actions: [
          { kind: "button", label: "创建邮箱", tone: "primary", onClick: onOpenMailboxComposer },
          { kind: "link", label: "查看邮件列表", to: "/mail/list", tone: "secondary" },
          { kind: "link", label: "打开 API 密钥", to: "/api-keys", tone: "ghost" }
        ]
      };
    case "mail":
      if (currentSecondary?.to === "/mail/list") {
        return {
          eyebrow: "邮件中心",
          title: "一个工作台，管理所有邮箱",
          description: "在统一工作台中处理收件、查看消息详情，并完成邮件外发。",
          stats: [
            createMailboxStat(inbox.mailboxes, selectedMailbox),
            createMessageStat(inbox.messages.length),
            createOutboundStat(inbox.outboundHistory.length, session.featureToggles)
          ],
          actions: [
            { kind: "button", label: "创建邮箱", tone: "primary", onClick: onOpenMailboxComposer },
            { kind: "link", label: "API 密钥", to: "/api-keys", tone: "secondary" },
            isAdmin
              ? { kind: "link", label: "查看用户列表", to: "/users/list", tone: "ghost" }
              : { kind: "link", label: "系统设置", to: "/system/appearance", tone: "ghost" }
          ]
        };
      }

      return {
        eyebrow: "邮件中心",
        title: `${currentSecondary?.label ?? "邮件"} 页面已占位`,
        description: "顶部已切换为邮件二级菜单，当前页面先保留结构占位，后续再接入对应的邮件工作流。",
        stats: [
          createMailboxStat(inbox.mailboxes, selectedMailbox),
          createMessageStat(inbox.messages.length),
          createOutboundStat(inbox.outboundHistory.length, session.featureToggles)
        ],
        actions: [
          { kind: "link", label: "返回邮件列表", to: "/mail/list", tone: "primary" },
          { kind: "link", label: "账号列表", to: "/accounts/list", tone: "secondary" },
          { kind: "link", label: "Telegram", to: "/telegram", tone: "ghost" }
        ]
      };
    case "users":
      if (adminDisabled) {
        return {
          eyebrow: "受限区域",
          title: "当前无法访问用户管理",
          description: "当前仍会展示统一工作台外壳，但只有管理员才能使用这里的用户控制能力。",
          stats: [createRoleStat(session)],
          actions: [
            { kind: "link", label: "返回仪表盘", to: "/dashboard", tone: "secondary" },
            { kind: "link", label: "打开邮件列表", to: "/mail/list", tone: "ghost" }
          ]
        };
      }

      if (currentSecondary?.to === "/users/list") {
        return {
          eyebrow: "控制中心",
          title: "访问、配额与系统开关",
          description: "在同一张控制台视图中集中管理邀请码、配额、功能开关和邮箱总览。",
          stats: [
            {
              label: "用户数",
              value: String(admin.adminUsers.length),
              detail: "当前控制台可见的账号数量"
            },
            {
              label: "每日上限",
              value: admin.adminQuota ? String(admin.adminQuota.dailyLimit) : "—",
              detail: admin.adminQuota ? `今日已发送 ${admin.adminQuota.sendsToday}` : "选择用户后显示对应配额"
            },
            {
              label: "功能状态",
              value: session.featureToggles.aiEnabled ? "AI 已开启" : "AI 已关闭",
              detail: session.featureToggles.outboundEnabled ? "邮件外发能力已启用" : "邮件外发能力已暂停"
            }
          ],
          actions: [
            { kind: "link", label: "查看邮件列表", to: "/mail/list", tone: "secondary" },
            { kind: "link", label: "打开 API 密钥", to: "/api-keys", tone: "ghost" }
          ]
        };
      }

      return {
        eyebrow: "用户设置",
        title: "用户设置入口已预留",
        description: "管理员二级菜单已切换完成，当前页面先作为占位，后续可在这里补充角色、策略与偏好配置。",
        stats: [
          {
            label: "用户数",
            value: String(admin.adminUsers.length),
            detail: "管理员可见账号总数"
          },
          {
            label: "邀请码",
            value: String(admin.adminInvites.length),
            detail: "可用与已兑换的邀请码"
          },
          {
            label: "邮箱数",
            value: String(admin.adminMailboxes.length),
            detail: "已追踪的邮箱入口"
          }
        ],
        actions: [
          { kind: "link", label: "查看用户列表", to: "/users/list", tone: "primary" },
          { kind: "link", label: "打开邮件列表", to: "/mail/list", tone: "secondary" }
        ]
      };
    case "api-keys":
      return {
        eyebrow: "设置中心",
        title: "密钥、通知与接入控制",
        description: "在统一的圆角工作台中管理自动化凭证、通知路由和账号接入设置。",
        stats: [createApiKeyStat(settings.apiKeys), createTelegramStat(settings.telegram), createRoleStat(session)],
        actions: [
          { kind: "link", label: "打开 Telegram", to: "/telegram", tone: "primary" },
          { kind: "link", label: "查看邮件列表", to: "/mail/list", tone: "secondary" },
          isAdmin
            ? { kind: "link", label: "打开用户列表", to: "/users/list", tone: "ghost" }
            : { kind: "link", label: "系统设置", to: "/system/appearance", tone: "ghost" }
        ]
      };
    case "telegram":
      return {
        eyebrow: "通知路由",
        title: "Telegram 通知配置",
        description: "Telegram 入口已移动到左侧设置组；当前页面聚焦机器人通知与 Chat ID 绑定。",
        stats: [createTelegramStat(settings.telegram), createApiKeyStat(settings.apiKeys), createRoleStat(session)],
        actions: [
          { kind: "link", label: "打开 API 密钥", to: "/api-keys", tone: "primary" },
          { kind: "link", label: "查看邮件列表", to: "/mail/list", tone: "secondary" },
          { kind: "link", label: "系统设置", to: "/system/appearance", tone: "ghost" }
        ]
      };
    case "webhook":
      return {
        eyebrow: "回调接入",
        title: "Webhook 页面已占位",
        description: "Webhook 已出现在左侧设置菜单中，当前先完成导航占位，后续再接入事件订阅与签名配置。",
        stats: [createApiKeyStat(settings.apiKeys), createTelegramStat(settings.telegram), createRoleStat(session)],
        actions: [
          { kind: "link", label: "返回 API 密钥", to: "/api-keys", tone: "primary" },
          { kind: "link", label: "打开文档", to: "/docs", tone: "secondary" }
        ]
      };
    case "docs":
      return {
        eyebrow: "文档中心",
        title: "文档页面已占位",
        description: "文档入口已挂到左侧设置组，后续可在这里接入产品文档、API 说明与使用指南。",
        stats: [createApiKeyStat(settings.apiKeys), createTelegramStat(settings.telegram), createRoleStat(session)],
        actions: [
          { kind: "link", label: "返回仪表盘", to: "/dashboard", tone: "primary" },
          { kind: "link", label: "打开 API 密钥", to: "/api-keys", tone: "secondary" }
        ]
      };
    case "announcements":
      return {
        eyebrow: "公告中心",
        title: "公告页面已占位",
        description: "公告入口已挂到左侧设置组，当前先保留结构位置，后续可补系统公告、变更记录与维护通知。",
        stats: [createApiKeyStat(settings.apiKeys), createTelegramStat(settings.telegram), createRoleStat(session)],
        actions: [
          { kind: "link", label: "返回仪表盘", to: "/dashboard", tone: "primary" },
          { kind: "link", label: "打开文档", to: "/docs", tone: "secondary" }
        ]
      };
    case "system":
      return {
        eyebrow: "系统设置",
        title: currentSecondary?.label ?? "系统设置",
        description:
          currentSecondary?.to === "/system/appearance"
            ? "主题切换仍可通过右上角快速完成，这里先预留外观设置承载位。"
            : "个人设置入口已挂到顶部二级菜单，后续可在这里补个人资料、偏好与安全选项。",
        stats: [createRoleStat(session), createApiKeyStat(settings.apiKeys), createTelegramStat(settings.telegram)],
        actions: [
          { kind: "link", label: "打开 API 密钥", to: "/api-keys", tone: "primary" },
          { kind: "link", label: "打开 Telegram", to: "/telegram", tone: "secondary" },
          { kind: "link", label: "返回仪表盘", to: "/dashboard", tone: "ghost" }
        ]
      };
    default:
      return {
        eyebrow: "工作台",
        title: "导航已更新",
        description: "当前页面正在接入新的管理后台导航结构。",
        stats: [createRoleStat(session)],
        actions: [{ kind: "link", label: "返回仪表盘", to: "/dashboard", tone: "secondary" }]
      };
  }
}

export function buildWorkspaceShellState({
  pathname,
  session,
  inbox,
  settings,
  admin,
  onOpenMailboxComposer
}: WorkspaceShellInput): WorkspaceShellState {
  const normalizedPath = normalizeWorkspacePath(pathname);
  const activePrimary = resolveActivePrimary(normalizedPath);
  const currentSecondary = activePrimary.children?.find((child) => child.to === normalizedPath) ?? null;
  const selectedMailbox = inbox.mailboxes.find((mailbox) => mailbox.id === inbox.selectedMailboxId) ?? null;

  return {
    routeKey: activePrimary.id,
    routeLabel: currentSecondary?.label ?? activePrimary.label,
    activePrimaryId: activePrimary.id,
    activePrimaryLabel: activePrimary.label,
    secondaryNav: activePrimary.adminOnly && session.user.role !== "admin" ? [] : activePrimary.children ?? [],
    railSections: buildRailSections(session),
    hero: buildHero({
      activePrimary,
      currentSecondary,
      session,
      inbox,
      settings,
      admin,
      selectedMailbox,
      onOpenMailboxComposer
    })
  };
}
