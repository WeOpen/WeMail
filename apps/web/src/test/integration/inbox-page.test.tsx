import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MessageSummary } from "@wemail/shared";

import { App } from "../../app/App";
import { formatReceivedAt } from "../../features/inbox/formatters";
import { InboxPage } from "../../pages/InboxPage";
import { jsonResponse } from "../helpers/mock-api";

type MessageFilter = "all" | "code" | "link" | "attachment" | "unparsed";

type MessageListResult = {
  messages: MessageSummary[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    messageCount: number;
    extractionCount: number;
    attachmentCount: number;
  };
};

const mockMailboxes = [
  {
    id: "box-1",
    address: "qa-signup@example.com",
    label: "QA Signup",
    createdByName: "Member User",
    createdAt: "2026-04-08T00:00:00.000Z"
  },
  {
    id: "box-2",
    address: "mailbox-2@example.com",
    label: "Mailbox 2",
    createdByName: "Ops Admin",
    createdAt: "2026-04-18T00:00:00.000Z"
  },
  {
    id: "box-3",
    address: "mailbox-3@example.com",
    label: "Mailbox 3",
    createdByName: "Member User",
    createdAt: "2026-04-19T00:00:00.000Z"
  },
  {
    id: "box-4",
    address: "mailbox-4@example.com",
    label: "Mailbox 4",
    createdByName: "Ops Admin",
    createdAt: "2026-04-20T00:00:00.000Z"
  },
  {
    id: "box-5",
    address: "mailbox-5@example.com",
    label: "Mailbox 5",
    createdByName: "Member User",
    createdAt: "2026-04-21T00:00:00.000Z"
  },
  {
    id: "box-6",
    address: "mailbox-6@example.com",
    label: "Mailbox 6",
    createdByName: "Ops Admin",
    createdAt: "2026-04-22T00:00:00.000Z"
  }
];

const mockInboxMessages: MessageSummary[] = [
  {
    id: "msg-1",
    mailboxId: "box-1",
    fromAddress: "no-reply@acme.dev",
    toAddress: "inbox-owner@example.com",
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
  },
  {
    id: "msg-4",
    mailboxId: "box-2",
    fromAddress: "billing@example.com",
    subject: "Second mailbox notice",
    previewText: "Invoice is ready",
    bodyText: "Invoice is ready",
    extraction: { method: "none", type: "none", value: "", label: "未提取" },
    oversizeStatus: null,
    attachmentCount: 0,
    attachments: [],
    receivedAt: "2026-04-08T00:03:00.000Z"
  },
  {
    id: "msg-5",
    mailboxId: "box-3",
    fromAddress: "security@example.com",
    subject: "Password reset approved",
    previewText: "Review the reset approval",
    bodyText: "Review the reset approval",
    extraction: { method: "regex", type: "auth_code", value: "906177", label: "验证码" },
    oversizeStatus: null,
    attachmentCount: 0,
    attachments: [],
    receivedAt: "2026-04-08T00:04:00.000Z"
  },
  {
    id: "msg-6",
    mailboxId: "box-4",
    fromAddress: "reports@example.com",
    subject: "Weekly digest preview",
    previewText: "Digest attached",
    bodyText: "Digest attached",
    extraction: { method: "none", type: "none", value: "", label: "未提取" },
    oversizeStatus: null,
    attachmentCount: 2,
    attachments: [
      { id: "att-2", filename: "digest.pdf", contentType: "application/pdf", size: 2048, key: "attachments/digest.pdf" },
      { id: "att-3", filename: "summary.csv", contentType: "text/csv", size: 512, key: "attachments/summary.csv" }
    ],
    receivedAt: "2026-04-08T00:05:00.000Z"
  },
  ...Array.from({ length: 6 }, (_, index): MessageSummary => ({
    id: `msg-page-${index + 7}`,
    mailboxId: index % 2 === 0 ? "box-5" : "box-6",
    fromAddress: `archive-${index + 7}@example.com`,
    subject: `Pagination sample ${index + 7}`,
    previewText: "Archived operational notice",
    bodyText: "Archived operational notice",
    extraction: { method: "none", type: "none", value: "", label: "未提取" },
    oversizeStatus: null,
    attachmentCount: 0,
    attachments: [],
    receivedAt: `2026-04-08T00:${String(index + 6).padStart(2, "0")}:00.000Z`
  }))
];

let failingMessageListResponses = 0;
let mockSessionRole: "admin" | "member" = "member";

function matchesMessageFilter(message: MessageSummary, filter: MessageFilter) {
  if (filter === "code") return message.extraction.type === "auth_code";
  if (filter === "link") return message.extraction.type !== "auth_code" && message.extraction.type !== "none";
  if (filter === "attachment") return message.attachmentCount > 0;
  if (filter === "unparsed") return message.extraction.type === "none";
  return true;
}

function matchesMessageSearch(message: MessageSummary, searchValue: string) {
  const normalizedSearch = searchValue.trim().toLowerCase();
  if (!normalizedSearch) return true;

  return [
    message.fromAddress,
    message.subject,
    message.previewText,
    message.bodyText,
    message.extraction.value,
    message.extraction.label
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedSearch);
}

function matchesMessageAdvancedFilters(message: MessageSummary, requestUrl: URL) {
  const from = requestUrl.searchParams.get("from")?.trim().toLowerCase() ?? "";
  if (from && !message.fromAddress.toLowerCase().includes(from)) return false;

  const subject = requestUrl.searchParams.get("subject")?.trim().toLowerCase() ?? "";
  if (subject && !message.subject.toLowerCase().includes(subject)) return false;

  const startDate = requestUrl.searchParams.get("startDate");
  if (startDate && message.receivedAt < startDate) return false;

  const endDate = requestUrl.searchParams.get("endDate");
  if (endDate && message.receivedAt > endDate) return false;

  const hasAttachment = requestUrl.searchParams.get("hasAttachment");
  if (hasAttachment === "true" && message.attachmentCount === 0) return false;
  if (hasAttachment === "false" && message.attachmentCount > 0) return false;

  const extractionType = requestUrl.searchParams.get("extractionType");
  if (extractionType && message.extraction.type !== extractionType) return false;

  return true;
}

function createMockMailboxListResponse(input: string) {
  const requestUrl = new URL(input, "http://localhost");
  const search = requestUrl.searchParams.get("search")?.trim().toLowerCase() ?? "";
  const page = Number(requestUrl.searchParams.get("page") ?? "1");
  const pageSize = Number(requestUrl.searchParams.get("pageSize") ?? String(mockMailboxes.length));
  const safePage = Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.trunc(pageSize) : mockMailboxes.length;
  const filteredMailboxes = mockMailboxes.filter((mailbox) => {
    if (!search) return true;
    return `${mailbox.label} ${mailbox.address}`.toLowerCase().includes(search);
  });
  const startIndex = (safePage - 1) * safePageSize;

  return {
    mailboxes: filteredMailboxes.slice(startIndex, startIndex + safePageSize),
    total: filteredMailboxes.length,
    page: safePage,
    pageSize: safePageSize
  };
}

function createMockMessageListResponse(input: string): MessageListResult {
  const requestUrl = new URL(input, "http://localhost");
  const accountId = requestUrl.searchParams.get("accountId") ?? requestUrl.searchParams.get("mailboxId");
  const filter = (requestUrl.searchParams.get("filter") ?? "all") as MessageFilter;
  const search = requestUrl.searchParams.get("search") ?? "";
  const page = Number(requestUrl.searchParams.get("page") ?? "1");
  const pageSize = Number(requestUrl.searchParams.get("pageSize") ?? "10");
  const safePage = Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.trunc(pageSize) : 10;
  const filteredMessages = mockInboxMessages.filter((message) => {
    const matchesMailbox = !accountId || message.mailboxId === accountId;
    return (
      matchesMailbox &&
      matchesMessageFilter(message, filter) &&
      matchesMessageSearch(message, search) &&
      matchesMessageAdvancedFilters(message, requestUrl)
    );
  });
  const startIndex = (safePage - 1) * safePageSize;

  return {
    messages: filteredMessages.slice(startIndex, startIndex + safePageSize),
    total: filteredMessages.length,
    page: safePage,
    pageSize: safePageSize,
    summary: {
      messageCount: filteredMessages.length,
      extractionCount: filteredMessages.filter((message) => message.extraction.type !== "none" && message.extraction.value.trim()).length,
      attachmentCount: filteredMessages.reduce((sum, message) => sum + message.attachmentCount, 0)
    }
  };
}

function createMockMessageDetailResponse(messageId: string) {
  const message = mockInboxMessages.find((entry) => entry.id === messageId) ?? mockInboxMessages[0];
  const bodyText =
    messageId === "msg-2"
      ? `Detail body loaded from backend for ${messageId}\nView in browser https://contoso.test/magic.\nRemote image blocked: https://cdn.example.test/banner.png`
      : `Detail body loaded from backend for ${messageId}`;
  const attachments =
    messageId === "msg-2"
      ? [
          ...message.attachments,
          { id: "att-image", filename: "diagram.png", contentType: "image/png", size: 2048, key: "attachments/diagram.png" }
        ]
      : message.attachments;

  return {
    message: {
      ...message,
      bodyText,
      attachments
    }
  };
}

function getFetchRequestUrl(input: Parameters<typeof fetch>[0]) {
  if (typeof input === "string") return input;
  if (input instanceof Request) return input.url;
  return String(input);
}

function getAccountRequestParams() {
  return vi.mocked(globalThis.fetch).mock.calls
    .map(([input]) => new URL(getFetchRequestUrl(input), "http://localhost"))
    .filter((url) => url.pathname === "/api/accounts")
    .map((url) => url.searchParams);
}

function getMailMessageRequestParams() {
  return vi.mocked(globalThis.fetch).mock.calls
    .map(([input]) => new URL(getFetchRequestUrl(input), "http://localhost"))
    .filter((url) => url.pathname === "/api/mail/messages")
    .map((url) => url.searchParams);
}

function getMessageBatchRequestBodies() {
  return vi.mocked(globalThis.fetch).mock.calls
    .filter(([input]) => new URL(getFetchRequestUrl(input), "http://localhost").pathname === "/api/mail/messages/batch")
    .map(([, init]) => JSON.parse(String((init as RequestInit | undefined)?.body ?? "{}")) as {
      action?: string;
      messageIds?: string[];
    });
}

function formatLocalDateMinute(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

describe("mail list integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    failingMessageListResponses = 0;
    mockSessionRole = "member";
    window.localStorage.clear();
    window.history.pushState({}, "", "/mail/list");
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = getFetchRequestUrl(input);
      const requestUrl = new URL(url, "http://localhost");

      if (url.endsWith("/api/auth/session")) {
        return jsonResponse({
          user: {
            id: mockSessionRole === "admin" ? "admin-1" : "member-1",
            email: mockSessionRole === "admin" ? "admin@example.com" : "member@example.com",
            role: mockSessionRole,
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

      if (url.endsWith("/api/accounts/domains")) {
        return jsonResponse({
          domains: [
            { domain: "example.com", allowedRoles: [] },
            { domain: "wemail.dev", allowedRoles: [] }
          ],
          primaryDomain: "example.com"
        });
      }

      if (url.endsWith("/api/accounts/settings")) {
        return jsonResponse({
          policy: {
            creation: {
              defaultTagsEnabled: false,
              defaultTags: "",
              allowCreationOverride: false,
              defaultStatus: "enabled",
              requireCreatorNote: false
            },
            lifecycle: {
              inactiveDays: 30,
              inactiveAction: "mark",
              purgeSoftDeletedDays: 90
            },
            protection: {
              bulkDeleteRequiresConfirmation: true,
              hardDeleteRequiresRecentLogin: true
            },
            lastUpdatedLabel: "2026-04-08 00:00"
          }
        });
      }

      if (requestUrl.pathname === "/api/mail/messages/batch") {
        const payload = JSON.parse(String((init as RequestInit | undefined)?.body ?? "{}")) as {
          action?: "delete" | "export";
          messageIds?: string[];
        };
        const messages = mockInboxMessages.filter((message) => payload.messageIds?.includes(message.id));
        return jsonResponse({
          result: {
            action: payload.action ?? "export",
            affected: messages.length,
            requested: payload.messageIds?.length ?? 0,
            ...(payload.action === "export" ? { messages } : {})
          }
        });
      }

      if (/^\/api\/mail\/messages\/[^/]+$/.test(requestUrl.pathname)) {
        return jsonResponse(createMockMessageDetailResponse(requestUrl.pathname.split("/").at(-1) ?? ""));
      }

      if (requestUrl.pathname === "/api/mail/messages") {
        if (failingMessageListResponses > 0) {
          failingMessageListResponses -= 1;
          return jsonResponse({ error: "Message list unavailable" }, 503);
        }

        return jsonResponse(createMockMessageListResponse(url));
      }

      if (requestUrl.pathname === "/api/accounts") {
        return jsonResponse(createMockMailboxListResponse(url));
      }

      if (url.endsWith("/api/mail/messages")) {
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
            },
            {
              id: "msg-4",
              mailboxId: "box-2",
              fromAddress: "billing@example.com",
              subject: "Second mailbox notice",
              previewText: "Invoice is ready",
              bodyText: "Invoice is ready",
              extraction: { method: "none", type: "none", value: "", label: "未提取" },
              oversizeStatus: null,
              attachmentCount: 0,
              attachments: [],
              receivedAt: "2026-04-08T00:03:00.000Z"
            },
            {
              id: "msg-5",
              mailboxId: "box-3",
              fromAddress: "security@example.com",
              subject: "Password reset approved",
              previewText: "Review the reset approval",
              bodyText: "Review the reset approval",
              extraction: { method: "regex", type: "auth_code", value: "906177", label: "验证码" },
              oversizeStatus: null,
              attachmentCount: 0,
              attachments: [],
              receivedAt: "2026-04-08T00:04:00.000Z"
            },
            {
              id: "msg-6",
              mailboxId: "box-4",
              fromAddress: "reports@example.com",
              subject: "Weekly digest preview",
              previewText: "Digest attached",
              bodyText: "Digest attached",
              extraction: { method: "none", type: "none", value: "", label: "未提取" },
              oversizeStatus: null,
              attachmentCount: 2,
              attachments: [
                { id: "att-2", filename: "digest.pdf", contentType: "application/pdf", size: 2048, key: "attachments/digest.pdf" },
                { id: "att-3", filename: "summary.csv", contentType: "text/csv", size: 512, key: "attachments/summary.csv" }
              ],
              receivedAt: "2026-04-08T00:05:00.000Z"
            }
          ]
        });
      }

      if (url.endsWith("/api/mail/messages?accountId=box-1")) {
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

      if (url.endsWith("/api/mail/messages?accountId=box-2")) {
        return jsonResponse({
          messages: [
            {
              id: "msg-4",
              mailboxId: "box-2",
              fromAddress: "billing@example.com",
              subject: "Second mailbox notice",
              previewText: "Invoice is ready",
              bodyText: "Invoice is ready",
              extraction: { method: "none", type: "none", value: "", label: "未提取" },
              oversizeStatus: null,
              attachmentCount: 0,
              attachments: [],
              receivedAt: "2026-04-08T00:03:00.000Z"
            }
          ]
        });
      }

      if (url.endsWith("/api/mail/outbound?accountId=box-1")) return jsonResponse({ messages: [] });
      if (url.endsWith("/api/mail/outbound?accountId=box-2")) return jsonResponse({ messages: [] });
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
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
  });

  it("renders the extraction-first mail workspace instead of the old four-panel inbox", async () => {
    render(<App />);

    expect(await screen.findByRole("region", { name: /^邮件列表工作台$/i })).toHaveClass("inbox-command-card");
    expect(screen.queryByText(/^邮件处理中心$/i)).not.toBeInTheDocument();
    const commandCard = screen.getByRole("region", { name: /^邮件列表工作台$/i });
    const messagePanel = screen.getByRole("region", { name: /^消息筛选与列表$/i });
    expect(commandCard).toHaveClass("inbox-command-card");
    expect(within(commandCard).getByLabelText("邮件列表筛选")).toHaveClass("inbox-message-filters");
    expect(within(commandCard).getByLabelText("消息搜索")).toHaveAttribute("placeholder", "搜索发件人 / 主题 / 内容 / 提取值");
    expect(within(messagePanel).queryByLabelText("消息搜索")).not.toBeInTheDocument();
    expect(within(messagePanel).queryByLabelText("按开始日期筛选")).not.toBeInTheDocument();
    const filterTabs = screen.getByRole("tablist", { name: /^消息快速筛选$/i });
    expect(filterTabs).toHaveClass("message-filter-tabs-list");
    expect(within(filterTabs).getByRole("tab", { name: /^全部$/i })).toHaveAttribute("aria-selected", "true");
    expect(within(filterTabs).queryByRole("tab", { name: /^全部消息$/i })).not.toBeInTheDocument();
    expect(within(filterTabs).getByRole("tab", { name: /^验证码$/i })).toBeInTheDocument();
    expect(within(filterTabs).getByRole("tab", { name: /^链接$/i })).toBeInTheDocument();
    expect(within(filterTabs).getByRole("tab", { name: /^附件$/i })).toBeInTheDocument();
    expect(within(filterTabs).getByRole("tab", { name: /^未提取$/i })).toBeInTheDocument();
    expect(filterTabs.querySelectorAll(".message-filter-tab-icon")).toHaveLength(5);
    expect(screen.queryByLabelText("按发件人筛选")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("按主题筛选")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("按附件筛选")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("按提取类型筛选")).not.toBeInTheDocument();
    expect(screen.getByLabelText("按开始日期筛选")).toBeInTheDocument();
    expect(screen.getByLabelText("按结束日期筛选")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /全部邮箱/i })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /^复制验证码$/i })).toBeInTheDocument();
    expect(screen.getAllByText("482913").length).toBeGreaterThan(0);
    expect(await screen.findByText(/待提取/i)).toBeInTheDocument();
    expect(screen.getByText(/^当前消息$/i)).toBeInTheDocument();
    expect(screen.getByText(/Second mailbox notice/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^发送测试邮件$/i })).toBeInTheDocument();
    expect(screen.queryByText(/^消息筛选台$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^\d+ \/ \d+ 条匹配$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^消息列表$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/^阅读与提取详情$/i)).not.toBeInTheDocument();
    expect(screen.queryByText("选择当前页")).not.toBeInTheDocument();
    expect(screen.getByText("已选 0")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^消息详情$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: /^阅读与提取详情$/i })).toBeInTheDocument();
    expect(screen.getByText("收件人：inbox-owner@example.com")).toBeInTheDocument();
    expect(screen.getByText(/^LOGIN LINK$/i)).toBeInTheDocument();
    const extractionCard = screen.getByLabelText("邮件识别结果");
    expect(within(extractionCard).getByText(/^识别到验证码$/i)).toBeInTheDocument();
    expect(within(extractionCard).getByText(/^482913$/i)).toBeInTheDocument();
    expect(within(extractionCard).getByLabelText(/^置信度 96%$/i)).toBeInTheDocument();
    expect(within(extractionCard).queryByText(/^提取结果$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^发送邮件$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/^邮箱导航$/i)).not.toBeInTheDocument();
  });

  it("structures message items with sender, time, extraction, and subject only", async () => {
    render(<App />);

    await screen.findByRole("button", { name: /^复制验证码$/i });
    const messageResults = within(screen.getByRole("group", { name: /^消息结果列表$/i }));
    const firstMessage = messageResults.getByRole("button", { name: /Verify your email/i });
    const firstMessageHeader = firstMessage.querySelector(".message-item-header");
    const firstMessageTop = firstMessage.querySelector(".message-item-top");
    const firstMessageMain = firstMessage.querySelector(".message-item-main");

    expect(firstMessageHeader).not.toBeNull();
    expect(firstMessageTop).not.toBeNull();
    expect(firstMessageMain).not.toBeNull();
    expect(firstMessage.querySelector(".message-item-preview")).toBeNull();
    const firstMessageReceivedAt = formatReceivedAt(mockInboxMessages[0].receivedAt);
    expect(within(firstMessageHeader as HTMLElement).getByText(/^Acme$/i)).toHaveClass("message-item-sender-name");
    expect(within(firstMessageHeader as HTMLElement).getByText(firstMessageReceivedAt)).toHaveClass("message-item-time");
    expect(within(firstMessageHeader as HTMLElement).queryByText(/^no-reply@acme.dev$/i)).not.toBeInTheDocument();
    expect(within(firstMessageHeader as HTMLElement).queryByText(/^482913$/i)).not.toBeInTheDocument();
    expect(within(firstMessageTop as HTMLElement).getByText(/^482913$/i)).toBeInTheDocument();
    expect((firstMessageTop as HTMLElement).querySelector(".message-extraction-chip-icon")).not.toBeNull();
    expect(within(firstMessageTop as HTMLElement).queryByText(/^Acme$/i)).not.toBeInTheDocument();
    expect(within(firstMessageTop as HTMLElement).queryByText(firstMessageReceivedAt)).not.toBeInTheDocument();
    expect(within(firstMessageMain as HTMLElement).getByText(/Verify your email/i)).toBeInTheDocument();
    expect(within(firstMessageMain as HTMLElement).queryByText(/^no-reply@acme.dev$/i)).not.toBeInTheDocument();
    expect(within(firstMessageMain as HTMLElement).queryByText(/^Use 482913 to finish sign in$/i)).not.toBeInTheDocument();

    const linkMessage = messageResults.getByRole("button", { name: /Your login link/i });
    const linkMessageTop = linkMessage.querySelector(".message-item-top");
    expect(within(linkMessageTop as HTMLElement).getByText(/^LOGIN LINK$/i).closest(".message-extraction-chip")?.querySelector(".message-extraction-chip-icon")).not.toBeNull();
    expect(within(linkMessageTop as HTMLElement).getByText(/^附件 1$/i).closest(".message-item-attachment-chip")?.querySelector("svg")).not.toBeNull();
  });

  it("shows the extracted URL in the detail recognition card for link messages", async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole("button", { name: /^复制验证码$/i });
    const messageResults = within(screen.getByRole("group", { name: /^消息结果列表$/i }));

    await user.click(messageResults.getByRole("button", { name: /Your login link/i }));

    const extractionCard = screen.getByLabelText("邮件识别结果");
    const extractedLink = within(extractionCard).getByText("https://contoso.test/magic");

    expect(within(extractionCard).getByText(/^识别到链接$/i)).toBeInTheDocument();
    expect(extractedLink).toHaveClass("extraction-card-value-link");
    expect(extractedLink).toHaveAttribute("title", "https://contoso.test/magic");
    expect(within(extractionCard).queryByText(/^登录链接$/i)).not.toBeInTheDocument();
    expect(within(extractionCard).getByLabelText(/^置信度 92%$/i)).toBeInTheDocument();
  });

  it("renders safe http links inside the message body as clickable links", async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole("button", { name: /^复制验证码$/i });
    const messageResults = within(screen.getByRole("group", { name: /^消息结果列表$/i }));

    await user.click(messageResults.getByRole("button", { name: /Your login link/i }));

    const bodyLink = await screen.findByRole("link", { name: "https://contoso.test/magic" });

    expect(bodyLink).toHaveAttribute("href", "https://contoso.test/magic");
    expect(bodyLink).toHaveAttribute("target", "_blank");
    expect(bodyLink).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(bodyLink).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
  });

  it("renders image attachments as inline previews from the attachment endpoint", async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole("button", { name: /^复制验证码$/i });
    const messageResults = within(screen.getByRole("group", { name: /^消息结果列表$/i }));

    await user.click(messageResults.getByRole("button", { name: /Your login link/i }));

    const imagePreview = await screen.findByRole("img", { name: "diagram.png" });

    expect(imagePreview).toHaveAttribute("src", "/api/mail/messages/msg-2/attachments/att-image?preview=1");
    expect(imagePreview).toHaveAttribute("loading", "lazy");
  });

  it("keeps remote message images blocked until the user loads them through the proxy", async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole("button", { name: /^复制验证码$/i });
    const messageResults = within(screen.getByRole("group", { name: /^消息结果列表$/i }));

    await user.click(messageResults.getByRole("button", { name: /Your login link/i }));

    const loadButton = await screen.findByRole("button", { name: /加载远程图片 cdn\.example\.test/i });
    expect(screen.queryByRole("img", { name: /远程图片 cdn\.example\.test/i })).not.toBeInTheDocument();

    await user.click(loadButton);

    const remoteImage = screen.getByRole("img", { name: /远程图片 cdn\.example\.test/i });
    expect(remoteImage).toHaveAttribute(
      "src",
      `/api/mail/messages/msg-2/remote-image?url=${encodeURIComponent("https://cdn.example.test/banner.png")}`
    );
    expect(remoteImage).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  it("loads the selected message detail by id instead of relying on list payload", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByText("Detail body loaded from backend for msg-1")).toBeInTheDocument();
    await waitFor(() => {
      expect(vi.mocked(globalThis.fetch).mock.calls.some(([input]) => {
        const url = new URL(getFetchRequestUrl(input), "http://localhost");
        return url.pathname === "/api/mail/messages/msg-1";
      })).toBe(true);
    });

    const messageResults = within(screen.getByRole("group", { name: /^消息结果列表$/i }));
    await user.click(messageResults.getByRole("button", { name: /Your login link/i }));

    expect(await screen.findByText(/Detail body loaded from backend for msg-2/i)).toBeInTheDocument();
  });

  it("shows a retryable message-list error state when backend loading fails", async () => {
    const user = userEvent.setup();
    failingMessageListResponses = 1;

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Message list unavailable");

    await user.click(screen.getByRole("button", { name: /^重试加载邮件$/i }));

    expect(
      await within(screen.getByRole("group", { name: /^消息结果列表$/i })).findByText(/Verify your email/i)
    ).toBeInTheDocument();
  });

  it("moves mailbox selection into the command card and defaults to all accounts when empty", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByRole("button", { name: /^复制验证码$/i })).toBeInTheDocument();
    const messageResults = () => within(screen.getByRole("group", { name: /^消息结果列表$/i }));

    expect(screen.queryByText(/^邮箱导航$/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /全部邮箱/i })).toBeInTheDocument();
    expect(messageResults().getByText(/Verify your email/i)).toBeInTheDocument();
    expect(messageResults().getByText(/Second mailbox notice/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /全部邮箱/i }));

    const dialog = await screen.findByRole("dialog", { name: /^选择邮箱$/i });
    await waitFor(() => {
      expect(getAccountRequestParams().some((params) => params.get("page") === "1" && params.get("pageSize") === "4")).toBe(true);
    });
    expect(within(dialog).getByLabelText("搜索邮箱")).toHaveAttribute("placeholder", "搜索邮箱名或邮箱账号");
    expect(within(dialog).queryByText(/^全部邮箱$/i)).not.toBeInTheDocument();
    expect(within(dialog).getByRole("table", { name: /^邮箱选择表格$/i })).toHaveClass("mailbox-select-table");
    expect(within(dialog).getByRole("columnheader", { name: /^序号$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("columnheader", { name: /^邮箱标签$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("columnheader", { name: /^地址$/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole("columnheader", { name: /^创建人$/i })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("columnheader", { name: /^创建时间$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("navigation", { name: /^邮箱选择分页$/i })).toHaveClass("users-list-pagination");
    expect(within(dialog).queryByRole("row", { name: /Mailbox 5/i })).not.toBeInTheDocument();

    await user.click(within(within(dialog).getByRole("navigation", { name: /^邮箱选择分页$/i })).getByRole("button", { name: /^下一页$/i }));

    await waitFor(() => {
      expect(getAccountRequestParams().some((params) => params.get("page") === "2" && params.get("pageSize") === "4")).toBe(true);
    });
    expect(within(dialog).getByRole("row", { name: /Mailbox 5/i })).toBeInTheDocument();

    const mailboxSearch = within(dialog).getByLabelText("搜索邮箱");
    await user.type(mailboxSearch, "not-found");

    await waitFor(() => {
      expect(getAccountRequestParams().some((params) => params.get("search") === "not-found")).toBe(true);
    });
    expect(within(dialog).getByRole("region", { name: "没有匹配的邮箱" })).toHaveClass("ui-table-state-card", "ui-empty-state");

    await user.clear(mailboxSearch);
    await user.type(mailboxSearch, "mailbox-2");

    await waitFor(() => {
      expect(getAccountRequestParams().some((params) => params.get("search") === "mailbox-2")).toBe(true);
    });
    const mailboxRow = within(dialog).getByRole("row", { name: /Mailbox 2/i });
    expect(mailboxRow).toBeInTheDocument();
    expect(within(dialog).queryByRole("row", { name: /QA Signup/i })).not.toBeInTheDocument();

    await user.dblClick(mailboxRow);

    expect(await screen.findByRole("button", { name: /Mailbox 2/i })).toBeInTheDocument();
    expect(messageResults().getByText(/Second mailbox notice/i)).toBeInTheDocument();
    expect(messageResults().queryByText(/Verify your email/i)).not.toBeInTheDocument();

    await user.hover(screen.getByRole("button", { name: /Mailbox 2/i }).closest(".mailbox-select-trigger-shell") as HTMLElement);
    await user.click(screen.getByRole("button", { name: /^清除邮箱选择$/i }));

    expect(await screen.findByRole("button", { name: /全部邮箱/i })).toBeInTheDocument();
    expect(await messageResults().findByText(/Verify your email/i)).toBeInTheDocument();
  });

  it("shows creator metadata in the mailbox selector only for admins", async () => {
    const user = userEvent.setup();
    mockSessionRole = "admin";

    render(<App />);

    await screen.findByRole("button", { name: /^复制验证码$/i });
    await user.click(screen.getByRole("button", { name: /全部邮箱/i }));

    const dialog = await screen.findByRole("dialog", { name: /^选择邮箱$/i });
    const table = within(dialog).getByRole("table", { name: /^邮箱选择表格$/i });
    expect(within(dialog).getByRole("columnheader", { name: /^创建人$/i })).toBeInTheDocument();
    expect(table).toHaveClass("mailbox-select-table", "is-admin");
    expect(within(dialog).getByRole("columnheader", { name: /^邮箱标签$/i })).toHaveStyle({ width: "132px" });
    expect(within(dialog).getByRole("columnheader", { name: /^地址$/i })).toHaveStyle({ width: "300px" });
    expect(within(dialog).getByRole("columnheader", { name: /^创建人$/i })).toHaveStyle({ width: "108px" });
    expect(within(dialog).getByRole("columnheader", { name: /^创建时间$/i })).toHaveStyle({ width: "172px" });
    const qaSignupRow = within(dialog).getByRole("row", { name: /QA Signup/i });
    expect(qaSignupRow).toHaveTextContent("Member User");
    expect(within(dialog).getByRole("row", { name: /Mailbox 2/i })).toHaveTextContent("Ops Admin");
    expect(within(qaSignupRow).getByText(/^QA Signup$/i)).toHaveAttribute("title", "QA Signup");
    expect(within(qaSignupRow).getByText(/^qa-signup@example.com$/i)).toHaveAttribute("title", "qa-signup@example.com");
    expect(within(qaSignupRow).getByText(/^Member User$/i)).toHaveAttribute("title", "Member User");
    const createdAtLabel = formatLocalDateMinute(mockMailboxes[0].createdAt);
    expect(within(qaSignupRow).getByText(createdAtLabel)).toHaveAttribute("title", createdAtLabel);
  });

  it("aligns the create-mailbox dialog with the account creation dialog pattern", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByRole("button", { name: /^新建邮箱$/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^新建邮箱$/i }));

    const dialog = await screen.findByRole("dialog", { name: /^创建新邮箱$/i });
    expect(within(dialog).getByText(/^新建邮箱$/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/填写邮箱标签并选择可用域名，系统将生成邮箱地址。/i)).toHaveClass("section-copy");
    expect(within(dialog).getByLabelText(/^邮箱标签$/i)).toHaveAttribute("placeholder", "例如：ops、admin、support");
    const domainCombobox = within(dialog).getByRole("combobox", { name: /^邮箱域名$/i });
    expect(domainCombobox).toHaveTextContent("请选择域名");
    expect(within(dialog).getByRole("button", { name: /^取消$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^创建邮箱$/i })).toBeDisabled();

    await user.click(domainCombobox);
    expect(await screen.findByRole("option", { name: /^example.com$/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /^wemail.dev$/i })).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: /^example.com$/i }));

    expect(domainCombobox).toHaveTextContent("example.com");
    expect(within(dialog).getByRole("button", { name: /^创建邮箱$/i })).toBeEnabled();
  });

  it("shows the real empty state instead of preview messages when the backend list is empty", async () => {
    render(<App />);

    expect(await screen.findByRole("button", { name: /^复制验证码$/i })).toBeInTheDocument();
    const messageResults = () => within(screen.getByRole("group", { name: /^消息结果列表$/i }));

    expect(messageResults().getByText(/Second mailbox notice/i)).toBeInTheDocument();
    expect(messageResults().getByText(/Password reset approved/i)).toBeInTheDocument();

    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

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

      if (url.endsWith("/api/accounts/domains")) {
        return jsonResponse({
          domains: [{ domain: "example.com", allowedRoles: [] }],
          primaryDomain: "example.com"
        });
      }

      if (url.endsWith("/api/accounts/settings")) {
        return jsonResponse({
          policy: {
            creation: {
              defaultTagsEnabled: false,
              defaultTags: "",
              allowCreationOverride: false,
              defaultStatus: "enabled",
              requireCreatorNote: false
            },
            lifecycle: {
              inactiveDays: 30,
              inactiveAction: "mark",
              purgeSoftDeletedDays: 90
            },
            protection: {
              bulkDeleteRequiresConfirmation: true,
              hardDeleteRequiresRecentLogin: true
            },
            lastUpdatedLabel: "2026-04-08 00:00"
          }
        });
      }

      if (url.endsWith("/api/accounts")) {
        return jsonResponse({
          mailboxes: [{ id: "box-empty", address: "empty@example.com", label: "Empty inbox", createdAt: "2026-04-08T00:00:00.000Z" }]
        });
      }

      if (url.startsWith("/api/mail/messages") || url.includes("/api/mail/messages")) return jsonResponse({ messages: [] });
      if (url.includes("/api/mail/outbound")) return jsonResponse({ messages: [] });
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

    cleanup();
    window.history.pushState({}, "", "/mail/list");
    render(<App />);

    const previewResults = within(await screen.findByRole("group", { name: /^消息结果列表$/i }));
    expect(previewResults.queryByText(/预览验证码通知/i)).not.toBeInTheDocument();
    expect(previewResults.getByRole("region", { name: /^暂无邮件$/i })).toHaveClass("ui-empty-state", "message-empty-card");
    expect(previewResults.getByText(/当前筛选下没有消息，切换筛选或等待新邮件到达。/i)).toHaveClass("ui-empty-state-description");
    const detailPanel = within(screen.getByRole("region", { name: /^阅读与提取详情$/i }));
    expect(detailPanel.getByRole("region", { name: /^请选择一封消息$/i })).toHaveClass("ui-empty-state", "detail-empty-card");
    expect(detailPanel.getAllByRole("heading", { name: /^请选择一封消息$/i })).toHaveLength(1);
    expect(detailPanel.queryByText(/这是一条前端预览邮件/i)).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /^消息列表分页$/i })).toBeInTheDocument();
    expect(screen.queryByText("选择当前页")).not.toBeInTheDocument();
  });

  it("requests backend message queries for search, extraction tabs, and pagination", async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole("button", { name: /^复制验证码$/i });
    const messageResults = () => within(screen.getByRole("group", { name: /^消息结果列表$/i }));

    await user.type(screen.getByLabelText("消息搜索"), "contoso");

    await waitFor(() => {
      expect(getMailMessageRequestParams().some((params) => params.get("search") === "contoso")).toBe(true);
    });
    expect(messageResults().getByText(/^LOGIN LINK$/i)).toBeInTheDocument();
    expect(messageResults().queryByText(/^482913$/i)).not.toBeInTheDocument();
    expect(messageResults().queryByText(/^未提取$/i)).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("消息搜索"));
    await user.click(screen.getByRole("tab", { name: /^附件$/i }));

    await waitFor(() => {
      expect(getMailMessageRequestParams().some((params) => params.get("filter") === "attachment" && !params.has("search"))).toBe(true);
    });
    expect(messageResults().getByText(/^LOGIN LINK$/i)).toBeInTheDocument();
    expect(messageResults().getByText(/^附件 1$/i)).toBeInTheDocument();
    expect(messageResults().queryByText(/^482913$/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /^未提取$/i }));

    await waitFor(() => {
      expect(getMailMessageRequestParams().some((params) => params.get("filter") === "unparsed" && !params.has("search"))).toBe(true);
    });
    expect(messageResults().getAllByText(/^未提取$/i).length).toBeGreaterThan(0);
    expect(messageResults().getByText(/Welcome to Demo App/i)).toBeInTheDocument();
    expect(messageResults().getByText(/Second mailbox notice/i)).toBeInTheDocument();
    expect(messageResults().queryByText(/^LOGIN LINK$/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /^全部$/i }));
    await waitFor(() => {
      expect(getMailMessageRequestParams().some((params) => params.get("filter") === "all")).toBe(true);
    });
    await user.click(within(screen.getByRole("navigation", { name: /^消息列表分页$/i })).getByRole("button", { name: /^下一页$/i }));

    await waitFor(() => {
      expect(getMailMessageRequestParams().some((params) => params.get("page") === "2")).toBe(true);
    });
  });

  it("debounces message search so only the final search term reaches the backend", async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole("button", { name: /^复制验证码$/i });

    await user.type(screen.getByLabelText("消息搜索"), "contoso");

    await waitFor(() => {
      expect(getMailMessageRequestParams().some((params) => params.get("search") === "contoso")).toBe(true);
    });

    const searchRequests = getMailMessageRequestParams()
      .map((params) => params.get("search"))
      .filter(Boolean);
    expect(searchRequests).toEqual(["contoso"]);
  });

  it("sends date range filters to the backend", async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole("button", { name: /^复制验证码$/i });

    await user.type(screen.getByLabelText("按开始日期筛选"), "2026-04-08");
    await user.type(screen.getByLabelText("按结束日期筛选"), "2026-04-09");

    await waitFor(() => {
      expect(
        getMailMessageRequestParams().some(
          (params) =>
            params.get("startDate") === "2026-04-08T00:00:00.000Z" &&
            params.get("endDate") === "2026-04-09T23:59:59.999Z"
        )
      ).toBe(true);
    });
  });

  it("runs batch delete for selected messages", async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole("button", { name: /^复制验证码$/i });
    await user.click(screen.getByLabelText(/选择邮件 Verify your email/i));
    await user.click(screen.getByRole("button", { name: /^删除$/i }));

    await waitFor(() => {
      expect(getMessageBatchRequestBodies()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            action: "delete",
            messageIds: ["msg-1"]
          })
        ])
      );
    });
  });

  it("polls the current message query while the inbox page is mounted", async () => {
    const onRefreshMessages = vi.fn().mockResolvedValue(undefined);

    render(
      <InboxPage
        availableDomains={[]}
        isLoadingMessages={false}
        isLoadingDomains={false}
        mailboxes={[]}
        messageListError={null}
        selectedMailboxId={null}
        messages={[]}
        messageListPage={1}
        messageListPageSize={10}
        messageListSummary={{ messageCount: 0, extractionCount: 0, attachmentCount: 0 }}
        messageListTotal={0}
        selectedMessage={null}
        selectedMessageId={null}
        isLoadingSelectedMessage={false}
        selectedMessageError={null}
        outboundHistory={[]}
        mailboxComposerOpen={false}
        messageRefreshIntervalMs={20}
        onCloseMailboxComposer={vi.fn()}
        onCreateMailbox={vi.fn()}
        onOpenMailboxComposer={vi.fn()}
        onQueryMailboxes={vi.fn().mockResolvedValue({ mailboxes: [], total: 0, page: 1, pageSize: 4 })}
        onRefreshMessages={onRefreshMessages}
        onRetrySelectedMessage={vi.fn()}
        onRunMessageBatchAction={vi.fn().mockResolvedValue({ action: "export", affected: 0, requested: 0, messages: [] })}
        onSelectMailbox={vi.fn()}
        onSelectMessage={vi.fn()}
        onSendMail={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(onRefreshMessages).toHaveBeenCalled();
    });
    const initialRefreshCount = onRefreshMessages.mock.calls.length;

    await waitFor(() => {
      expect(onRefreshMessages.mock.calls.length).toBeGreaterThan(initialRefreshCount);
    }, { timeout: 200 });
  });

  it("shows the refresh button as loading while messages are refreshing", () => {
    render(
      <InboxPage
        availableDomains={[]}
        isLoadingMessages
        isLoadingDomains={false}
        mailboxes={[]}
        messageListError={null}
        selectedMailboxId={null}
        messages={[]}
        messageListPage={1}
        messageListPageSize={10}
        messageListSummary={{ messageCount: 0, extractionCount: 0, attachmentCount: 0 }}
        messageListTotal={0}
        selectedMessage={null}
        selectedMessageId={null}
        isLoadingSelectedMessage={false}
        selectedMessageError={null}
        outboundHistory={[]}
        mailboxComposerOpen={false}
        messageRefreshIntervalMs={0}
        onCloseMailboxComposer={vi.fn()}
        onCreateMailbox={vi.fn()}
        onOpenMailboxComposer={vi.fn()}
        onQueryMailboxes={vi.fn().mockResolvedValue({ mailboxes: [], total: 0, page: 1, pageSize: 4 })}
        onRefreshMessages={vi.fn()}
        onRetrySelectedMessage={vi.fn()}
        onRunMessageBatchAction={vi.fn().mockResolvedValue({ action: "export", affected: 0, requested: 0, messages: [] })}
        onSelectMailbox={vi.fn()}
        onSelectMessage={vi.fn()}
        onSendMail={vi.fn()}
      />
    );

    const refreshButton = screen.getByRole("button", { name: /^刷新中$/i });

    expect(refreshButton).toBeDisabled();
    expect(refreshButton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status", { name: "正在加载邮件" }).querySelector(".ui-spinner-indicator")).not.toBeNull();
  });

  it("shows the refresh button as loading when automatic polling refreshes messages", async () => {
    let refreshCallCount = 0;
    const pendingRefreshResolvers: Array<() => void> = [];

    function AutoRefreshHarness() {
      const [isLoadingMessages, setIsLoadingMessages] = useState(false);
      const handleRefreshMessages = useCallback(async () => {
        refreshCallCount += 1;
        setIsLoadingMessages(true);

        if (refreshCallCount > 1) {
          await new Promise<void>((resolve) => pendingRefreshResolvers.push(resolve));
        }

        setIsLoadingMessages(false);
      }, []);

      return (
        <InboxPage
          availableDomains={[]}
          isLoadingMessages={isLoadingMessages}
          isLoadingDomains={false}
          mailboxes={[]}
          messageListError={null}
          selectedMailboxId={null}
          messages={[]}
          messageListPage={1}
          messageListPageSize={10}
          messageListSummary={{ messageCount: 0, extractionCount: 0, attachmentCount: 0 }}
          messageListTotal={0}
          selectedMessage={null}
          selectedMessageId={null}
          isLoadingSelectedMessage={false}
          selectedMessageError={null}
          outboundHistory={[]}
          mailboxComposerOpen={false}
          messageRefreshIntervalMs={80}
          onCloseMailboxComposer={vi.fn()}
          onCreateMailbox={vi.fn()}
          onOpenMailboxComposer={vi.fn()}
          onQueryMailboxes={vi.fn().mockResolvedValue({ mailboxes: [], total: 0, page: 1, pageSize: 4 })}
          onRefreshMessages={handleRefreshMessages}
          onRetrySelectedMessage={vi.fn()}
          onRunMessageBatchAction={vi.fn().mockResolvedValue({ action: "export", affected: 0, requested: 0, messages: [] })}
          onSelectMailbox={vi.fn()}
          onSelectMessage={vi.fn()}
          onSendMail={vi.fn()}
        />
      );
    }

    render(<AutoRefreshHarness />);

    await waitFor(() => {
      expect(refreshCallCount).toBe(1);
    });
    expect(await screen.findByRole("button", { name: /^刷新$/i })).toBeEnabled();

    await waitFor(() => {
      expect(refreshCallCount).toBeGreaterThan(1);
    }, { timeout: 300 });

    const refreshButton = screen.getByRole("button", { name: /^刷新中$/i });
    expect(refreshButton).toBeDisabled();
    expect(refreshButton).toHaveAttribute("aria-busy", "true");

    pendingRefreshResolvers.splice(0).forEach((resolve) => resolve());
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^刷新$/i })).toBeEnabled();
    });
  });

  it("lets QA filter down to code-only messages without losing the extraction-first hierarchy", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByRole("button", { name: /^复制验证码$/i })).toBeInTheDocument();
    const messageResults = () => within(screen.getByRole("group", { name: /^消息结果列表$/i }));

    expect(messageResults().getByText(/^LOGIN LINK$/i)).toBeInTheDocument();
    expect(messageResults().getAllByText(/^未提取$/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("tab", { name: /^验证码$/i }));

    expect(messageResults().getByText("482913")).toBeInTheDocument();
    expect(messageResults().queryByText(/^LOGIN LINK$/i)).not.toBeInTheDocument();
    expect(messageResults().queryByText(/^未提取$/i)).not.toBeInTheDocument();
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
    const openWindow = vi.spyOn(window, "open").mockImplementation(() => null);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true
    });

    render(<App />);

    const copyButton = await screen.findByRole("button", { name: /^复制验证码$/i });
    const actionBar = screen.getByLabelText("邮件详情操作栏");
    const actionGroup = within(actionBar).getByLabelText("邮件详情操作");

    expect(within(actionBar).getByRole("heading", { name: /^Verify your email$/i })).toHaveClass("detail-panel-subject");
    expect(copyButton).toHaveClass("detail-panel-icon-action", "ui-button-icon-only");
    expect(screen.getByRole("button", { name: /^打开原始邮件$/i })).toHaveClass("detail-panel-icon-action", "ui-button-icon-only");
    expect(screen.getByRole("button", { name: /^查看提取 JSON$/i })).toHaveClass("detail-panel-icon-action", "ui-button-icon-only");
    expect(within(actionGroup).queryByText(/^复制验证码$/i)).not.toBeInTheDocument();
    expect(within(actionGroup).queryByText(/^打开原始邮件$/i)).not.toBeInTheDocument();
    expect(within(actionGroup).queryByText(/^查看提取 JSON$/i)).not.toBeInTheDocument();

    await user.hover(copyButton);

    expect(await screen.findByRole("tooltip")).toHaveTextContent("复制验证码");

    await user.click(copyButton);
    await user.click(screen.getByRole("button", { name: /^打开原始邮件$/i }));
    await user.click(screen.getByRole("button", { name: /^查看提取 JSON$/i }));

    expect(writeText).toHaveBeenCalledWith("482913");
    expect(openWindow).toHaveBeenNthCalledWith(1, "/api/mail/messages/msg-1", "_blank", "noopener,noreferrer");
    expect(openWindow).toHaveBeenNthCalledWith(2, "/api/mail/messages/msg-1", "_blank", "noopener,noreferrer");
  });
});
