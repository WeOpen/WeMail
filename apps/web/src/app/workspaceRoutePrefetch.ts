const workspaceRoutePrefetchers: Record<string, [string, () => Promise<unknown>]> = {
  "/": ["dashboard", () => import("../pages/DashboardPage")],
  "/dashboard": ["dashboard", () => import("../pages/DashboardPage")],
  "/accounts": ["accounts-list", () => import("../features/accounts/AccountsListRoutePage")],
  "/accounts/list": ["accounts-list", () => import("../features/accounts/AccountsListRoutePage")],
  "/accounts/settings": ["accounts-settings", () => import("../features/accounts/AccountsSettingsPage")],
  "/mail": ["mail-list", () => import("../pages/InboxPage")],
  "/mail/list": ["mail-list", () => import("../pages/InboxPage")],
  "/mail/unassigned": ["mail-outbound", () => import("../features/outbound/OutboundPage")],
  "/mail/outbound": ["mail-outbound", () => import("../features/outbound/OutboundPage")],
  "/mail/settings": ["mail-settings", () => import("../features/settings/MailSettingsPage")],
  "/users": ["users-list", () => import("../pages/UsersListRoutePage")],
  "/users/list": ["users-list", () => import("../pages/UsersListRoutePage")],
  "/users/settings": ["users-settings", () => import("../pages/UsersGlobalSettingsPage")],
  "/admin": ["users-settings", () => import("../pages/UsersGlobalSettingsPage")],
  "/settings": ["api-keys", () => import("../features/settings/ApiKeysPage")],
  "/api-keys": ["api-keys", () => import("../features/settings/ApiKeysPage")],
  "/api-keys/interfaces": ["api-interfaces", () => import("../features/settings/ApiInterfacesPage")],
  "/webhook": ["webhook", () => import("../features/settings/WebhookPage")],
  "/telegram": ["telegram", () => import("../features/settings/TelegramSettingsPage")],
  "/docs": ["docs", () => import("../pages/WorkspacePlaceholderPage")],
  "/announcements": ["announcements", () => import("../pages/AnnouncementsPage")],
  "/system": ["system-settings", () => import("../pages/SystemSettingsPage")],
  "/system/settings": ["system-settings", () => import("../pages/SystemSettingsPage")],
  "/system/profile": ["system-profile", () => import("../pages/SystemProfilePage")],
  "/system/about": ["system-about", () => import("../pages/AboutPage")]
};

const prefetchedWorkspaceRoutes = new Set<string>();
const prefetchedWorkspaceRouteData = new Set<string>();
const workspaceRouteDataPrefetchers: Record<string, [string, () => Promise<unknown>]> = {
  "/": ["dashboard-data", () => import("../features/dashboard/api").then((module) => module.fetchDashboard())],
  "/dashboard": ["dashboard-data", () => import("../features/dashboard/api").then((module) => module.fetchDashboard())],
  "/accounts/settings": ["account-policy-data", () => import("../features/accounts/api").then((module) => module.fetchAccountPolicy())],
  "/mail/settings": ["mail-settings-data", () => import("../features/settings/api").then((module) => module.fetchMailSettings())],
  "/system": ["runtime-settings-data", () => import("../features/settings/api").then((module) => module.fetchRuntimeSettings())],
  "/system/settings": ["runtime-settings-data", () => import("../features/settings/api").then((module) => module.fetchRuntimeSettings())]
};

function prefetchWorkspaceRouteData(pathname: string) {
  const prefetcher = workspaceRouteDataPrefetchers[pathname];
  if (!prefetcher) return;

  const [dataKey, loadData] = prefetcher;
  if (prefetchedWorkspaceRouteData.has(dataKey)) return;

  prefetchedWorkspaceRouteData.add(dataKey);
  void loadData().catch(() => {
    prefetchedWorkspaceRouteData.delete(dataKey);
  });
}

export function prefetchWorkspaceRoute(to: string) {
  const [pathname] = to.split("?");
  const prefetcher = workspaceRoutePrefetchers[pathname];
  if (!prefetcher) return;

  const [routeKey, loadRoute] = prefetcher;
  prefetchWorkspaceRouteData(pathname);
  if (prefetchedWorkspaceRoutes.has(routeKey)) return;

  prefetchedWorkspaceRoutes.add(routeKey);
  void loadRoute().catch(() => {
    prefetchedWorkspaceRoutes.delete(routeKey);
  });
}
