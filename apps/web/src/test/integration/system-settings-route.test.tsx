import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../app/App";
import { jsonResponse } from "../helpers/mock-api";

describe("system settings route integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.pushState({}, "", "/system/settings");
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
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
  });

  it("renders the renamed system settings page on /system/settings", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^系统设置$/i })).toBeInTheDocument();
    expect(screen.getByText("主题模式")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^外观设置$/i })).not.toBeInTheDocument();
  });
});
