import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../app/App";
import { WORKSPACE_THEME_STORAGE_KEY } from "../app/appStore";
import { apiInterfaceGroups } from "../features/settings/api-interface-catalog.generated";
import { designSystemGroups } from "../pages/design-system/designSystemContent";
import { jsonResponse } from "./helpers/mock-api";

const apiInterfaceCount = apiInterfaceGroups.reduce((total, group) => total + group.endpoints.length, 0);

const originalMatchMedia = window.matchMedia;

function mockMemberSessionFetch(input: RequestInfo | URL) {
  const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

  if (url.endsWith("/api/auth/session")) {
    return jsonResponse({
      user: {
        id: "member-1",
        email: "member@example.com",
        role: "member",
        createdAt: "2026-04-08T00:00:00.000Z"
      },
      featureToggles: {
        aiEnabled: true,
        telegramEnabled: true,
        outboundEnabled: true,
        mailboxCreationEnabled: true
      }
    });
  }

  if (url.endsWith("/api/system/health")) {
    return jsonResponse({
      ok: true,
      environment: "test",
      appName: "WeMail"
    });
  }

  if (url.endsWith("/api/profile")) {
    return jsonResponse({
      profile: {
        user: {
          id: "member-1",
          email: "member@example.com",
          role: "member",
          createdAt: "2026-04-08T00:00:00.000Z",
          name: "Member User",
          bio: ""
        },
        preferences: {
          landingPage: "/mail/list",
          dashboardDensity: "comfortable"
        }
      }
    });
  }

  if (url.endsWith("/api/profile/sessions")) return jsonResponse({ sessions: [] });

  if (url.endsWith("/api/accounts")) return jsonResponse({ mailboxes: [] });
  if (url.endsWith("/api/mail/settings")) return jsonResponse({ settings: null });
  if (url.endsWith("/api/dictionaries")) return jsonResponse({ dictionaries: [] });
  if (url.includes("/api/mail/outbound")) return jsonResponse({ messages: [], total: 0 });
  if (url.includes("/api/announcements")) return jsonResponse({ announcements: [] });

  return jsonResponse({});
}

function installMatchMedia({
  compactNavigation = false,
  dark = true
}: {
  compactNavigation?: boolean;
  dark?: boolean;
} = {}) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches:
        query === "(prefers-color-scheme: dark)"
          ? dark
          : query === "(max-width: 980px)"
            ? compactNavigation
            : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

describe("App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse({}));
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: originalMatchMedia
    });
  });

  it("renders an icon-first branded loading shell while the session request is pending", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise<Response>(() => {
          // keep the session bootstrap pending so the loading shell stays visible
        })
    );

    const { container } = render(<App />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent(/Preparing WeMail/i);
    expect(screen.getByText(/Loading workspace/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /WeMail loading mark/i })).toBeInTheDocument();
    expect(container.querySelector(".wemail-loading-title")).toBeNull();
    expect(container.querySelector(".wemail-loading-detail")).toBeNull();
    expect(screen.queryByText(/姝ｅ湪鍔犺浇 WeMail 宸ヤ綔鍙?/i)).not.toBeInTheDocument();
  });

  it(
    "renders the optimus-style landing shell for signed-out users",
    async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("not authenticated"));
      render(<App />);

      const navigation = await screen.findByRole("navigation", { name: /首页导航/i });
      expect(navigation).toBeInTheDocument();
      expect(within(navigation).getByLabelText(/WeMail brand lockup/i)).toBeInTheDocument();
      expect(within(navigation).getByRole("link", { name: /^产品能力$/i })).toHaveAttribute("href", "#features");
      expect(within(navigation).getByRole("link", { name: /^使用流程$/i })).toHaveAttribute("href", "#how-it-works");
      expect(within(navigation).getByRole("link", { name: /^开发接入$/i })).toHaveAttribute("href", "#developers");
      expect(within(navigation).getByRole("link", { name: /^方案价格$/i })).toHaveAttribute("href", "#pricing");
      expect(within(navigation).getByRole("link", { name: /设计系统/i })).toHaveAttribute("href", "/design-system");
      expect(screen.getByRole("heading", { level: 1, name: /把临时邮箱/i })).toBeInTheDocument();
      expect(within(navigation).getByRole("link", { name: /登录/i })).toHaveClass("ui-button", "ui-button-secondary");
      expect(within(navigation).getByRole("link", { name: /注册/i })).toHaveClass("ui-button", "ui-button-primary");
      expect(within(navigation).getByRole("button", { name: /切换到浅色主题|切换到深色主题/i })).toHaveClass(
        "landing-nav-theme-toggle",
        "landing-nav-edge-control"
      );
      expect(screen.getAllByRole("link", { name: /立即开始/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("link", { name: /进入登录/i }).length).toBeGreaterThan(0);
    },
    10000
  );

  it(
    "loads the landing footer health status from the public API and links to the hosted docs",
    async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
        if (url.endsWith("/api/system/health")) {
          return jsonResponse({
            ok: true,
            environment: "test",
            appName: "WeMail"
          });
        }

        return Promise.reject(new Error("not authenticated"));
      });

      render(<App />);

      expect(await screen.findByRole("heading", { level: 1, name: /把临时邮箱/i })).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByRole("status", { name: "系统健康状态" })).toHaveTextContent("系统运行正常");
      });
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/system/health"), expect.any(Object));
      expect(screen.getByRole("link", { name: "部署文档" })).toHaveAttribute("href", "https://doc.wemail.willxue.com");
      expect(screen.getByRole("button", { name: "返回顶部" })).toHaveClass("floating-back-to-top", "landing-back-to-top");
    },
    10000
  );

  it(
    "keeps the public landing page available for signed-in users and replaces auth actions with a console link",
    async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(mockMemberSessionFetch);
      const { container } = render(<App />);

      const navigation = await screen.findByRole("navigation", { name: /首页导航/i });

      expect(screen.getByRole("heading", { level: 1, name: /把临时邮箱/i })).toBeInTheDocument();
      expect(within(navigation).queryByRole("link", { name: /^登录$/i })).not.toBeInTheDocument();
      expect(within(navigation).queryByRole("link", { name: /^注册$/i })).not.toBeInTheDocument();

      const consoleLink = within(navigation).getByRole("link", { name: /^控制台$/i });
      expect(consoleLink).toHaveClass("ui-button", "ui-button-primary");
      await waitFor(() => {
        expect(consoleLink).toHaveAttribute("href", "/mail/list");
      });
      const landingCtaRows = Array.from(container.querySelectorAll(".landing-cta-row"));
      expect(landingCtaRows).toHaveLength(2);

      for (const ctaRow of landingCtaRows) {
        const cta = within(ctaRow as HTMLElement).getByRole("link", { name: /^进入控制台$/i });
        expect(cta).toHaveClass("ui-button", "ui-button-primary");
        expect(cta).toHaveAttribute("href", "/mail/list");
        expect(within(ctaRow as HTMLElement).queryByRole("link", { name: /立即开始|受邀注册|进入登录/i })).not.toBeInTheDocument();
      }
      expect(window.location.pathname).toBe("/");
    },
    10000
  );

  it(
    "keeps non-dashboard workspace data requests out of the dashboard entry path",
    async () => {
      window.history.pushState({}, "", "/dashboard");
      const requestedUrls: string[] = [];
      vi.spyOn(globalThis, "fetch").mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
        requestedUrls.push(url);

        if (url.endsWith("/api/auth/session")) {
          return jsonResponse({
            user: {
              id: "member-1",
              email: "member@example.com",
              role: "member",
              createdAt: "2026-04-08T00:00:00.000Z"
            },
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: true
            }
          });
        }

        if (url.endsWith("/api/profile")) {
          return jsonResponse({
            profile: {
              user: {
                id: "member-1",
                email: "member@example.com",
                role: "member",
                createdAt: "2026-04-08T00:00:00.000Z",
                name: "Member User",
                bio: ""
              },
              preferences: {
                landingPage: "/dashboard",
                dashboardDensity: "comfortable"
              }
            }
          });
        }

        if (url.endsWith("/api/profile/sessions")) return jsonResponse({ sessions: [] });

        if (url.endsWith("/api/dashboard")) {
          return jsonResponse({
            kpis: [
              { kicker: "今日收件", label: "收件总量", value: "0", detail: "暂无收件数据", change: "较昨日 0" },
              { kicker: "今日发件", label: "发件总量", value: "0", detail: "暂无发件数据", change: "失败重试 0 次" },
              { kicker: "API 密钥数", label: "活跃密钥", value: "0", detail: "0 个正在使用", change: "0 个待轮换" },
              { kicker: "Webhook", label: "投递端点", value: "0", detail: "0 个正常投递", change: "失败重试 0 次" },
              { kicker: "公告", label: "已发布公告", value: "0", detail: "0 条正在展示", change: "本周发布 0 条" }
            ],
            trend: { week: [], month: [], year: [] },
            accountDistribution: [],
            accountTotal: 0,
            resources: [],
            growth: { week: [], month: [], year: [] },
            userRoles: [],
            userTotal: 0
          });
        }
        if (url.endsWith("/api/accounts")) return jsonResponse({ mailboxes: [] });
        if (url.includes("/api/announcements")) return jsonResponse({ announcements: [], page: 1, pageSize: 5, total: 0 });
        return jsonResponse({});
      });

      render(<App />);

      expect(await screen.findByLabelText("仪表盘核心指标")).toBeInTheDocument();
      await waitFor(() => expect(requestedUrls.some((url) => url.endsWith("/api/dashboard"))).toBe(true));

      expect(requestedUrls.some((url) => url.endsWith("/api/api-keys"))).toBe(false);
      expect(requestedUrls.some((url) => url.includes("/api/telegram/"))).toBe(false);
      expect(requestedUrls.some((url) => url.includes("/api/dictionaries"))).toBe(false);
      expect(requestedUrls.some((url) => url.includes("/api/system/runtime-settings"))).toBe(false);
      expect(requestedUrls.some((url) => url.endsWith("/api/accounts"))).toBe(false);
      expect(requestedUrls.some((url) => url.includes("/api/accounts/domains"))).toBe(false);
      expect(requestedUrls.some((url) => url.includes("/api/accounts/settings"))).toBe(false);
      expect(requestedUrls.some((url) => url.includes("/api/mail/outbound"))).toBe(false);
    },
    10000
  );

  it(
    "renders the design system as a public grouped component gallery",
    async () => {
      window.history.pushState({}, "", "/design-system");
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("not authenticated"));
      render(<App />);

      expect(await screen.findByTestId("design-system-page", undefined, { timeout: 10000 })).toBeInTheDocument();
      expect(screen.queryByRole("navigation", { name: "Design system sidebar" })).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 1, name: "Components" })).toBeInTheDocument();
      for (const group of designSystemGroups.slice(0, 2)) {
        expect(screen.getByRole("region", { name: `${group.title} 组件组` })).toBeInTheDocument();
      }
      expect(screen.getByRole("article", { name: "Button 组件展示" })).toBeInTheDocument();
      expect(screen.getByRole("article", { name: "Card 组件展示" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { level: 2, name: "Import" })).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { level: 2, name: "API Reference" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "打开对话框" })).not.toBeInTheDocument();
      expect(screen.queryByRole("tablist", { name: /认证方式切换/i })).not.toBeInTheDocument();
    },
    10000
  );

  it(
    "shows the console action on the design system page for signed-in users",
    async () => {
      window.history.pushState({}, "", "/design-system");
      vi.spyOn(globalThis, "fetch").mockImplementation(mockMemberSessionFetch);
      render(<App />);

      expect(await screen.findByTestId("design-system-page", undefined, { timeout: 10000 })).toBeInTheDocument();
      const navigation = screen.getByRole("navigation", { name: /首页导航/i });
      const consoleLink = await within(navigation).findByRole("link", { name: /^控制台$/i });

      expect(consoleLink).toHaveClass("ui-button", "ui-button-primary");
      await waitFor(() => {
        expect(consoleLink).toHaveAttribute("href", "/mail/list");
      });
      expect(within(navigation).queryByRole("link", { name: /^登录$/i })).not.toBeInTheDocument();
      expect(within(navigation).queryByRole("link", { name: /^注册$/i })).not.toBeInTheDocument();
    },
    10000
  );

  it(
    "shows representative component variants directly in the gallery",
    async () => {
      window.history.pushState({}, "", "/design-system");
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("not authenticated"));
      render(<App />);

      const buttonCard = await screen.findByRole("article", { name: "Button 组件展示" });
      expect(within(buttonCard).getByRole("button", { name: "保存变更" })).toBeInTheDocument();
      expect(within(buttonCard).getByRole("button", { name: "查看历史" })).toBeInTheDocument();
      expect(within(buttonCard).getByRole("button", { name: "取消" })).toBeInTheDocument();
      expect(within(buttonCard).getByRole("button", { name: "停用账号" })).toBeInTheDocument();

      const badgeCard = screen.getByRole("article", { name: "Badge 组件展示" });
      expect(within(badgeCard).getByText("启用")).toBeInTheDocument();
      expect(within(badgeCard).getByText("待处理")).toBeInTheDocument();
      expect(within(badgeCard).getByText("阻塞")).toBeInTheDocument();
    },
    10000
  );

  it(
    "syncs the design system theme toggle with the workspace theme storage",
    async () => {
      window.history.pushState({}, "", "/design-system");
      installMatchMedia({ dark: true });
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("not authenticated"));
      render(<App />);

      expect(await screen.findByTestId("design-system-page", undefined, { timeout: 10000 })).toBeInTheDocument();
      expect(document.documentElement.dataset.theme).toBe("dark");

      fireEvent.click(screen.getByRole("button", { name: /切换到浅色主题|切换到深色主题/i }));

      await waitFor(() => {
        expect(document.documentElement.dataset.theme).toBe("light");
      });
      expect(window.localStorage.getItem(WORKSPACE_THEME_STORAGE_KEY)).toBe("light");
      expect(window.localStorage.getItem("wemail-design-system-preview-theme")).toBeNull();
    },
    10000
  );

  it(
    "toggles the landing page theme from the topbar action",
    async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("not authenticated"));
      installMatchMedia({ dark: true });
      render(<App />);

      const navigation = await screen.findByRole("navigation", { name: /首页导航/i });
      const toggle = within(navigation).getByRole("button", { name: /切换到浅色主题/i });

      expect(document.documentElement.dataset.theme).toBe("dark");

      fireEvent.click(toggle);

      await waitFor(() => {
        expect(document.documentElement.dataset.theme).toBe("light");
      });
      expect(window.localStorage.getItem(WORKSPACE_THEME_STORAGE_KEY)).toBe("light");
      expect(within(navigation).getByRole("button", { name: /切换到深色主题/i })).toBeInTheDocument();
    },
    10000
  );

  it(
    "navigates from the landing page to the login form",
    async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("not authenticated"));
      const { container } = render(<App />);

      const navigation = await screen.findByRole("navigation", { name: /首页导航/i });
      fireEvent.click(within(navigation).getByRole("link", { name: /登录/i }));

      expect(await screen.findByRole("button", { name: /^立即登录$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^立即登录$/i })).toHaveClass("ui-button", "ui-button-primary");
      expect(screen.getByLabelText(/WeMail auth brand/i)).toBeInTheDocument();
      expect(screen.queryAllByRole("heading", { name: /登录到 WeMail/i })).toHaveLength(0);
      expect(screen.queryByText(/在同一个认证入口里切换登录与注册/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^账号登录$/i)).not.toBeInTheDocument();
      const emailInput = screen.getByLabelText(/邮箱/i, { selector: "input" });
      const passwordInput = screen.getByLabelText(/密码/i, { selector: "input" });
      expect(emailInput).toBeInTheDocument();
      expect(emailInput.closest(".form-control-shell")?.querySelector(".form-control-icon")).not.toBeNull();
      expect(passwordInput).toHaveAttribute("type", "password");

      const toggle = screen.getByRole("button", { name: "显示密码" });
      expect(toggle).toBeInTheDocument();

      fireEvent.click(toggle);
      expect(screen.getByLabelText(/密码/i, { selector: "input" })).toHaveAttribute("type", "text");
      expect(screen.getByRole("button", { name: "隐藏密码" })).toBeInTheDocument();
      expect(container.querySelectorAll(".form-control-shell").length).toBeGreaterThanOrEqual(2);
    },
    10000
  );

  it(
    "navigates back to the landing page when the auth brand is clicked",
    async () => {
      window.history.pushState({}, "", "/login?next=%2Fsettings");
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("not authenticated"));
      render(<App />);

      fireEvent.click(await screen.findByRole("link", { name: /WeMail auth brand/i }));

      await waitFor(() => {
        expect(window.location.pathname).toBe("/");
      });
      expect(window.location.search).toBe("");
      expect(await screen.findByRole("navigation", { name: /首页导航/i })).toBeInTheDocument();
    },
    10000
  );


  it(
    "opens the landing mobile menu on demand",
    async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("not authenticated"));
      installMatchMedia({ compactNavigation: true, dark: true });
      render(<App />);

      fireEvent.click(await screen.findByRole("button", { name: /切换菜单/i }));

      const dialog = screen.getByRole("dialog", { name: /首页移动菜单/i });
      expect(dialog).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /切换菜单/i })).toHaveClass(
        "landing-nav-mobile-toggle",
        "landing-nav-mobile-toggle-tight"
      );
      expect(screen.getByRole("button", { name: /切换菜单/i })).not.toHaveStyle({ transform: "translateY(-1px)" });
      expect(within(dialog).getByRole("link", { name: /^方案价格$/i })).toHaveAttribute("href", "#pricing");
      expect(within(dialog).getByRole("link", { name: /登录/i })).toBeInTheDocument();
      expect(within(dialog).queryByRole("link", { name: /设计系统/i })).toBeInTheDocument();
      expect(within(dialog).queryByRole("button", { name: /切换到浅色主题|切换到深色主题/i })).toHaveClass("landing-nav-theme-toggle");

      fireEvent.click(within(dialog).getByRole("link", { name: /设计系统/i }));

      await waitFor(() => {
        expect(window.location.pathname).toBe("/design-system");
      });
    },
    10000
  );

  it(
    "shows the console action instead of auth links in the signed-in mobile landing menu",
    async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(mockMemberSessionFetch);
      installMatchMedia({ compactNavigation: true, dark: true });
      render(<App />);

      fireEvent.click(await screen.findByRole("button", { name: /切换菜单/i }));

      const dialog = screen.getByRole("dialog", { name: /首页移动菜单/i });
      expect(within(dialog).queryByRole("link", { name: /^登录$/i })).not.toBeInTheDocument();
      expect(within(dialog).queryByRole("link", { name: /^注册$/i })).not.toBeInTheDocument();

      const consoleLink = within(dialog).getByRole("link", { name: /^控制台$/i });
      expect(consoleLink).toHaveClass("ui-button", "ui-button-primary");
      await waitFor(() => {
        expect(consoleLink).toHaveAttribute("href", "/mail/list");
      });
    },
    10000
  );

  it(
    "renders each integration card only once on compact navigation",
    async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("not authenticated"));
      installMatchMedia({ compactNavigation: true, dark: true });
      const { container } = render(<App />);

      await screen.findByRole("heading", { level: 2, name: /和你已经在用的系统自然接上/i });

      const integrationsSection = container.querySelector("#integrations");
      expect(integrationsSection).not.toBeNull();
      expect(integrationsSection?.querySelectorAll(".landing-integration-card")).toHaveLength(12);
      expect(within(integrationsSection as HTMLElement).getAllByText(/^Cloudflare$/i)).toHaveLength(1);
      expect(within(integrationsSection as HTMLElement).getAllByText(/^Telegram$/i)).toHaveLength(1);
      expect(within(integrationsSection as HTMLElement).getAllByText(/^Feature Flags$/i)).toHaveLength(1);
    },
    10000
  );

  it(
    "redirects signed-out deep links into login with a return target",
    async () => {
      window.history.pushState({}, "", "/settings");
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("not authenticated"));
      render(<App />);

      expect(await screen.findByRole("button", { name: /^立即登录$/i })).toBeInTheDocument();
      await waitFor(() => {
        expect(window.location.pathname).toBe("/login");
      });
      expect(window.location.search).toContain("next=%2Fsettings");
    },
    10000
  );

  it(
    "preserves the next target when switching auth tabs",
    async () => {
      window.history.pushState({}, "", "/login?next=%2Fsettings");
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("not authenticated"));
      render(<App />);

      fireEvent.click(await screen.findByRole("tab", { name: /^注册$/i }));
      await waitFor(() => {
        expect(window.location.pathname).toBe("/register");
      });
      expect(window.location.search).toContain("next=%2Fsettings");

      fireEvent.click(screen.getByRole("tab", { name: /^登录$/i }));
      await waitFor(() => {
        expect(window.location.pathname).toBe("/login");
      });
      expect(window.location.search).toContain("next=%2Fsettings");
    },
    10000
  );

  it(
    "restores the intended route after authentication when next is present",
    async () => {
      window.history.pushState({}, "", "/login?next=%2Fsettings");
      vi.restoreAllMocks();
      vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

        if (url.endsWith("/api/auth/session")) {
          return jsonResponse({
            user: {
              id: "member-1",
              email: "member@example.com",
              role: "member",
              createdAt: "2026-04-08T00:00:00.000Z"
            },
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: true
            }
          });
        }

        if (url.includes("/api/accounts/list?")) return jsonResponse({ accounts: [], total: 0 });
        if (url.endsWith("/api/accounts")) return jsonResponse({ mailboxes: [] });
        if (url.endsWith("/api/api-keys")) return jsonResponse({ keys: [] });
        if (url.endsWith("/api/telegram/subscription")) return jsonResponse({ subscription: null });
        if (url.endsWith("/api/users")) return jsonResponse({ users: [] });
        if (url.includes("/api/users/invites")) return jsonResponse({ invites: [] });
        if (url.endsWith("/api/system/features")) {
          return jsonResponse({
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: true
            }
          });
        }
        if (/\/api\/users\/[^/]+\/quota/.test(url)) {
          return jsonResponse({
            quota: {
              userId: "member-1",
              dailyLimit: 20,
              sendsToday: 0,
              disabled: false,
              updatedAt: "2026-04-08T00:00:00.000Z"
            }
          });
        }
        if (url.includes("/api/users/accounts")) return jsonResponse({ mailboxes: [] });
        return jsonResponse({});
      });

      render(<App />);
      expect(await screen.findByRole("heading", { name: /^API 密钥$/i })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /个人 API 凭证中心/i })).not.toBeInTheDocument();
      await waitFor(() => {
        expect(window.location.pathname).toBe("/settings");
      });
    },
    10000
  );

  it(
    "routes authenticated members into the redesigned api key workspace on /api-keys",
    async () => {
      window.history.pushState({}, "", "/api-keys");
      vi.restoreAllMocks();
      vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

        if (url.endsWith("/api/auth/session")) {
          return jsonResponse({
            user: {
              id: "member-1",
              email: "member@example.com",
              role: "member",
              createdAt: "2026-04-08T00:00:00.000Z"
            },
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: true
            }
          });
        }

        if (url.endsWith("/api/accounts")) return jsonResponse({ mailboxes: [] });
        if (url.endsWith("/api/api-keys")) return jsonResponse({ keys: [] });
        if (url.endsWith("/api/telegram/subscription")) return jsonResponse({ subscription: null });
        return jsonResponse({});
      });

      render(<App />);

      expect(await screen.findByRole("heading", { name: /^API 密钥$/i })).toBeInTheDocument();
      expect(screen.getByText("总密钥")).toBeInTheDocument();
      expect(screen.getByText("活跃密钥")).toBeInTheDocument();
      expect(screen.getByText("从未使用")).toBeInTheDocument();
      expect(screen.getByText("已吊销")).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /安全建议/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/如何选择这三种接入/i)).not.toBeInTheDocument();
    },
    10000
  );

  it(
    "routes authenticated members into the grouped API interface catalog",
    async () => {
      window.history.pushState({}, "", "/api-keys/interfaces");
      vi.restoreAllMocks();
      vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

        if (url.endsWith("/api/auth/session")) {
          return jsonResponse({
            user: {
              id: "member-1",
              email: "member@example.com",
              role: "member",
              createdAt: "2026-04-08T00:00:00.000Z"
            },
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: true
            }
          });
        }

        if (url.endsWith("/api/accounts")) return jsonResponse({ mailboxes: [] });
        if (url.endsWith("/api/api-keys")) return jsonResponse({ keys: [] });
        if (url.endsWith("/api/telegram/overview")) return jsonResponse({ overview: null });
        return jsonResponse({});
      });

      render(<App />);

      expect(await screen.findByRole("heading", { name: /^API 接口$/i })).toBeInTheDocument();
      expect(screen.getByRole("navigation", { name: "API 密钥 二级菜单" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "API 密钥" })).toHaveAttribute("aria-selected", "false");
      expect(screen.getByRole("tab", { name: "API 接口" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByLabelText("接口总数")).toHaveTextContent(String(apiInterfaceCount));
      expect(screen.getByRole("heading", { name: "邮件" })).toBeInTheDocument();
      expect(screen.getByLabelText("GET /api/mail/messages/:messageId/attachments/:attachmentId")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "用户管理" })).toBeInTheDocument();
      expect(screen.getByLabelText("PATCH /api/users/:userId/quota")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "API 密钥" })).toBeInTheDocument();
      expect(screen.getByLabelText("DELETE /api/api-keys/:id")).toBeInTheDocument();
      expect(screen.getByLabelText("POST /api/telegram/link-code")).toBeInTheDocument();
    },
    10000
  );

  it(
    "routes authenticated members into the account list workspace instead of the old placeholder",
    async () => {
      window.history.pushState({}, "", "/accounts/list");
      vi.restoreAllMocks();
      vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

        if (url.endsWith("/api/auth/session")) {
          return jsonResponse({
            user: {
              id: "member-1",
              email: "member@example.com",
              role: "member",
              createdAt: "2026-04-08T00:00:00.000Z"
            },
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: true
            }
          });
        }

        if (url.includes("/api/accounts/list?")) {
          return jsonResponse({
            accounts: [
              {
                id: "acct-1",
                address: "ops@example.com",
                label: "ops",
                status: "enabled",
                tags: [],
                createdBy: "member-1",
                createdByName: "Member",
                lastActiveAt: null,
                deletedAt: null,
                messageCount: 0,
                outboundCount: 0,
                createdAt: "2026-04-08T00:00:00.000Z"
              },
              {
                id: "acct-2",
                address: "growth@example.com",
                label: "growth",
                status: "disabled",
                tags: [],
                createdBy: "member-1",
                createdByName: "Member",
                lastActiveAt: null,
                deletedAt: null,
                messageCount: 0,
                outboundCount: 0,
                createdAt: "2026-04-09T00:00:00.000Z"
              },
              {
                id: "acct-3",
                address: "archive@example.com",
                label: "archive",
                status: "archived",
                tags: [],
                createdBy: "member-1",
                createdByName: "Member",
                lastActiveAt: null,
                deletedAt: null,
                messageCount: 0,
                outboundCount: 0,
                createdAt: "2026-04-10T00:00:00.000Z"
              }
            ],
            total: 3
          });
        }
        if (url.endsWith("/api/accounts")) return jsonResponse({ mailboxes: [] });
        if (url.endsWith("/api/api-keys")) return jsonResponse({ keys: [] });
        if (url.endsWith("/api/telegram/subscription")) return jsonResponse({ subscription: null });
        return jsonResponse({});
      });

      const { container } = render(<App />);

      expect(await screen.findByRole("columnheader", { name: "地址" })).toBeInTheDocument();
      expect(await screen.findByText("ops@example.com")).toBeInTheDocument();
      expect(screen.queryByText("账号列表先以占位页承接")).not.toBeInTheDocument();
      await waitFor(() => expect(container.querySelectorAll(".ui-badge")).toHaveLength(3));
      expect(container.querySelector(".accounts-list-bulk-bar")).toBeNull();
    },
    10000
  );

  it(
    "renders a single auth card and keeps login/register tabs synced with the URL",
    async () => {
      window.history.pushState({}, "", "/login");
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("not authenticated"));
      const { container } = render(<App />);

      expect(await screen.findByRole("tablist", { name: /认证方式切换/i })).toBeInTheDocument();
      expect(container.querySelectorAll(".auth-card")).toHaveLength(1);
      expect(screen.getByRole("tab", { name: /^登录$/i })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("button", { name: /^立即登录$/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("tab", { name: /^注册$/i }));

      await waitFor(() => {
        expect(window.location.pathname).toBe("/register");
      });
      expect(await screen.findByRole("button", { name: /^立即注册$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^立即注册$/i })).toHaveClass("ui-button", "ui-button-primary");
      expect(screen.getByLabelText(/邀请码/i)).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /^注册$/i })).toHaveAttribute("aria-selected", "true");
      expect(container.querySelectorAll(".auth-card")).toHaveLength(1);
    },
    10000
  );

  it(
    "uses the register tab as the default state for the register route",
    async () => {
      window.history.pushState({}, "", "/register");
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("not authenticated"));
      render(<App />);

      expect(await screen.findByLabelText(/WeMail auth brand/i)).toBeInTheDocument();
      expect(await screen.findByRole("tab", { name: /^注册$/i })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("button", { name: /^立即注册$/i })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /创建你的工作台账号/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/^邀请码注册$/i)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/邀请码/i)).toBeInTheDocument();
    },
    10000
  );

  it(
    "shows mailbox oversight inside the redesigned admin shell for admins",
    async () => {
      window.history.pushState({}, "", "/admin");
      vi.restoreAllMocks();
      vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

        if (url.endsWith("/api/auth/session")) {
          return jsonResponse({
            user: {
              id: "admin-1",
              email: "admin@example.com",
              role: "admin",
              createdAt: "2026-04-08T00:00:00.000Z"
            },
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: true
            }
          });
        }

        if (url.endsWith("/api/accounts")) return jsonResponse({ mailboxes: [] });
        if (url.endsWith("/api/api-keys")) return jsonResponse({ keys: [] });
        if (url.endsWith("/api/telegram/subscription")) return jsonResponse({ subscription: null });
        if (url.endsWith("/api/users")) {
          return jsonResponse({
            users: [
              {
                id: "admin-1",
                email: "admin@example.com",
                role: "admin",
                createdAt: "2026-04-08T00:00:00.000Z"
              }
            ]
          });
        }
        if (url.includes("/api/users/invites")) return jsonResponse({ invites: [] });
        if (url.endsWith("/api/system/features")) {
          return jsonResponse({
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: true
            }
          });
        }
        if (/\/api\/users\/[^/]+\/quota/.test(url)) {
          return jsonResponse({
            quota: {
              userId: "admin-1",
              dailyLimit: 20,
              sendsToday: 0,
              disabled: false,
              updatedAt: "2026-04-08T00:00:00.000Z"
            }
          });
        }
        if (url.includes("/api/users/accounts")) {
          return jsonResponse({
            mailboxes: [
              {
                id: "box-1",
                userId: "admin-1",
                address: "ops@example.com",
                label: "Ops",
                createdAt: "2026-04-08T00:00:00.000Z"
              }
            ]
          });
        }

        return jsonResponse({});
      });

      render(<App />);

      expect(await screen.findByRole("heading", { name: /邀请与入场/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /邮箱监管/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/工作台快速搜索/i)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/WeMail logo/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /切换到浅色主题|切换到深色主题/i })).toHaveClass("ui-button", "ui-button-icon");
      expect(screen.getByRole("button", { name: /用户菜单/i })).toHaveClass("ui-button", "ui-button-secondary");
      fireEvent.click(screen.getByRole("button", { name: /用户菜单/i }));
      expect(screen.getByRole("menuitem", { name: /退出登录/i })).toBeInTheDocument();
      expect(await screen.findByText(/ops@example.com/i)).toBeInTheDocument();
    },
    10000
  );

  it(
    "does not keep refetching session and admin data after admin login",
    async () => {
      window.history.pushState({}, "", "/admin");
      const calls = new Map<string, number>();
      vi.restoreAllMocks();
      vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
        calls.set(url, (calls.get(url) ?? 0) + 1);

        if (url.endsWith("/api/auth/session")) {
          return jsonResponse({
            user: {
              id: "admin-1",
              email: "admin@example.com",
              role: "admin",
              createdAt: "2026-04-08T00:00:00.000Z"
            },
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: true
            }
          });
        }

        if (url.endsWith("/api/accounts")) return jsonResponse({ mailboxes: [] });
        if (url.endsWith("/api/api-keys")) return jsonResponse({ keys: [] });
        if (url.endsWith("/api/telegram/subscription")) return jsonResponse({ subscription: null });
        if (url.endsWith("/api/users")) {
          return jsonResponse({
            users: [{ id: "admin-1", email: "admin@example.com", role: "admin", createdAt: "2026-04-08T00:00:00.000Z" }]
          });
        }
        if (url.includes("/api/users/invites")) return jsonResponse({ invites: [] });
        if (url.endsWith("/api/system/features")) {
          return jsonResponse({
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: true
            }
          });
        }
        if (/\/api\/users\/[^/]+\/quota/.test(url)) {
          return jsonResponse({
            quota: {
              userId: "admin-1",
              dailyLimit: 20,
              sendsToday: 0,
              disabled: false,
              updatedAt: "2026-04-08T00:00:00.000Z"
            }
          });
        }
        if (url.includes("/api/users/accounts")) return jsonResponse({ mailboxes: [] });
        return jsonResponse({});
      });

      render(<App />);
      expect(await screen.findByRole("heading", { name: /邀请与入场/i })).toBeInTheDocument();

      await waitFor(() => {
        expect(calls.get("http://127.0.0.1:8787/api/auth/session") ?? 0).toBe(1);
        expect(calls.get("http://127.0.0.1:8787/api/users") ?? 0).toBe(1);
      });
    },
    10000
  );
});
