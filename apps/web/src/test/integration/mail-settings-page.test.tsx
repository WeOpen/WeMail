import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultMailSettings, type MailSettings, type MailSettingsUpdateInput } from "@wemail/shared";

import { App } from "../../app/App";
import { jsonResponse } from "../helpers/mock-api";

function mockMailShell(options?: { role?: "admin" | "member" }) {
  const role = options?.role ?? "admin";
  const updateRequests: MailSettingsUpdateInput[] = [];
  let mailSettings: MailSettings = {
    ...defaultMailSettings,
    senderRules: {
      ...defaultMailSettings.senderRules,
      defaultIdentity: "Ops Mail <ops@wemail.test>",
      signature: "Managed by WeMail."
    },
    routing: {
      ...defaultMailSettings.routing,
      webhookEnabled: true,
      webhookEndpoint: "https://hooks.wemail.test/mail",
      telegramEnabled: true,
      telegramTarget: "Team alerts",
      failureAlerts: true,
      exceptionAlerts: true,
      fallbackOwner: "ops@wemail.test"
    },
    workspaceDefaults: {
      ...defaultMailSettings.workspaceDefaults,
      defaultMailRoute: "/mail/outbound",
      outboundDefaultFilter: "失败",
      expandExceptionsByDefault: true,
      openLatestFailureFirst: true
    },
    lastUpdatedLabel: "2026-04-08T09:30:00.000Z"
  };

  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");

    if (url.endsWith("/api/auth/session")) {
      return jsonResponse({
        user: { id: "user-1", email: `${role}@example.com`, role, createdAt: "2026-04-08T00:00:00.000Z" },
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
        mailboxes: [{ id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }]
      });
    }

    if (url.endsWith("/api/mail/settings")) {
      if (method === "PUT") {
        const payload = JSON.parse(String(init?.body ?? "{}")) as MailSettingsUpdateInput;
        updateRequests.push(payload);
        mailSettings = {
          ...mailSettings,
          senderRules: { ...mailSettings.senderRules, ...payload.senderRules },
          routing: { ...mailSettings.routing, ...payload.routing },
          workspaceDefaults: { ...mailSettings.workspaceDefaults, ...payload.workspaceDefaults },
          lastUpdatedLabel: "2026-04-08T10:15:00.000Z"
        };
      }
      return jsonResponse({ settings: mailSettings });
    }

    if (url.endsWith("/api/webhook/endpoints")) {
      return jsonResponse({
        endpoints: [
          {
            id: "wh-main",
            name: "生产通知",
            url: "https://hooks.wemail.test/mail",
            events: ["message.received", "message.failed"],
            signingSecret: "secret-main",
            enabled: true,
            createdAt: "2026-04-08T00:00:00.000Z",
            updatedAt: "2026-04-08T09:30:00.000Z"
          },
          {
            id: "wh-audit",
            name: "审计流水",
            url: "https://audit.wemail.test/hooks",
            events: ["settings.updated"],
            signingSecret: "secret-audit",
            enabled: true,
            createdAt: "2026-04-08T00:00:00.000Z",
            updatedAt: "2026-04-08T09:45:00.000Z"
          },
          {
            id: "wh-paused",
            name: "暂停端点",
            url: "https://paused.wemail.test/hooks",
            events: ["message.received"],
            signingSecret: "secret-paused",
            enabled: false,
            createdAt: "2026-04-08T00:00:00.000Z",
            updatedAt: "2026-04-08T09:50:00.000Z"
          }
        ]
      });
    }
    if (url.endsWith("/api/telegram/overview")) {
      return jsonResponse({
        overview: {
          botConfigured: true,
          canSendTest: true,
          featureEnabled: true,
          subscription: {
            chatId: "123456",
            enabled: true,
            updatedAt: "2026-04-08T09:30:00.000Z"
          },
          supportedEvents: []
        }
      });
    }
    if (url.endsWith("/api/mail/messages?accountId=box-1")) return jsonResponse({ messages: [] });
    if (url.endsWith("/api/mail/outbound?accountId=box-1")) return jsonResponse({ messages: [] });
    if (url.endsWith("/api/api-keys")) return jsonResponse({ keys: [] });
    if (url.endsWith("/api/telegram/subscription")) return jsonResponse({ subscription: { chatId: "123456", enabled: true } });
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

  return { updateRequests };
}

describe("mail settings integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.pushState({}, "", "/mail/settings");
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
  });

  it("renders the rule-centric mail settings center instead of the placeholder cards", async () => {
    mockMailShell();
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^邮件设置$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^发件规则$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^通知与路由$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^工作台行为偏好$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^当前策略摘要$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^默认发件身份$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Webhook 通知$/i)).toBeInTheDocument();
    expect(screen.queryByText(/qa@example\.com/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/邮件设置先做占位/i)).not.toBeInTheDocument();
  });

  it("keeps a lightweight summary rail in sync with locally saved sender and routing rules", async () => {
    mockMailShell();
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^邮件设置$/i })).toBeInTheDocument();

    const identityInput = screen.getByRole("textbox", { name: /^默认发件身份$/i });
    await user.clear(identityInput);
    await user.type(identityInput, "Support Mail <support@wemail.test>");
    await user.click(screen.getByRole("button", { name: /^保存发件规则$/i }));
    expect(screen.getByText(/发件规则已保存/i)).toBeInTheDocument();

    const summary = screen.getByRole("complementary", { name: /当前策略摘要/i });
    expect(within(summary).getByText("Support Mail <support@wemail.test>")).toBeInTheDocument();

    await user.click(screen.getByLabelText(/^失败告警$/i));
    await user.click(screen.getByRole("button", { name: /^保存通知与路由$/i }));
    expect(screen.getByText(/通知与路由已保存/i)).toBeInTheDocument();
    expect(within(summary).getByText(/^关闭$/i)).toBeInTheDocument();
  });

  it("selects notification targets from configured Webhook and Telegram channels instead of direct input", async () => {
    const { updateRequests } = mockMailShell();
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^邮件设置$/i })).toBeInTheDocument();

    expect(screen.queryByRole("textbox", { name: /^Webhook 端点$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /^Telegram 目标$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/从 Telegram 设置页当前已启用的绑定中选择/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: /^Webhook 端点$/i }));
    await user.click(await screen.findByRole("option", { name: /审计流水.*audit\.wemail\.test/i }));

    const telegramTarget = screen.getByRole("combobox", { name: /^Telegram 目标$/i });
    const exceptionStrategy = screen.getByRole("combobox", { name: /^异常处理策略$/i });
    const fallbackOwner = screen.getByRole("textbox", { name: /^异常归属$/i });

    expect(telegramTarget).toHaveTextContent(/123456/i);
    expect(telegramTarget).toHaveClass("mail-settings-target-control");
    expect(exceptionStrategy).toHaveClass("mail-settings-target-control");
    expect(fallbackOwner).toHaveClass("mail-settings-target-control");
    expect(telegramTarget.closest(".form-field")).toHaveClass("mail-settings-target-field");
    expect(exceptionStrategy.closest(".form-field")).toHaveClass("mail-settings-target-field");
    expect(fallbackOwner.closest(".form-field")).toHaveClass("mail-settings-target-field");
    expect(screen.queryByRole("option", { name: /暂停端点/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^保存通知与路由$/i }));

    expect(updateRequests.at(-1)?.routing).toEqual(
      expect.objectContaining({
        webhookEndpoint: "wh-audit",
        telegramTarget: "123456"
      })
    );
  });

  it("renders mail settings as read-only for non-admin sessions", async () => {
    mockMailShell({ role: "member" });
    render(<App />);

    expect(await screen.findByRole("heading", { name: /^邮件设置$/i })).toBeInTheDocument();
    expect(screen.getByText(/只有管理员可以修改邮件策略/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^默认发件身份$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^保存发件规则$/i })).toBeDisabled();
  });
});
