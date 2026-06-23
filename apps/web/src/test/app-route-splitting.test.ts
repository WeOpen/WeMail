import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("app route splitting", () => {
  it("keeps public-only pages out of the app bootstrap chunk", () => {
    const appSource = readFileSync("src/app/App.tsx", "utf8");

    expect(appSource).toContain('lazy(() => import("../pages/AuthPage")');
    expect(appSource).toContain('lazy(() => import("../pages/DesignSystemPage")');
    expect(appSource).toContain('lazy(() => import("../features/landing/WemailLandingPage")');
    expect(appSource).not.toMatch(/import \{ AuthPage \} from "\.\.\/pages\/AuthPage"/);
    expect(appSource).not.toMatch(/import \{ DesignSystemPage \} from "\.\.\/pages\/DesignSystemPage"/);
    expect(appSource).not.toMatch(/import \{ WemailLandingPage \} from "\.\.\/features\/landing\/WemailLandingPage"/);
  });

  it("keeps workspace route pages lazy-loaded by route", () => {
    const routesSource = readFileSync("src/app/AppRoutes.tsx", "utf8");

    expect(routesSource).toContain('lazy(() => import("../pages/DashboardPage")');
    expect(routesSource).toContain('lazy(() => import("../pages/InboxPage")');
    expect(routesSource).toContain('lazy(() => import("../features/settings/ApiKeysPage")');
    expect(routesSource).toContain('lazy(() => import("../pages/AnnouncementsPage")');
    expect(routesSource).not.toMatch(/import \{ DashboardPage \} from "\.\.\/pages\/DashboardPage"/);
    expect(routesSource).not.toMatch(/import \{ InboxPage \} from "\.\.\/pages\/InboxPage"/);
    expect(routesSource).not.toMatch(/import \{ ApiKeysPage \} from "\.\.\/features\/settings\/ApiKeysPage"/);
    expect(routesSource).not.toMatch(/import \{ AnnouncementsPage \} from "\.\.\/pages\/AnnouncementsPage"/);
  });

});
