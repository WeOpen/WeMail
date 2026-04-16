import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../app/App";
import { AnnouncementsPage } from "../../pages/AnnouncementsPage";
import { jsonResponse } from "../helpers/mock-api";

describe("announcements integration", () => {
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
    "renders the announcements board for members without the publish button",
    async () => {
      window.history.pushState({}, "", "/announcements");
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

        if (url.endsWith("/api/mailboxes")) {
          return jsonResponse({
            mailboxes: [{ id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }]
          });
        }
        if (url.endsWith("/api/messages?mailboxId=box-1")) return jsonResponse({ messages: [] });
        if (url.endsWith("/api/outbound?mailboxId=box-1")) return jsonResponse({ messages: [] });
        if (url.endsWith("/api/keys")) return jsonResponse({ keys: [] });
        if (url.endsWith("/api/telegram")) return jsonResponse({ subscription: null });
        if (url.includes("/admin/users")) {
          return jsonResponse({
            users: [{ id: "admin-1", email: "admin@example.com", role: "admin", createdAt: "2026-04-08T00:00:00.000Z" }]
          });
        }
        if (url.includes("/admin/invites")) return jsonResponse({ invites: [] });
        if (url.includes("/admin/features")) {
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
        if (url.includes("/admin/mailboxes")) return jsonResponse({ mailboxes: [] });

        return jsonResponse({});
      });

      render(<App />);

      expect(await screen.findByRole("searchbox", { name: /公告搜索/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /发布公告/i })).not.toBeInTheDocument();
      expect(screen.getByLabelText(/最近公告筛选/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/公告控制条/i)).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /^进行中$/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /^即将开始$/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /^本周已结束$/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /^已归档$/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /4 月核心平台升级将于本周六凌晨执行/i })).toBeInTheDocument();
      expect(screen.getByText(/^最近公告$/i)).toBeInTheDocument();
      expect(screen.getByText(/^概览$/i)).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /公告状态分布/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/当前对成员可见|24h 内计划公告|待归档复盘|历史公告沉淀/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^时间线$/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /状态概览/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /近期维护窗口/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/公告页面已预留/i)).not.toBeInTheDocument();
    },
    10000
  );

  it(
    "shows the publish announcement button for admins",
    async () => {
      render(<AnnouncementsPage canPublish />);

      expect(await screen.findByRole("button", { name: /发布公告/i })).toBeInTheDocument();
    },
    10000
  );
});
