import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultMailSettings, type MailSettings } from "@wemail/shared";

import { App } from "../../app/App";
import { jsonResponse } from "../helpers/mock-api";

function mockMailShell(options?: { outboundDefaultFilter?: string; openLatestFailureFirst?: boolean }) {
  const mailSettings: MailSettings = {
    ...defaultMailSettings,
    workspaceDefaults: {
      ...defaultMailSettings.workspaceDefaults,
      outboundDefaultFilter: options?.outboundDefaultFilter ?? defaultMailSettings.workspaceDefaults.outboundDefaultFilter,
      openLatestFailureFirst: options?.openLatestFailureFirst ?? defaultMailSettings.workspaceDefaults.openLatestFailureFirst
    }
  };
  const opsOutboundMessages = [
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
    },
    {
      id: "out-3",
      mailboxId: "box-1",
      toAddress: "batch-1@example.com",
      subject: "Batch notice 1",
      status: "sent",
      errorText: null,
      createdAt: "2026-04-08T00:06:00.000Z"
    },
    {
      id: "out-4",
      mailboxId: "box-1",
      toAddress: "batch-2@example.com",
      subject: "Batch notice 2",
      status: "sent",
      errorText: null,
      createdAt: "2026-04-08T00:07:00.000Z"
    },
    {
      id: "out-5",
      mailboxId: "box-1",
      toAddress: "batch-3@example.com",
      subject: "Batch notice 3",
      status: "sent",
      errorText: null,
      createdAt: "2026-04-08T00:08:00.000Z"
    },
    {
      id: "out-6",
      mailboxId: "box-1",
      toAddress: "batch-4@example.com",
      subject: "Batch notice 4",
      status: "sent",
      errorText: null,
      createdAt: "2026-04-08T00:09:00.000Z"
    },
    {
      id: "out-7",
      mailboxId: "box-1",
      toAddress: "batch-5@example.com",
      subject: "Batch notice 5",
      status: "sent",
      errorText: null,
      createdAt: "2026-04-08T00:11:00.000Z"
    },
    {
      id: "out-8",
      mailboxId: "box-1",
      toAddress: "batch-6@example.com",
      subject: "Batch notice 6",
      status: "sent",
      errorText: null,
      createdAt: "2026-04-08T00:12:00.000Z"
    }
  ];
  const qaOutboundMessages = [
    {
      id: "qa-out-1",
      mailboxId: "box-2",
      toAddress: "qa-recipient@example.com",
      subject: "QA smoke result",
      status: "sent",
      errorText: null,
      createdAt: "2026-04-08T00:18:00.000Z"
    }
  ];
  const sendRequests: Array<{ mailboxId: string; toAddress: string; subject: string; bodyText: string }> = [];
  const outboundQueries: string[] = [];
  const outboundMessagesById = new Map([...opsOutboundMessages, ...qaOutboundMessages].map((message) => [message.id, message]));

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
    const parsedUrl = new URL(url, "http://localhost");
    const requestBody =
      input instanceof Request ? await input.clone().text() : typeof init?.body === "string" ? init.body : "";

    if (url.endsWith("/api/auth/session")) {
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

    if (url.endsWith("/api/accounts")) {
      return jsonResponse({
        mailboxes: [
          { id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" },
          { id: "box-2", address: "qa@example.com", label: "QA", createdAt: "2026-04-08T00:15:00.000Z" }
        ]
      });
    }

    if (url.endsWith("/api/mail/messages?accountId=box-1")) return jsonResponse({ messages: [] });
    if (url.endsWith("/api/mail/messages?accountId=box-2")) return jsonResponse({ messages: [] });
    const outboundDetailMatch = parsedUrl.pathname.match(/^\/api\/mail\/outbound\/([^/]+)$/);
    if (outboundDetailMatch) {
      const message = outboundMessagesById.get(decodeURIComponent(outboundDetailMatch[1]));
      return jsonResponse({
        message: message
          ? {
              ...message,
              bodyText: `${message.subject} body`,
              fromAddress: message.mailboxId === "box-2" ? "qa@example.com" : "ops@example.com",
              providerMessageId: message.status === "sent" ? `provider-${message.id}` : null,
              requestPayloadJson: JSON.stringify({
                from: message.mailboxId === "box-2" ? "qa@example.com" : "ops@example.com",
                to: message.toAddress,
                subject: message.subject,
                text: `${message.subject} body`
              }),
              responsePayloadJson: message.status === "sent" ? JSON.stringify({ id: `provider-${message.id}` }) : JSON.stringify({ error: message.errorText })
            }
          : null
      });
    }

    if (parsedUrl.pathname === "/api/mail/outbound") {
      outboundQueries.push(parsedUrl.searchParams.toString());
      const mailboxId = parsedUrl.searchParams.get("accountId");
      const status = parsedUrl.searchParams.get("status") ?? "all";
      const search = (parsedUrl.searchParams.get("search") ?? "").toLowerCase();
      const page = Number(parsedUrl.searchParams.get("page") ?? "1");
      const pageSize = Number(parsedUrl.searchParams.get("pageSize") ?? String(Number.MAX_SAFE_INTEGER));
      const sourceMessages = mailboxId === "box-2" ? qaOutboundMessages : opsOutboundMessages;
      const searchedMessages = sourceMessages.filter((message) => {
        if (!search) return true;
        return [message.toAddress, message.subject, message.status, message.errorText ?? ""].join(" ").toLowerCase().includes(search);
      });
      const filteredMessages = searchedMessages.filter((message) => status === "all" || message.status === status);
      const startIndex = (page - 1) * pageSize;

      return jsonResponse({
        messages: filteredMessages.slice(startIndex, startIndex + pageSize),
        page,
        pageSize,
        total: filteredMessages.length,
        summary: {
          totalCount: searchedMessages.length,
          sentCount: searchedMessages.filter((message) => message.status === "sent").length,
          failedCount: searchedMessages.filter((message) => message.status === "failed").length
        }
      });
    }
    if (url.endsWith("/api/mail/send")) {
      const body = JSON.parse(requestBody || "{}") as {
        mailboxId: string;
        toAddress: string;
        subject: string;
        bodyText: string;
      };
      sendRequests.push(body);
      const message = {
        id: `out-${opsOutboundMessages.length + 1}`,
        mailboxId: body.mailboxId,
        toAddress: body.toAddress,
        subject: body.subject,
        status: "sent",
        errorText: null,
        createdAt: "2026-04-08T00:10:00.000Z"
      };
      opsOutboundMessages.unshift(message);
      outboundMessagesById.set(message.id, message);
      return jsonResponse({ ok: true });
    }

    if (url.endsWith("/api/mail/settings")) return jsonResponse({ settings: mailSettings });
    if (url.endsWith("/api/api-keys")) return jsonResponse({ keys: [] });
    if (url.endsWith("/api/telegram/subscription")) return jsonResponse({ subscription: null });
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

    return jsonResponse({});
  });

  return { outboundQueries, sendRequests };
}

describe("outbound page integration", () => {
  let outboundQueries: string[];
  let sendRequests: Array<{ mailboxId: string; toAddress: string; subject: string; bodyText: string }>;

  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    ({ outboundQueries, sendRequests } = mockMailShell());
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
  });

  it("redirects /mail/unassigned into the failed outbound view", async () => {
    window.history.pushState({}, "", "/mail/unassigned");
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^发件箱$/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/mail/outbound");
    });
    expect(window.location.search).toContain("view=failed");
    expect(screen.getByRole("tab", { name: /^失败$/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByText(/unknown\+signup@example.com/i)).not.toBeInTheDocument();
    expect(await within(screen.getByRole("region", { name: /发件记录列表/i })).findByText(/retry@example.com/i)).toBeInTheDocument();
  });

  it("renders a send-history-first outbound workspace with a detail pane", async () => {
    window.history.pushState({}, "", "/mail/outbound");
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^发件箱$/i })).toBeInTheDocument();
    const toolbar = document.querySelector(".outbound-toolbar-card");
    expect(toolbar).toBeInstanceOf(HTMLElement);
    expect(within(toolbar as HTMLElement).getByText(/^邮件中心$/i)).toBeInTheDocument();
    expect(screen.queryByText(/查看真实发送记录、失败原因和补发动作。/i)).not.toBeInTheDocument();
    expect(within(toolbar as HTMLElement).queryByText(/^发件身份$/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/搜索收件人 \/ 主题 \/ 发件结果/i)).toBeInTheDocument();
    expect(screen.getByText(/^发送总量$/i)).toBeInTheDocument();
    expect(screen.getByText(/^发送成功$/i)).toBeInTheDocument();
    expect(screen.getByText(/^发送失败$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^异常记录$/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /切换发件身份.*Ops.*ops@example.com/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^全部$/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /^已发送$/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^失败$/i })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^异常 \/ 无匹配$/i })).not.toBeInTheDocument();
    expect(await within(screen.getByRole("region", { name: /发件记录列表/i })).findByText(/user@example.com/i)).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: /发件记录详情/i })).getByRole("heading", { name: /Welcome/i })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: /发件记录详情/i })).getByText(/已发送到收件人。/i)).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /^发件记录分页$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^新建发送$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^重发$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^复制 payload$/i })).toBeInTheDocument();
    expect(screen.queryByText(/发件箱入口已占位/i)).not.toBeInTheDocument();
  });

  it("switches the outbound mailbox identity and refreshes the send history", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/mail/outbound");
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^发件箱$/i })).toBeInTheDocument();
    expect(await within(screen.getByRole("region", { name: /发件记录列表/i })).findByText(/user@example.com/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /切换发件身份.*Ops.*ops@example.com/i }));
    const switcher = await screen.findByRole("dialog", { name: /^切换发件身份$/i });
    await user.click(within(switcher).getByRole("button", { name: /QA.*qa@example.com/i }));

    await waitFor(() => {
      expect(outboundQueries.some((query) => query.includes("accountId=box-2"))).toBe(true);
    });
    expect(screen.getByRole("button", { name: /切换发件身份.*QA.*qa@example.com/i })).toBeInTheDocument();
    expect(await within(screen.getByRole("region", { name: /发件记录列表/i })).findByText(/qa-recipient@example.com/i)).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: /发件记录列表/i })).queryByText(/user@example.com/i)).not.toBeInTheDocument();
  });

  it("opens a compose drawer from 新建发送 and sends via the inbox workflow", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/mail/outbound");
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^发件箱$/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /^新建发送$/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^新建发送$/i }));

    const dialog = await screen.findByRole("dialog", { name: /^新建发送$/i });
    await user.type(within(dialog).getByLabelText(/收件人/i), "fresh@example.com");
    await user.type(within(dialog).getByLabelText(/主题/i), "Fresh send");
    await user.type(within(dialog).getByLabelText(/正文/i), "hello from the compose drawer");
    await user.click(within(dialog).getByRole("button", { name: /^发送邮件$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /^新建发送$/i })).not.toBeInTheDocument();
    });
    expect(sendRequests).toEqual([
      {
        mailboxId: "box-1",
        toAddress: "fresh@example.com",
        subject: "Fresh send",
        bodyText: "hello from the compose drawer"
      }
    ]);
    expect(await within(screen.getByRole("region", { name: /发件记录列表/i })).findByText(/fresh@example.com/i)).toBeInTheDocument();
  });

  it("paginates outbound records without dropping the selected detail layout", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/mail/outbound");
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^发件箱$/i })).toBeInTheDocument();
    const list = screen.getByRole("region", { name: /发件记录列表/i });
    expect(within(list).getByText(/batch-4@example.com/i)).toBeInTheDocument();
    expect(within(list).queryByText(/batch-5@example.com/i)).not.toBeInTheDocument();

    await user.click(within(screen.getByRole("navigation", { name: /^发件记录分页$/i })).getByRole("button", { name: /^下一页$/i }));

    expect(await within(list).findByText(/batch-5@example.com/i)).toBeInTheDocument();
    expect(within(list).queryByText(/user@example.com/i)).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: /发件记录详情/i })).getByRole("heading", { name: /Batch notice 5/i })).toBeInTheDocument();
  });

  it("maps the legacy exceptions query to the real failed view", async () => {
    window.history.pushState({}, "", "/mail/outbound?view=exceptions");
    render(<App />);

    expect(await screen.findByRole("tab", { name: /^失败$/i })).toHaveAttribute("aria-selected", "true");
    const list = screen.getByRole("region", { name: /发件记录列表/i });
    expect(within(list).queryByText(/user@example.com/i)).not.toBeInTheDocument();
    expect(within(list).queryByText(/unknown\+signup@example.com/i)).not.toBeInTheDocument();
    expect(await within(list).findByText(/retry@example.com/i)).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: /发件记录详情/i })).getByRole("heading", { name: /Retry verification/i })).toBeInTheDocument();
  });

  it("applies saved outbound workspace defaults from mail settings", async () => {
    vi.restoreAllMocks();
    ({ outboundQueries, sendRequests } = mockMailShell({ outboundDefaultFilter: "失败", openLatestFailureFirst: true }));
    window.history.pushState({}, "", "/mail/outbound");
    render(<App />);

    expect(await screen.findByRole("tab", { name: /^失败$/i })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => {
      expect(outboundQueries.some((query) => query.includes("status=failed"))).toBe(true);
    });
    const list = screen.getByRole("region", { name: /发件记录列表/i });
    expect(await within(list).findByText(/retry@example.com/i)).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: /发件记录详情/i })).getByRole("heading", { name: /Retry verification/i })).toBeInTheDocument();
    expect(sendRequests).toEqual([]);
  });

  it("requests outbound filters from the backend and opens the raw persisted detail", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/mail/outbound");
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^发件箱$/i })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /^失败$/i }));

    await waitFor(() => {
      expect(outboundQueries.some((query) => query.includes("status=failed"))).toBe(true);
    });
    const list = screen.getByRole("region", { name: /发件记录列表/i });
    expect(await within(list).findByText(/retry@example.com/i)).toBeInTheDocument();
    expect(within(list).queryByText(/user@example.com/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^查看原始详情$/i }));

    const dialog = await screen.findByRole("dialog", { name: /^原始发件详情$/i });
    expect(within(dialog).getAllByText(/ops@example.com/i).length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText(/Retry verification body/i).length).toBeGreaterThan(0);
  });
});
