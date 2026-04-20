import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../app/App";
import { jsonResponse } from "../helpers/mock-api";

describe("mail list integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.pushState({}, "", "/mail/list");
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
          mailboxes: [{ id: "box-1", address: "qa-signup@example.com", label: "QA Signup", createdAt: "2026-04-08T00:00:00.000Z" }]
        });
      }

      if (url.endsWith("/api/messages?mailboxId=box-1")) {
        return jsonResponse({
          messages: [
            {
              id: "msg-1",
              mailboxId: "box-1",
              fromAddress: "no-reply@acme.dev",
              subject: "Verify your email",
              previewText: "Use 482913 to finish sign in",
              bodyText: "Use 482913 to finish sign in",
              extraction: { method: "regex", type: "auth_code", value: "482913", label: "验证码" },
              oversizeStatus: null,
              attachmentCount: 0,
              attachments: [],
              receivedAt: "2026-04-08T00:00:00.000Z"
            },
            {
              id: "msg-2",
              mailboxId: "box-1",
              fromAddress: "auth@contoso.io",
              subject: "Your login link",
              previewText: "Open the login link",
              bodyText: "Open the login link",
              extraction: { method: "regex", type: "auth_link", value: "https://contoso.test/magic", label: "登录链接" },
              oversizeStatus: null,
              attachmentCount: 1,
              attachments: [
                { id: "att-1", filename: "device.txt", contentType: "text/plain", size: 1024, key: "attachments/device.txt" }
              ],
              receivedAt: "2026-04-08T00:01:00.000Z"
            },
            {
              id: "msg-3",
              mailboxId: "box-1",
              fromAddress: "team@demo.app",
              subject: "Welcome to Demo App",
              previewText: "No extraction available",
              bodyText: "No extraction available",
              extraction: { method: "none", type: "none", value: "", label: "未提取" },
              oversizeStatus: null,
              attachmentCount: 0,
              attachments: [],
              receivedAt: "2026-04-08T00:02:00.000Z"
            }
          ]
        });
      }

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

  it("renders the extraction-first mail workspace instead of the old four-panel inbox", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^QA Signup$/i })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /^复制验证码$/i })).toBeInTheDocument();
    expect(screen.getAllByText("482913").length).toBeGreaterThan(0);
    expect(await screen.findByText(/待提取/i)).toBeInTheDocument();
    expect(screen.getByText(/^当前消息$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^发送测试邮件$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^消息列表$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^消息详情$/i })).toBeInTheDocument();
    expect(screen.getByText(/^LOGIN LINK$/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^发送邮件$/i })).not.toBeInTheDocument();

    const mailboxPanel = screen.getByRole("heading", { name: /^邮箱$/i }).closest("section");
    expect(within(mailboxPanel as HTMLElement).getByText(/QA Signup/i)).toBeInTheDocument();
  });

  it("lets QA filter down to code-only messages without losing the extraction-first hierarchy", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByRole("button", { name: /^复制验证码$/i })).toBeInTheDocument();
    expect(screen.getByText(/^LOGIN LINK$/i)).toBeInTheDocument();
    expect(screen.getByText(/^未提取$/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^仅看验证码$/i }));

    expect(screen.getAllByText("482913").length).toBeGreaterThan(0);
    expect(screen.queryByText(/^LOGIN LINK$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^未提取$/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^复制验证码$/i })).toBeInTheDocument();
  });

  it("keeps outbound actions tucked behind a send-mail drawer until requested", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByRole("button", { name: /^发送测试邮件$/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /^发送测试邮件$/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^发送测试邮件$/i }));

    const dialog = await screen.findByRole("dialog", { name: /^发送测试邮件$/i });
    expect(within(dialog).getByLabelText(/收件人/i)).toHaveClass("form-control");
    expect(within(dialog).getByLabelText(/主题/i)).toHaveClass("form-control");
    expect(within(dialog).getByLabelText(/正文/i)).toHaveClass("form-control");
    expect(within(dialog).getByText(/首次外发后，记录会显示在这里/i)).toBeInTheDocument();
  });

  it("keeps the detail actions task-first for copying and inspecting the selected message", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true
    });

    render(<App />);

    expect(await screen.findByRole("button", { name: /^复制验证码$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^打开原始邮件$/i })).toHaveAttribute("href", "/api/messages/msg-1");
    expect(screen.getByRole("link", { name: /^查看提取 JSON$/i })).toHaveAttribute("href", "/api/messages/msg-1");

    await user.click(screen.getByRole("button", { name: /^复制验证码$/i }));

    expect(writeText).toHaveBeenCalledWith("482913");
  });
});
