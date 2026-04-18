import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../app/App";
import { jsonResponse } from "../helpers/mock-api";

describe("outbound page integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.pushState({}, "", "/mail/unassigned");
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

      if (url.endsWith("/auth/session")) {
        return jsonResponse({
          user: { id: "member-1", email: "member@example.com", role: "member", createdAt: "2026-04-08T00:00:00.000Z" },
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

  it("redirects legacy unassigned-mail deep links into the outbound exceptions shell", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^发件箱入口已占位$/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/mail/outbound");
    expect(window.location.search).toBe("?view=exceptions");

    const mailSecondaryNav = screen.getByRole("navigation", { name: /邮件 二级菜单/i });
    expect(within(mailSecondaryNav).getByRole("link", { name: "邮件列表" })).toBeInTheDocument();
    expect(within(mailSecondaryNav).getByRole("link", { name: "发件箱" })).toHaveAttribute(
      "href",
      "/mail/outbound"
    );
    expect(within(mailSecondaryNav).getByRole("link", { name: "邮件设置" })).toBeInTheDocument();
    expect(within(mailSecondaryNav).queryByRole("link", { name: "无收件人邮件" })).not.toBeInTheDocument();

    expect(screen.getAllByText(/异常 \/ 无匹配视图/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/无收件人邮件页面已占位/i)).not.toBeInTheDocument();
  });
});
