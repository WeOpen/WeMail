import type { SessionSummary } from "@wemail/shared";

type RouteKey =
  | "dashboard"
  | "accounts"
  | "mail"
  | "users"
  | "api-keys"
  | "webhook"
  | "telegram"
  | "announcements"
  | "system"
  | "about";

export type WorkspaceRailIcon =
  | "dashboard"
  | "accounts"
  | "mail"
  | "users"
  | "keys"
  | "webhook"
  | "telegram"
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
};

type WorkspaceShellInput = {
  pathname: string;
  session: SessionSummary;
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
    to: "/system/settings",
    icon: "system",
    children: [
      { label: "系统设置", to: "/system/settings" },
      { label: "个人设置", to: "/system/profile" },
      { label: "关于我们", to: "/system/about" }
    ]
  }
];

function normalizeWorkspacePath(pathname: string) {
  if (pathname === "/" || pathname === "/dashboard") return "/dashboard";
  if (pathname === "/settings") return "/api-keys";
  if (pathname === "/admin") return "/users/list";
  if (pathname === "/accounts") return "/accounts/list";
  if (pathname === "/mail") return "/mail/list";
  if (pathname === "/mail/unassigned") return "/mail/outbound";
  if (pathname === "/users") return "/users/list";
  if (pathname === "/system") return "/system/settings";
  return pathname;
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

export function buildWorkspaceShellState({ pathname, session }: WorkspaceShellInput): WorkspaceShellState {
  const normalizedPath = normalizeWorkspacePath(pathname);
  const activePrimary = resolveActivePrimary(normalizedPath);
  const currentSecondary = activePrimary.children?.find((child) => child.to === normalizedPath) ?? null;

  return {
    routeKey: activePrimary.id,
    routeLabel: currentSecondary?.label ?? activePrimary.label,
    activePrimaryId: activePrimary.id,
    activePrimaryLabel: activePrimary.label,
    secondaryNav: activePrimary.adminOnly && session.user.role !== "admin" ? [] : activePrimary.children ?? [],
    railSections: buildRailSections(session)
  };
}
