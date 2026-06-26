import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("app route splitting", () => {
  it("keeps public-only pages out of the app bootstrap chunk", () => {
    const appSource = readFileSync("src/app/App.tsx", "utf8");

    expect(appSource).toContain('lazy(() => import("../pages/AuthPage")');
    expect(appSource).toContain('lazy(() => import("../pages/DesignSystemPage")');
    expect(appSource).toContain('lazy(() => import("../features/landing/WemailLandingPage")');
    expect(appSource).toContain('lazy(() => import("./WorkspaceApp")');
    expect(appSource).not.toMatch(/import \{ AuthPage \} from "\.\.\/pages\/AuthPage"/);
    expect(appSource).not.toMatch(/import \{ DesignSystemPage \} from "\.\.\/pages\/DesignSystemPage"/);
    expect(appSource).not.toMatch(/import \{ WemailLandingPage \} from "\.\.\/features\/landing\/WemailLandingPage"/);
    expect(appSource).not.toMatch(/import \{ AppLayout \} from "\.\/AppLayout"/);
    expect(appSource).not.toMatch(/import \{ AppRoutes \} from "\.\/AppRoutes"/);
    expect(appSource).not.toMatch(/import \{ useAppShell \} from "\.\/useAppShell"/);
  });

  it("keeps workspace route pages lazy-loaded by route", () => {
    const routesSource = readFileSync("src/app/AppRoutes.tsx", "utf8");
    const workspaceSource = readFileSync("src/app/WorkspaceApp.tsx", "utf8");

    expect(workspaceSource).toContain('import { AppLayout } from "./AppLayout"');
    expect(workspaceSource).toContain('import { AppRoutes } from "./AppRoutes"');
    expect(workspaceSource).toContain('import { prefetchWorkspaceRoute } from "./workspaceRoutePrefetch"');
    expect(routesSource).toContain('const loadDashboardPage = () => import("../pages/DashboardPage")');
    expect(routesSource).toContain('const loadInboxPage = () => import("../pages/InboxPage")');
    expect(routesSource).toContain('const loadApiKeysPage = () => import("../features/settings/ApiKeysPage")');
    expect(routesSource).toContain('const loadAnnouncementsPage = () => import("../pages/AnnouncementsPage")');
    expect(routesSource).toContain("const DashboardPage = lazy(loadDashboardPage)");
    expect(routesSource).toContain("const InboxPage = lazy(loadInboxPage)");
    expect(routesSource).toContain("const ApiKeysPage = lazy(loadApiKeysPage)");
    expect(routesSource).toContain("const AnnouncementsPage = lazy(loadAnnouncementsPage)");
    expect(routesSource).not.toMatch(/import \{ DashboardPage \} from "\.\.\/pages\/DashboardPage"/);
    expect(routesSource).not.toMatch(/import \{ InboxPage \} from "\.\.\/pages\/InboxPage"/);
    expect(routesSource).not.toMatch(/import \{ ApiKeysPage \} from "\.\.\/features\/settings\/ApiKeysPage"/);
    expect(routesSource).not.toMatch(/import \{ AnnouncementsPage \} from "\.\.\/pages\/AnnouncementsPage"/);
  });

  it("uses a skeleton shell while workspace route chunks load", () => {
    const routesSource = readFileSync("src/app/AppRoutes.tsx", "utf8");
    const stylesSource = readFileSync("src/shared/styles/index.css", "utf8");

    expect(routesSource).toContain('import { Skeleton } from "../shared/skeleton"');
    expect(routesSource).toContain('aria-label="工作台页面加载中"');
    expect(routesSource).toContain("workspace-route-skeleton-kpis");
    expect(stylesSource).toContain(".workspace-route-skeleton-kpis");
    expect(stylesSource).toContain(".workspace-route-skeleton-main");
  });

  it("loads heavy Nivo charts from page-level async chunks", () => {
    const dashboardSource = readFileSync("src/pages/DashboardPage.tsx", "utf8");
    const announcementsSource = readFileSync("src/pages/AnnouncementsPage.tsx", "utf8");

    expect(dashboardSource).toContain('lazy(() => import("@nivo/line")');
    expect(dashboardSource).toContain('lazy(() => import("@nivo/bar")');
    expect(dashboardSource).toContain('lazy(() => import("@nivo/pie")');
    expect(announcementsSource).toContain('lazy(() => import("@nivo/pie")');
    expect(dashboardSource).not.toMatch(/import \{ Responsive(?:Bar|Line|Pie) \} from "@nivo\//);
    expect(announcementsSource).not.toMatch(/import \{ ResponsivePie \} from "@nivo\/pie"/);
  });

  it("prefetches lazy workspace route chunks from navigation intent", () => {
    const layoutSource = readFileSync("src/app/AppLayout.tsx", "utf8");
    const prefetchSource = readFileSync("src/app/workspaceRoutePrefetch.ts", "utf8");
    const workspaceSource = readFileSync("src/app/WorkspaceApp.tsx", "utf8");

    expect(prefetchSource).toContain("export function prefetchWorkspaceRoute");
    expect(prefetchSource).toContain("prefetchedWorkspaceRoutes");
    expect(prefetchSource).toContain("workspaceRouteDataPrefetchers");
    expect(prefetchSource).toContain("fetchDashboard");
    expect(prefetchSource).toContain('"/dashboard": ["dashboard"');
    expect(layoutSource).toContain("onPrefetchRoute?: (to: string) => void");
    expect(layoutSource).toContain("onMouseEnter={() => onPrefetchRoute?.(item.to)}");
    expect(layoutSource).toContain("onFocus={() => onPrefetchRoute?.(item.to)}");
    expect(workspaceSource).toContain("onPrefetchRoute={prefetchWorkspaceRoute}");
  });

  it("defers expensive chart mounts until their chart region approaches the viewport", () => {
    const dashboardSource = readFileSync("src/pages/DashboardPage.tsx", "utf8");
    const announcementsSource = readFileSync("src/pages/AnnouncementsPage.tsx", "utf8");
    const viewportDeferredSource = readFileSync("src/shared/ViewportDeferred.tsx", "utf8");

    expect(viewportDeferredSource).toContain("IntersectionObserver");
    expect(dashboardSource).toContain("<ViewportDeferred fallback={<DashboardChartSkeleton");
    expect(announcementsSource).toContain("<ViewportDeferred fallback={<AnnouncementsChartSkeleton");
  });
});
