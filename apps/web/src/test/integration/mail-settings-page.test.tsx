import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    if (url.endsWith("/api/outbound?mailboxId=box-1")) return jsonResponse({ messages: [] });
    if (url.endsWith("/api/keys")) return jsonResponse({ keys: [] });
    if (url.endsWith("/api/telegram")) return jsonResponse({ subscription: { chatId: "123456", enabled: true } });
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

describe("mail settings integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.pushState({}, "", "/mail/settings");
    mockMailShell();
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
  });

  it("renders the rule-centric mail settings center instead of the placeholder cards", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^邮件设置$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^发件规则$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^通知与路由$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^工作台行为偏好$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^当前策略摘要$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^默认发件身份$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Webhook 通知$/i)).toBeInTheDocument();
    expect(screen.queryByText(/邮件设置先做占位/i)).not.toBeInTheDocument();
  });

  it("keeps a lightweight summary rail in sync with locally saved sender and routing rules", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^邮件设置$/i })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/^默认发件身份$/i), "WeMail Support <support@example.com>");
    await user.click(screen.getByRole("button", { name: /^保存发件规则$/i }));
    expect(screen.getByText(/发件规则已保存/i)).toBeInTheDocument();

    const summary = screen.getByRole("complementary", { name: /当前策略摘要/i });
    expect(within(summary).getByText(/WeMail Support <support@example.com>/i)).toBeInTheDocument();

    await user.click(screen.getByLabelText(/^失败告警$/i));
    await user.click(screen.getByRole("button", { name: /^保存通知与路由$/i }));
    expect(screen.getByText(/通知与路由已保存/i)).toBeInTheDocument();
    expect(within(summary).getByText(/^关闭$/i)).toBeInTheDocument();
  });
});
