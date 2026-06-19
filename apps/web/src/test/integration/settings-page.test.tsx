import { readFileSync } from "node:fs";

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import type { TelegramDeliverySummary, TelegramLinkCodeSummary, TelegramOverviewSummary } from "@wemail/shared";

import { ApiKeysPage } from "../../features/settings/ApiKeysPage";
import { TelegramSettingsPage } from "../../features/settings/TelegramSettingsPage";
import { WebhookPage } from "../../features/settings/WebhookPage";
import { useAppStore } from "../../app/appStore";

const sharedStyles = readFileSync("src/shared/styles/index.css", "utf8");

function getStyleRule(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = sharedStyles.matchAll(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, "g"));

  return Array.from(matches, (match) => match[1]).join("\n");
}

function renderWithRouter(element: ReactElement) {
  return render(<MemoryRouter>{element}</MemoryRouter>);
}

const telegramOverview: TelegramOverviewSummary = {
  botConfigured: true,
  canSendTest: true,
  featureEnabled: true,
  subscription: {
    chatId: "12345678",
    enabled: true,
    updatedAt: "2026-06-14T00:00:00.000Z"
  },
  supportedEvents: [
    {
      id: "message.received",
      label: "新邮件到达",
      description: "账号收到新邮件后发送 Telegram 提醒。",
      enabled: true
    },
    {
      id: "message.extraction.detected",
      label: "识别结果",
      description: "邮件中识别到验证码或链接后发送 Telegram 提醒。",
      enabled: true
    },
    {
      id: "api_key.created",
      label: "API Key 创建",
      description: "创建新的 API Key 后发送安全提醒。",
      enabled: true
    },
    {
      id: "api_key.revoked",
      label: "API Key 吊销",
      description: "吊销 API Key 后发送安全提醒。",
      enabled: true
    }
  ]
};

const telegramDeliveries: TelegramDeliverySummary[] = [
  {
    id: "delivery-1",
    eventId: "telegram.test",
    label: "测试通知",
    delivered: false,
    reason: "telegram_api_failed",
    chatId: "12345678",
    createdAt: "2026-06-14T01:00:00.000Z"
  }
];

const telegramLinkCode: TelegramLinkCodeSummary = {
  code: "wm_abcdefghijklmnop",
  deepLinkUrl: "https://t.me/WeMailBot?start=wm_abcdefghijklmnop",
  expiresAt: "2026-06-14T01:15:00.000Z",
  startCommand: "/start wm_abcdefghijklmnop"
};

describe("settings pages", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens api key creation in a dialog and reveals the generated key after submit", async () => {
    const user = userEvent.setup();
    const onCreateApiKey = vi.fn().mockResolvedValue({
      key: { secret: "wk_live_secret_123456", prefix: "wk_live_abcd" }
    });

    renderWithRouter(
      <ApiKeysPage
        apiKeys={[
          {
            id: "key-1",
            label: "本地脚本",
            prefix: "wk_live_1234",
            createdAt: "2026-04-08T00:00:00.000Z",
            lastUsedAt: null,
            revokedAt: null
          }
        ]}
        onCreateApiKey={onCreateApiKey}
        onRevokeApiKey={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: /^API 密钥$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /密钥清单/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /接入终端/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /密钥生命周期/i })).toBeInTheDocument();
    expect(screen.getByText("总密钥")).toBeInTheDocument();
    expect(screen.getByText("活跃密钥")).toBeInTheDocument();
    expect(screen.getByText("从未使用")).toBeInTheDocument();
    expect(screen.getByText("已吊销")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /快速开始/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /安全建议/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/如何选择这三种接入/i)).not.toBeInTheDocument();
    const heroCard = document.querySelector(".api-keys-hero-card");
    const topStats = document.querySelector(".api-keys-top-stats");
    expect(heroCard).not.toBeNull();
    expect(topStats).not.toBeNull();
    expect(heroCard).toContainElement(topStats as HTMLElement);
    expect(document.querySelector(".api-keys-credential-grid")).not.toBeNull();
    expect(document.querySelector(".api-keys-terminal-card")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: /创建密钥/i }));
    const createDialog = screen.getByRole("dialog", { name: /创建 API 密钥/i });
    expect(createDialog).toBeInTheDocument();
    expect(document.querySelector(".api-keys-create-panel")).toBeNull();

    await user.type(within(createDialog).getByLabelText(/密钥名称/i), "个人 CLI");
    await user.click(within(createDialog).getByRole("button", { name: /确认创建/i }));

    expect(onCreateApiKey).toHaveBeenCalledWith("个人 CLI");
    expect(await screen.findByText(/只会显示一次/i)).toBeInTheDocument();
    expect(screen.getByText("wk_live_secret_123456", { selector: "code" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /我已安全保存/i })).toBeInTheDocument();
  });

  it("paginates api keys and omits per-row copy example actions", async () => {
    const user = userEvent.setup();
    const apiKeys = Array.from({ length: 6 }, (_, index) => ({
      id: `key-${index + 1}`,
      label: `脚本 ${index + 1}`,
      prefix: `wk_live_000${index + 1}`,
      createdAt: "2026-04-08T00:00:00.000Z",
      lastUsedAt: null,
      revokedAt: index === 4 ? "2026-05-08T00:00:00.000Z" : null
    }));

    renderWithRouter(
      <ApiKeysPage
        apiKeys={apiKeys}
        onCreateApiKey={vi.fn()}
        onRevokeApiKey={vi.fn()}
      />
    );

    expect(screen.queryByText("密钥总览")).not.toBeInTheDocument();
    expect(screen.queryByText("当前可用")).not.toBeInTheDocument();
    expect(screen.queryByText("待接入")).not.toBeInTheDocument();
    expect(screen.queryByText("不可用")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /复制示例/i })).not.toBeInTheDocument();
    expect(screen.getByText("wk_live_0001")).toBeInTheDocument();
    expect(screen.queryByText("wk_live_0006")).not.toBeInTheDocument();
    const recordList = document.querySelector(".api-keys-record-list");
    if (!recordList) throw new Error("api key record list missing");
    expect(within(recordList as HTMLElement).getAllByText("未使用")[0]).toHaveClass("api-keys-status-pill");
    expect(within(recordList as HTMLElement).getByText("已失效")).toHaveClass("api-keys-status-pill");
    expect(screen.getByRole("navigation", { name: /API 密钥分页/i })).toHaveClass("ui-pagination", "users-list-pagination");
    expect(screen.getByText("共 6 条")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "第 1 页" })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("button", { name: /下一页/i }));

    expect(screen.getByText("wk_live_0006")).toBeInTheDocument();
    expect(screen.queryByText("wk_live_0001")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "第 2 页" })).toHaveAttribute("aria-current", "page");
  });

  it("keeps api key status chips wide enough for Chinese labels", () => {
    const statusPillRule = getStyleRule(".api-keys-status-pill");
    const recordRowRule = getStyleRule(".api-keys-record-row");
    const topStatsRule = getStyleRule(".api-keys-top-stats");

    expect(statusPillRule).toContain("min-width: 76px");
    expect(statusPillRule).toContain("white-space: nowrap");
    expect(statusPillRule).toContain("word-break: keep-all");
    expect(statusPillRule).toContain("flex-shrink: 0");
    expect(recordRowRule).toContain("minmax(82px, auto)");
    expect(topStatsRule).toContain("grid-column: 1 / -1");
  });

  it("renders a webhook control-center scaffold instead of the old placeholder", () => {
    renderWithRouter(<WebhookPage />);

    expect(screen.getByRole("heading", { name: /事件订阅/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Payload 示例/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /投递日志/i })).toBeInTheDocument();
    expect(screen.getByText("尚未创建端点", { selector: "strong" })).toBeInTheDocument();
  });

  it("sends webhook test events through the API and reports the result with toast", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const requestUrl = String(url);
      if (requestUrl.includes("/api/webhook/endpoints?")) {
        return new Response(
          JSON.stringify({
            endpoints: [
              {
                id: "endpoint-1",
                name: "生产同步",
                url: "https://hooks.example.test/wemail",
                events: ["message.received"],
                signingSecret: "secret_123",
                enabled: true,
                createdAt: "2026-06-14T01:00:00.000Z",
                updatedAt: "2026-06-14T01:00:00.000Z"
              }
            ],
            page: 1,
            pageSize: 5,
            total: 1
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      if (requestUrl.includes("/api/webhook/deliveries")) {
        return new Response(JSON.stringify({ deliveries: [], page: 1, pageSize: 5, total: 0 }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (requestUrl.includes("/api/webhook/endpoints/endpoint-1/test") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            delivery: {
              id: "delivery-1",
              endpointId: "endpoint-1",
              eventType: "webhook.test",
              status: "success",
              statusCode: 202,
              durationMs: 48,
              errorText: null,
              payload: { eventType: "webhook.test" },
              createdAt: "2026-06-14T01:05:00.000Z"
            }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ error: `Unhandled ${requestUrl}` }), {
        status: 500,
        headers: { "content-type": "application/json" }
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithRouter(<WebhookPage />);

    expect(await screen.findAllByText("生产同步")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: /发送测试事件/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/webhook/endpoints/endpoint-1/test"),
        expect.objectContaining({ method: "POST" })
      );
    });
    expect(useAppStore.getState().toasts[0]?.message).toContain("测试事件已发送");
  });

  it("renders the telegram self-serve notification center and submits chat settings", async () => {
    const user = userEvent.setup();
    const onSaveTelegram = vi.fn().mockResolvedValue(undefined);
    const onSendTelegramTest = vi.fn().mockResolvedValue({
      attemptedAt: "2026-06-14T01:00:00.000Z",
      delivered: true,
      reason: null
    });
    const onCreateTelegramLinkCode = vi.fn().mockResolvedValue(telegramLinkCode);
    const onRefreshTelegram = vi.fn().mockResolvedValue(undefined);

    renderWithRouter(
      <TelegramSettingsPage
        deliveries={telegramDeliveries}
        overview={telegramOverview}
        onCreateTelegramLinkCode={onCreateTelegramLinkCode}
        onRefreshTelegram={onRefreshTelegram}
        onSaveTelegram={onSaveTelegram}
        onSendTelegramTest={onSendTelegramTest}
      />
    );

    expect(screen.getByRole("heading", { name: /Telegram 通知控制台/i })).toBeInTheDocument();
    expect(screen.getAllByText("绑定状态").length).toBeGreaterThan(0);
    expect(screen.getAllByText("已绑定").length).toBeGreaterThan(0);
    expect(screen.getAllByText("通知事件").length).toBeGreaterThan(0);
    expect(screen.getByText("4 项")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12345678")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /通知事件/i })).toBeInTheDocument();
    expect(screen.getByText("账号收到新邮件后发送 Telegram 提醒。")).toBeInTheDocument();
    expect(screen.getByText("邮件中识别到验证码或链接后发送 Telegram 提醒。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /最近投递/i })).toBeInTheDocument();
    expect(screen.getByText("telegram_api_failed")).toBeInTheDocument();
    expect(screen.queryByText("2026-06-14T01:00:00.000Z")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /打扰控制/i })).not.toBeInTheDocument();
    expect(screen.queryByText("预留")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /测试通知/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /绑定流程/i })).toBeInTheDocument();
    expect(screen.queryByText(/如何选择这三种接入/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /生成绑定码/i }));

    expect(onCreateTelegramLinkCode).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("/start wm_abcdefghijklmnop", { selector: "code" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /打开 Telegram 绑定/i })).toHaveAttribute(
      "href",
      "https://t.me/WeMailBot?start=wm_abcdefghijklmnop"
    );

    await user.click(screen.getByRole("button", { name: /刷新绑定状态/i }));
    expect(onRefreshTelegram).toHaveBeenCalledTimes(1);

    const testNotificationPanel = screen.getByRole("heading", { name: /测试通知/i }).closest("section");
    if (!testNotificationPanel) throw new Error("test notification panel missing");

    await user.click(within(testNotificationPanel).getByRole("button", { name: /发送测试通知/i }));
    expect(onSendTelegramTest).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/测试消息已发送/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/Chat ID/i));
    await user.type(screen.getByLabelText(/Chat ID/i), "87654321");

    expect(within(testNotificationPanel).getByRole("button", { name: /发送测试通知/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /保存 Telegram 设置/i }));

    expect(onSaveTelegram).toHaveBeenCalledWith({ chatId: "87654321", enabled: true });
  });

  it("renders telegram test-message backend errors in the validation panel", async () => {
    const user = userEvent.setup();
    const onSendTelegramTest = vi.fn().mockRejectedValue(new Error("Telegram subscription paused"));

    renderWithRouter(
      <TelegramSettingsPage
        deliveries={[]}
        overview={telegramOverview}
        onCreateTelegramLinkCode={vi.fn()}
        onRefreshTelegram={vi.fn()}
        onSaveTelegram={vi.fn()}
        onSendTelegramTest={onSendTelegramTest}
      />
    );

    const testNotificationPanel = screen.getByRole("heading", { name: /测试通知/i }).closest("section");
    if (!testNotificationPanel) throw new Error("test notification panel missing");

    await user.click(within(testNotificationPanel).getByRole("button", { name: /发送测试通知/i }));

    expect(onSendTelegramTest).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Telegram subscription paused/i)).toBeInTheDocument();
  });
});
