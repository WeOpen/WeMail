import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../app/App";
import { jsonResponse } from "../helpers/mock-api";

describe("dashboard integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse({}));
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
  });

  it(
    "renders the admin dashboard with KPI cards and charts instead of the placeholder page",
    async () => {
      window.history.pushState({}, "", "/dashboard");
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
              mailboxCreationEnabled: false
            }
          });
        }

        if (url.endsWith("/api/accounts")) {
          return jsonResponse({
            mailboxes: [{ id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }]
          });
        }
        if (url.endsWith("/api/mail/messages?accountId=box-1")) return jsonResponse({ messages: [] });
        if (url.endsWith("/api/mail/outbound?accountId=box-1")) return jsonResponse({ messages: [] });
        if (url.endsWith("/api/api-keys")) return jsonResponse({ keys: [] });
        if (url.endsWith("/api/telegram/subscription")) return jsonResponse({ subscription: null });
        if (url.endsWith("/api/users")) {
          return jsonResponse({
            users: [
              { id: "admin-1", email: "admin@example.com", role: "admin", createdAt: "2026-04-08T00:00:00.000Z" },
              { id: "member-1", email: "member@example.com", role: "member", createdAt: "2026-04-10T00:00:00.000Z" }
            ]
          });
        }
        if (url.endsWith("/api/users/invites")) {
          return jsonResponse({
            invites: [{ id: "invite-1", code: "ALPHA-2026", createdAt: "2026-04-08T00:00:00.000Z", redeemedAt: null, disabledAt: null }]
          });
        }
        if (url.endsWith("/api/system/features")) {
          return jsonResponse({
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: false
            }
          });
        }
        if (/\/api\/users\/[^/]+\/quota/.test(url)) {
          return jsonResponse({
            quota: {
              userId: "admin-1",
              dailyLimit: 20,
              sendsToday: 8,
              disabled: false,
              updatedAt: "2026-04-08T00:00:00.000Z"
            }
          });
        }
        if (url.endsWith("/api/users/accounts")) {
          return jsonResponse({
            mailboxes: [
              { id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" },
              { id: "box-2", address: "growth@example.com", label: "Growth", createdAt: "2026-04-09T00:00:00.000Z" }
            ]
          });
        }

        return jsonResponse({});
      });

      render(<App />);

      expect(await screen.findByText("今日收件")).toBeInTheDocument();
      expect(screen.getByText("今日发件")).toBeInTheDocument();
      expect(screen.getByText("API 密钥数")).toBeInTheDocument();
      expect(screen.getByText("投递端点")).toBeInTheDocument();
      expect(screen.getByText("已发布公告")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "趋势" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "账号" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "角色" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "增长" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "资源" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "用户角色环形图" })).toBeInTheDocument();
      expect(within(screen.getByLabelText("趋势周期")).getByRole("tab", { name: "周" })).toHaveAttribute("aria-selected", "true");
      expect(within(screen.getByLabelText("增长周期")).getByRole("tab", { name: "周" })).toHaveAttribute("aria-selected", "true");
      expect(within(screen.getByLabelText("增长周期")).getByRole("tab", { name: "月" })).toBeInTheDocument();
      expect(screen.getByText("新增账号")).toBeInTheDocument();
      expect(screen.getByText("新增邮箱")).toBeInTheDocument();
      expect(screen.getByText("可用邀请码")).toBeInTheDocument();
      expect(screen.getByText("默认配额池")).toBeInTheDocument();
      expect(screen.queryByText("最近新增账号")).not.toBeInTheDocument();
      expect(screen.queryByText(/收件较昨日增长/i)).not.toBeInTheDocument();
      expect(screen.queryByText("测试邮箱")).not.toBeInTheDocument();
      expect(screen.queryByText("活跃邮箱")).not.toBeInTheDocument();
      expect(screen.queryByText("运营成员")).not.toBeInTheDocument();
      expect(screen.queryByText(/仪表盘先承担总览与导航入口/i)).not.toBeInTheDocument();
    },
    10000
  );

  it("hides the dashboard role card from members", async () => {
    window.history.pushState({}, "", "/dashboard");
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

      if (url.endsWith("/api/auth/session")) {
        return jsonResponse({
          user: {
            id: "member-1",
            email: "member@example.com",
            role: "member",
            createdAt: "2026-04-10T00:00:00.000Z"
          },
          featureToggles: {
            aiEnabled: true,
            telegramEnabled: true,
            outboundEnabled: true,
            mailboxCreationEnabled: true
          }
        });
      }

      if (url.endsWith("/api/accounts")) {
        return jsonResponse({
          mailboxes: [{ id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }]
        });
      }
      if (url.endsWith("/api/mail/messages?accountId=box-1")) return jsonResponse({ messages: [] });
      if (url.endsWith("/api/mail/outbound?accountId=box-1")) return jsonResponse({ messages: [] });
      if (url.endsWith("/api/api-keys")) return jsonResponse({ keys: [] });
      if (url.endsWith("/api/telegram/subscription")) return jsonResponse({ subscription: null });

      return jsonResponse({});
    });

    render(<App />);

    expect(await screen.findByRole("heading", { name: "趋势" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "账号" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "资源" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "增长" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "角色" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "用户角色环形图" })).not.toBeInTheDocument();
  }, 10000);
});
