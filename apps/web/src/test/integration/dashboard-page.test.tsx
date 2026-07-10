import { readFileSync } from "node:fs";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../app/App";
import { jsonResponse } from "../helpers/mock-api";

const sharedStyles = readFileSync("src/shared/styles/index.css", "utf8");

function getStyleRule(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = sharedStyles.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`));
  return match?.[1] ?? "";
}

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

  it("keeps chart tooltips visible above chart and neighboring card boundaries", () => {
    expect(getStyleRule(".dashboard-panel")).toContain("overflow: visible");
    expect(getStyleRule(".dashboard-panel:hover")).toContain("z-index: 3");
    expect(getStyleRule(".dashboard-trend-panel")).toContain("overflow: visible");
    expect(getStyleRule(".dashboard-trend-chart")).toContain("overflow: visible");
  });

  it(
    "renders the admin dashboard from the dashboard API",
    async () => {
      window.history.pushState({}, "", "/dashboard");
      const dashboardPayload = {
        kpis: [
          { kicker: "接口收件", label: "实时收件", value: "3", detail: "来自后端消息表", change: "较昨日 +3" },
          { kicker: "接口发件", label: "实时发件", value: "2", detail: "平均成功率 50%", change: "失败重试 1 次" },
          { kicker: "接口密钥", label: "活跃密钥", value: "1", detail: "1 个正在使用", change: "0 个待轮换" },
          { kicker: "接口 Webhook", label: "投递端点", value: "1", detail: "1 个正常投递", change: "失败重试 1 次" },
          { kicker: "接口公告", label: "已发布公告", value: "1", detail: "1 条正在展示", change: "本周发布 1 条" }
        ],
        trend: {
          week: [{ day: "今天", inbound: 3, outbound: 2 }],
          month: [{ day: "本月", inbound: 3, outbound: 2 }],
          year: [{ day: "今年", inbound: 3, outbound: 2 }]
        },
        accountDistribution: [
          { label: "活跃账号", value: 67, tone: "#111827" },
          { label: "暂停账号", value: 33, tone: "#ff7a00" }
        ],
        accountTotal: 3,
        resources: [
          { label: "接口邀请码", value: "4 个", detail: "本周新建 2 个", progress: 80, tone: "#111827" },
          { label: "接口配额池", value: "20 / 天", detail: "当前已用 8", progress: 40, tone: "#ff7a00" }
        ],
        growth: {
          week: [{ label: "今天", accounts: 1, mailboxes: 2 }],
          month: [{ label: "本月", accounts: 1, mailboxes: 2 }],
          year: [{ label: "今年", accounts: 1, mailboxes: 2 }]
        },
        userRoles: [
          { label: "管理员", value: 50, tone: "#111827" },
          { label: "成员", value: 50, tone: "#ff7a00" }
        ],
        userTotal: 2
      };
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
        if (url.endsWith("/api/dashboard")) return jsonResponse(dashboardPayload);

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
        if (url.includes("/api/users/invites")) {
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
        if (url.includes("/api/users/accounts")) {
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

      expect(await screen.findByText("接口收件")).toBeInTheDocument();
      expect(screen.getByText("接口发件")).toBeInTheDocument();
      expect(screen.getByText("接口密钥")).toBeInTheDocument();
      expect(screen.getByText("接口 Webhook")).toBeInTheDocument();
      expect(screen.getByText("接口公告")).toBeInTheDocument();
      expect(screen.getByText("来自后端消息表")).toBeInTheDocument();
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
      expect(screen.getByText("接口邀请码")).toBeInTheDocument();
      expect(screen.getByText("接口配额池")).toBeInTheDocument();
      expect(screen.queryByText("今日收件")).not.toBeInTheDocument();
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
      if (url.endsWith("/api/dashboard")) {
        return jsonResponse({
          kpis: [
            { kicker: "接口收件", label: "实时收件", value: "0", detail: "暂无收件", change: "较昨日 0" },
            { kicker: "接口发件", label: "实时发件", value: "0", detail: "暂无发件", change: "失败重试 0 次" },
            { kicker: "接口密钥", label: "活跃密钥", value: "0", detail: "0 个正在使用", change: "0 个待轮换" },
            { kicker: "接口 Webhook", label: "投递端点", value: "0", detail: "0 个正常投递", change: "失败重试 0 次" },
            { kicker: "接口公告", label: "已发布公告", value: "0", detail: "0 条正在展示", change: "本周发布 0 条" }
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

    const { container } = render(<App />);

    expect(await screen.findByRole("heading", { name: "趋势" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "账号" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "资源" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "增长" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "角色" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "用户角色环形图" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "收发趋势图" }).querySelector("svg")).toBeNull();
    expect(screen.getByRole("img", { name: "账号结构环形图" }).querySelector("svg")).toBeNull();
    expect(screen.getByRole("img", { name: "账号和邮箱增长图" }).querySelector("svg")).toBeNull();
    expect(container.querySelector('path[d="null"]')).toBeNull();
  }, 10000);
});
