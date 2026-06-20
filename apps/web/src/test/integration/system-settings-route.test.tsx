import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../app/App";
import { jsonResponse } from "../helpers/mock-api";

describe("system settings route integration", () => {
  let sessionRole: "admin" | "member";

  beforeEach(() => {
    sessionRole = "member";
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.pushState({}, "", "/system/settings");
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

      if (url.endsWith("/api/auth/session")) {
        return jsonResponse({
          user: {
            id: "member-1",
            email: "member@example.com",
            role: sessionRole,
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
      if (url.endsWith("/api/telegram/overview")) return jsonResponse({ overview: null });
      if (url.endsWith("/api/telegram/deliveries")) return jsonResponse({ deliveries: [] });
      if (url.endsWith("/api/dictionaries")) return jsonResponse({ dictionaries: [] });
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
      if (url.endsWith("/api/system/domains")) {
        return jsonResponse({
          domains: [{ domain: "example.com", allowedRoles: [] }],
          primaryDomain: "example.com"
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
      if (url.endsWith("/api/system/runtime-settings")) {
        return jsonResponse({
          settings: {
            mailbox: { limit: 5 },
            message: { retentionDays: 7 },
            outbound: { dailyLimit: 20 },
            api: { dailyLimit: 20000 },
            attachments: { maxBytes: 10485760, maxTotalBytes: 15728640 },
            ai: { fallbackLimit: 20 },
            lastUpdatedLabel: "2026-04-08T00:00:00.000Z"
          }
        });
      }

      return jsonResponse({});
    });
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
  });

  it("renders the redesigned system settings page on /system/settings", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^系统控制台$/i })).toBeInTheDocument();
    expect(screen.getByLabelText("系统设置概览")).toBeInTheDocument();
    expect(screen.getByLabelText("系统设置主设置")).toBeInTheDocument();
    expect(screen.getByLabelText("系统设置状态侧栏")).toBeInTheDocument();
    expect(screen.getByText("主题模式")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^外观设置$/i })).not.toBeInTheDocument();
  });

  it("shows runtime settings controls to administrators", async () => {
    sessionRole = "admin";

    render(<App />);

    expect(await screen.findByRole("heading", { name: /^系统控制台$/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /^业务默认值$/i })).toBeInTheDocument();
    expect(await screen.findAllByText("20 / 天")).toHaveLength(2);
    expect(screen.getByLabelText("运行策略概览")).toBeInTheDocument();
  });
});
