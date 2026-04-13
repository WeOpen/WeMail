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

type RouteKey = "inbox" | "settings" | "admin";

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
  eyebrow: string;
  title: string;
  description: string;
  stats: WorkspaceHeroStat[];
  actions: WorkspaceAction[];
};

type WorkspacePrimaryNavItem = {
  to: string;
  label: string;
  badge?: string;
};

type WorkspaceRailItem =
  | {
      kind: "link";
      label: string;
      to: string;
      badge?: string;
      hint?: string;
    }
  | {
      kind: "stat";
      label: string;
      value: string;
      hint?: string;
    };

type WorkspaceRailSection = {
  title: string;
  items: WorkspaceRailItem[];
};

export type WorkspaceShellState = {
  routeKey: RouteKey;
  routeLabel: string;
  searchPlaceholder: string;
  primaryNav: WorkspacePrimaryNavItem[];
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

function formatToggleState(featureToggles: FeatureToggles) {
  return [
    featureToggles.aiEnabled ? "AI 已启用" : "AI 已关闭",
    featureToggles.telegramEnabled ? "Telegram 已启用" : "Telegram 已关闭",
    featureToggles.outboundEnabled ? "外发已启用" : "外发已暂停"
  ];
}

function determineRouteKey(pathname: string): RouteKey {
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/admin")) return "admin";
  return "inbox";
}

function buildPrimaryNav(session: SessionSummary): WorkspacePrimaryNavItem[] {
  const nav: WorkspacePrimaryNavItem[] = [
    { to: "/", label: "收件箱" },
    { to: "/settings", label: "设置" }
  ];

  if (session.user.role === "admin") {
    nav.push({ to: "/admin", label: "管理后台" });
  }

  return nav;
}

export function buildWorkspaceShellState({
  pathname,
  session,
  inbox,
  settings,
  admin,
  onOpenMailboxComposer
}: WorkspaceShellInput): WorkspaceShellState {
  const routeKey = determineRouteKey(pathname);
  const primaryNav = buildPrimaryNav(session);
  const runtimeSignals = formatToggleState(session.featureToggles);
  const selectedMailbox = inbox.mailboxes.find((mailbox) => mailbox.id === inbox.selectedMailboxId) ?? null;

  const workspaceLinks: WorkspaceRailSection = {
    title: "工作台",
    items: primaryNav.map((item) => ({
      kind: "link" as const,
      label: item.label,
      to: item.to,
      badge: item.to === "/admin" ? String(admin.adminUsers.length || 0) : undefined,
      hint: item.to === pathname ? "当前页" : undefined
    }))
  };

  const runtimeSection: WorkspaceRailSection = {
    title: "运行状态",
    items: runtimeSignals.map((signal) => ({
      kind: "stat" as const,
      label: signal,
      value: session.user.role === "admin" ? "系统" : "当前会话",
      hint: `当前账号：${session.user.email}`
    }))
  };

  if (routeKey === "settings") {
    return {
      routeKey,
      routeLabel: "设置",
      searchPlaceholder: '搜索“密钥”',
      primaryNav,
      railSections: [
        workspaceLinks,
        {
          title: "设置",
          items: [
            {
              kind: "stat",
              label: "API 密钥",
              value: String(settings.apiKeys.length),
              hint: settings.apiKeys.length > 0 ? "已有自动化凭证" : "当前还没有自动化密钥"
            },
            {
              kind: "stat",
              label: "Telegram",
              value: settings.telegram?.enabled ? "已启用" : "未启用",
              hint: settings.telegram?.chatId ? `Chat ${settings.telegram.chatId}` : "尚未绑定 Chat ID"
            },
            {
              kind: "stat",
              label: "角色",
              value: session.user.role === "admin" ? "管理员" : "成员",
              hint: session.user.email
            }
          ]
        },
        runtimeSection
      ],
      hero: {
        eyebrow: "设置中心",
        title: "密钥、通知与接入控制",
        description: "在统一的圆角工作台中管理自动化凭证、通知路由和账号接入设置。",
        stats: [
          {
            label: "API 密钥",
            value: String(settings.apiKeys.length),
            detail: settings.apiKeys.length > 0 ? "自动化凭证已就绪" : "创建第一把 API 密钥"
          },
          {
            label: "Telegram",
            value: settings.telegram?.enabled ? "已启用" : "未启用",
            detail: settings.telegram?.chatId ? `Chat ${settings.telegram.chatId}` : "当前未连接任何 Chat"
          },
          {
            label: "角色",
            value: session.user.role === "admin" ? "管理员" : "成员",
            detail: "权限继承自当前登录账号"
          }
        ],
        actions: [
          { kind: "link", label: "查看收件箱", to: "/", tone: "secondary" },
          session.user.role === "admin"
            ? { kind: "link", label: "打开管理后台", to: "/admin", tone: "ghost" }
            : { kind: "button", label: "当前会话", tone: "ghost" }
        ]
      }
    };
  }

  if (routeKey === "admin") {
    const adminDisabled = session.user.role !== "admin";

    return {
      routeKey,
      routeLabel: "管理后台",
      searchPlaceholder: '搜索“配额”',
      primaryNav,
      railSections: [
        workspaceLinks,
        {
          title: "管理后台",
          items: adminDisabled
            ? [
                {
                  kind: "stat",
                  label: "访问权限",
                  value: "受限",
                  hint: "需要管理员权限"
                }
              ]
            : [
                {
                  kind: "stat",
                  label: "用户数",
                  value: String(admin.adminUsers.length),
                  hint: "受管理账号"
                },
                {
                  kind: "stat",
                  label: "邀请码",
                  value: String(admin.adminInvites.length),
                  hint: "可用与已兑换的邀请码"
                },
                {
                  kind: "stat",
                  label: "邮箱数",
                  value: String(admin.adminMailboxes.length),
                  hint: "已追踪的邮箱入口"
                }
              ]
        },
        runtimeSection
      ],
      hero: {
        eyebrow: adminDisabled ? "受限区域" : "控制中心",
        title: adminDisabled ? "当前无法访问控制台" : "访问、配额与系统开关",
        description: adminDisabled
          ? "当前仍会展示统一工作台外壳，但只有管理员才能使用这里的控制能力。"
          : "在同一张控制台视图中集中管理邀请码、配额、功能开关和邮箱总览。",
        stats: adminDisabled
          ? [
              {
                label: "角色",
                value: "成员",
                detail: "需要提升权限后才能操作管理员能力"
              }
            ]
          : [
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
        actions: adminDisabled
          ? [{ kind: "link", label: "返回收件箱", to: "/", tone: "secondary" }]
          : [
              { kind: "link", label: "查看收件箱", to: "/", tone: "secondary" },
              { kind: "link", label: "调整设置", to: "/settings", tone: "ghost" }
            ]
      }
    };
  }

  return {
    routeKey,
    routeLabel: "收件箱",
    searchPlaceholder: '搜索“消息”',
    primaryNav,
    railSections: [
      workspaceLinks,
      {
        title: "收件箱",
        items: [
          {
            kind: "stat",
            label: "邮箱数",
            value: String(inbox.mailboxes.length),
            hint: selectedMailbox ? `${selectedMailbox.label} 已选中` : "选择一个邮箱以聚焦消息流"
          },
          {
            kind: "stat",
            label: "消息数",
            value: String(inbox.messages.length),
            hint: inbox.messages.length > 0 ? "最新消息已加载" : "当前没有任何消息"
          },
          {
            kind: "stat",
            label: "外发数",
            value: String(inbox.outboundHistory.length),
            hint: inbox.outboundHistory.length > 0 ? "最近外发记录可见" : "当前还没有外发记录"
          }
        ]
      },
      runtimeSection
    ],
    hero: {
      eyebrow: "收件工作台",
      title: "一个工作台，管理所有邮箱",
      description: "在统一工作台中处理收件、查看消息详情，并完成邮件外发。",
      stats: [
        {
          label: "邮箱数",
          value: String(inbox.mailboxes.length),
          detail: selectedMailbox ? `${selectedMailbox.label} 当前已激活` : "创建第一个邮箱开始接收邮件"
        },
        {
          label: "消息数",
          value: String(inbox.messages.length),
          detail: inbox.messages.length > 0 ? "当前邮箱的消息流已连接" : "消息流已准备好接收新邮件"
        },
        {
          label: "外发数",
          value: String(inbox.outboundHistory.length),
          detail: session.featureToggles.outboundEnabled ? "邮件外发能力已启用" : "邮件外发能力已暂停"
        }
      ],
      actions: [
        { kind: "button", label: "创建邮箱", tone: "primary", onClick: onOpenMailboxComposer },
        { kind: "link", label: "打开设置", to: "/settings", tone: "secondary" },
        session.user.role === "admin"
          ? { kind: "link", label: "查看管理后台", to: "/admin", tone: "ghost" }
          : { kind: "button", label: "当前成员会话", tone: "ghost" }
      ]
    }
  };
}
