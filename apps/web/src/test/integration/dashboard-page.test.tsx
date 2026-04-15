import { cleanup, render, screen } from "@testing-library/react";
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
              mailboxCreationEnabled: false
            }
          });
        }

        if (url.endsWith("/api/mailboxes")) {
          return jsonResponse({
            mailboxes: [{ id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }]
          });
        }
        if (url.endsWith("/api/messages?mailboxId=box-1")) return jsonResponse({ messages: [] });
        if (url.endsWith("/api/outbound?mailboxId=box-1")) return jsonResponse({ messages: [] });
        if (url.endsWith("/api/keys")) return jsonResponse({ keys: [] });
        if (url.endsWith("/api/telegram")) return jsonResponse({ subscription: null });
        if (url.endsWith("/admin/users")) {
          return jsonResponse({
            users: [
              { id: "admin-1", email: "admin@example.com", role: "admin", createdAt: "2026-04-08T00:00:00.000Z" },
              { id: "member-1", email: "member@example.com", role: "member", createdAt: "2026-04-10T00:00:00.000Z" }
            ]
          });
        }
        if (url.endsWith("/admin/invites")) {
          return jsonResponse({
            invites: [{ id: "invite-1", code: "ALPHA-2026", createdAt: "2026-04-08T00:00:00.000Z", redeemedAt: null, disabledAt: null }]
          });
        }
        if (url.endsWith("/admin/features")) {
          return jsonResponse({
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: false
            }
          });
        }
        if (url.includes("/admin/quotas/")) {
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
        if (url.endsWith("/admin/mailboxes")) {
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

      expect(await screen.findByRole("heading", { name: /今日收件/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /平台用户/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /近 7 天收发趋势/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /邮箱状态分布/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /重点资源概览/i })).toBeInTheDocument();
      expect(screen.queryByText(/仪表盘先承担总览与导航入口/i)).not.toBeInTheDocument();
    },
    10000
  );
});
