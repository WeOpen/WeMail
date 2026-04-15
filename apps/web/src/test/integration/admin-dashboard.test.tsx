import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../app/App";
import { jsonResponse } from "../helpers/mock-api";

describe("admin dashboard integration", () => {
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
    "renders the control workspace and surfaces the users secondary navigation",
    async () => {
      window.history.pushState({}, "", "/admin");
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
              { id: "admin-1", email: "admin@example.com", role: "admin", createdAt: "2026-04-08T00:00:00.000Z" },
              { id: "member-1", email: "member@example.com", role: "member", createdAt: "2026-04-10T00:00:00.000Z" }
            ]
          });
        }
        if (url.endsWith("/admin/invites")) {
          return jsonResponse({
            invites: [
              { id: "invite-1", code: "ALPHA-2026", createdAt: "2026-04-08T00:00:00.000Z", redeemedAt: null, disabledAt: null }
            ]
          });
        }
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
              { id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }
            ]
          });
        }
        return jsonResponse({});
      });

      render(<App />);

      const sidebar = await screen.findByRole("navigation", { name: /工作台导航/i });
      expect(sidebar).toBeInTheDocument();
      expect(within(sidebar).getByRole("link", { name: /^用户(?:\s|$)/i })).toBeInTheDocument();
      expect(await screen.findByRole("navigation", { name: /用户 二级菜单/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /访问、配额与系统开关/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /邀请码控制/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /配额控制/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /邮箱总览/i })).toBeInTheDocument();
      expect(await screen.findByText(/ops@example.com/i)).toBeInTheDocument();

      fireEvent.click(await screen.findByRole("button", { name: /member@example.com.*成员/i }));
      expect(await screen.findByDisplayValue("20")).toBeInTheDocument();
    },
    10000
  );
});
