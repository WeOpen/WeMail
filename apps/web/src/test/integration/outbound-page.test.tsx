import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../app/App";
import { jsonResponse } from "../helpers/mock-api";

function mockMailShell() {
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
    if (url.endsWith("/api/outbound?mailboxId=box-1")) {
      return jsonResponse({
        messages: [
          {
            id: "out-1",
            mailboxId: "box-1",
            toAddress: "user@example.com",
            subject: "Welcome",
            status: "sent",
            errorText: null,
            createdAt: "2026-04-08T00:00:00.000Z"
          },
          {
            id: "out-2",
            mailboxId: "box-1",
            toAddress: "retry@example.com",
            subject: "Retry verification",
            status: "failed",
            errorText: "SMTP timeout",
            createdAt: "2026-04-08T00:05:00.000Z"
          }
        ]
      });
    }

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
}

describe("outbound page integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    mockMailShell();
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
  });

  it("redirects /mail/unassigned into the outbound exceptions view", async () => {
    window.history.pushState({}, "", "/mail/unassigned");
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^发件箱$/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/mail/outbound");
    });
    expect(window.location.search).toContain("view=exceptions");
    expect(screen.getByRole("button", { name: /^异常 \/ 无匹配$/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("renders a send-history-first outbound workspace with a detail pane", async () => {
    window.history.pushState({}, "", "/mail/outbound");
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^发件箱$/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/搜索收件人 \/ 主题 \/ 发件结果/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^全部$/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^已发送$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^失败$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^异常 \/ 无匹配$/i })).toBeInTheDocument();
    expect(await within(screen.getByRole("region", { name: /发件记录列表/i })).findByText(/user@example.com/i)).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: /发件记录详情/i })).getByRole("heading", { name: /Welcome/i })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: /发件记录详情/i })).getByText(/已发送到收件人。/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^新建发送$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^重发$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^复制 payload$/i })).toBeInTheDocument();
    expect(screen.queryByText(/发件箱入口已占位/i)).not.toBeInTheDocument();
  });

  it("keeps exception records in the same list system as send history", async () => {
    window.history.pushState({}, "", "/mail/outbound?view=exceptions");
    render(<App />);

    expect(await screen.findByRole("button", { name: /^异常 \/ 无匹配$/i })).toHaveAttribute("aria-pressed", "true");

    const list = screen.getByRole("region", { name: /发件记录列表/i });
    expect(within(list).getByText(/unknown\+signup@example.com/i)).toBeInTheDocument();
    expect(within(list).queryByText(/user@example.com/i)).not.toBeInTheDocument();

    const detail = screen.getByRole("region", { name: /发件记录详情/i });
    expect(within(detail).getByText(/未匹配到邮箱或路由策略/i)).toBeInTheDocument();
  });
});
