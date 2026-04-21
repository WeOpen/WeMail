import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../app/App";
import { WORKSPACE_THEME_STORAGE_KEY } from "../app/appStore";
import { jsonResponse } from "./helpers/mock-api";

const originalMatchMedia = window.matchMedia;

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
      expect(screen.getByRole("heading", { name: /把临时邮箱/i })).toBeInTheDocument();
      expect(within(navigation).getByRole("link", { name: /登录/i })).toHaveClass("ui-button", "ui-button-secondary");
      expect(within(navigation).getByRole("link", { name: /注册/i })).toHaveClass("ui-button", "ui-button-primary");
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
      const emailInput = screen.getByLabelText(/邮箱/i);
      const passwordInput = screen.getByLabelText(/密码/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput.closest(".form-control-shell")?.querySelector(".form-control-icon")).not.toBeNull();
      expect(passwordInput).toHaveAttribute("type", "password");

      const toggle = screen.getByRole("button", { name: "显示密码" });
      expect(toggle).toBeInTheDocument();

      fireEvent.click(toggle);
      expect(screen.getByLabelText(/密码/i)).toHaveAttribute("type", "text");
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
      expect(within(dialog).getByRole("link", { name: /^方案价格$/i })).toHaveAttribute("href", "#pricing");
      expect(within(dialog).getByRole("link", { name: /登录/i })).toBeInTheDocument();
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

        if (url.endsWith("/auth/session")) {
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

        if (url.endsWith("/api/mailboxes")) return jsonResponse({ mailboxes: [] });
        if (url.endsWith("/api/keys")) return jsonResponse({ keys: [] });
        if (url.endsWith("/api/telegram")) return jsonResponse({ subscription: null });
        if (url.endsWith("/admin/users")) return jsonResponse({ users: [] });
        if (url.endsWith("/admin/invites")) return jsonResponse({ invites: [] });
        if (url.endsWith("/admin/features")) {
          return jsonResponse({
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: true
            }
          });
        }
        if (url.includes("/admin/quotas/")) {
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
        if (url.endsWith("/admin/mailboxes")) return jsonResponse({ mailboxes: [] });
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

        if (url.endsWith("/auth/session")) {
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

        if (url.endsWith("/api/mailboxes")) return jsonResponse({ mailboxes: [] });
        if (url.endsWith("/api/keys")) return jsonResponse({ keys: [] });
        if (url.endsWith("/api/telegram")) return jsonResponse({ subscription: null });
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
    "routes authenticated members into the account list workspace instead of the old placeholder",
    async () => {
      window.history.pushState({}, "", "/accounts/list");
      vi.restoreAllMocks();
      vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

        if (url.endsWith("/auth/session")) {
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

        if (url.endsWith("/api/mailboxes")) return jsonResponse({ mailboxes: [] });
        if (url.endsWith("/api/keys")) return jsonResponse({ keys: [] });
        if (url.endsWith("/api/telegram")) return jsonResponse({ subscription: null });
        return jsonResponse({});
      });

      const { container } = render(<App />);

      expect(await screen.findByRole("columnheader", { name: "地址" })).toBeInTheDocument();
      expect(screen.queryByText("账号列表先以占位页承接")).not.toBeInTheDocument();
      expect(container.querySelectorAll(".accounts-status-pill")).toHaveLength(3);
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

        if (url.endsWith("/auth/session")) {
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

        if (url.endsWith("/api/mailboxes")) return jsonResponse({ mailboxes: [] });
        if (url.endsWith("/api/keys")) return jsonResponse({ keys: [] });
        if (url.endsWith("/api/telegram")) return jsonResponse({ subscription: null });
        if (url.endsWith("/admin/users")) {
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
        if (url.endsWith("/admin/invites")) return jsonResponse({ invites: [] });
        if (url.endsWith("/admin/features")) {
          return jsonResponse({
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: true
            }
          });
        }
        if (url.includes("/admin/quotas/")) {
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
        if (url.endsWith("/admin/mailboxes")) {
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

      expect(await screen.findByRole("heading", { name: /邀请码控制/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /邮箱总览/i })).toBeInTheDocument();
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

        if (url.endsWith("/auth/session")) {
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

        if (url.endsWith("/api/mailboxes")) return jsonResponse({ mailboxes: [] });
        if (url.endsWith("/api/keys")) return jsonResponse({ keys: [] });
        if (url.endsWith("/api/telegram")) return jsonResponse({ subscription: null });
        if (url.endsWith("/admin/users")) {
          return jsonResponse({
            users: [{ id: "admin-1", email: "admin@example.com", role: "admin", createdAt: "2026-04-08T00:00:00.000Z" }]
          });
        }
        if (url.endsWith("/admin/invites")) return jsonResponse({ invites: [] });
        if (url.endsWith("/admin/features")) {
          return jsonResponse({
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: true
            }
          });
        }
        if (url.includes("/admin/quotas/")) {
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
        if (url.endsWith("/admin/mailboxes")) return jsonResponse({ mailboxes: [] });
        return jsonResponse({});
      });

      render(<App />);
      expect(await screen.findByRole("heading", { name: /邀请码控制/i })).toBeInTheDocument();

      await waitFor(() => {
        expect(calls.get("http://127.0.0.1:8787/auth/session") ?? 0).toBe(1);
        expect(calls.get("http://127.0.0.1:8787/admin/users") ?? 0).toBe(1);
      });
    },
    10000
  );
});
