import { readFileSync } from "node:fs";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import {
  DEFAULT_API_KEY_SCOPES,
  type ApiKeyScope,
  type TelegramDeliverySummary,
  type TelegramLinkCodeSummary,
  type TelegramOverviewSummary
} from "@wemail/shared";

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
  it("shows API key loading and retryable failure states instead of an empty vault", () => {
    const onRetry = vi.fn();
    const { rerender } = renderWithRouter(
      <ApiKeysPage apiKeys={[]} isLoading onCreateApiKey={vi.fn()} onRevokeApiKey={vi.fn()} />
    );

    expect(screen.getByRole("status", { name: "正在加载 API 密钥" })).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <ApiKeysPage
          apiKeys={[]}
          errorMessage="Rate limit exceeded"
          onCreateApiKey={vi.fn()}
          onRetry={onRetry}
          onRevokeApiKey={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("region", { name: "API 密钥加载失败" })).toHaveTextContent("Rate limit exceeded");
    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens api key creation in a dialog and reveals the generated key after submit", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const onCreateApiKey = vi.fn().mockResolvedValue({
      key: { secret: "wk_live_secret_123456", prefix: "wk_live_abcd", scopes: [...DEFAULT_API_KEY_SCOPES] }
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });

    renderWithRouter(
      <ApiKeysPage
        apiKeys={[
          {
            id: "key-1",
            label: "本地脚本",
            prefix: "wk_live_1234",
            scopes: ["mail:read", "settings:read"],
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
    expect(screen.queryByRole("heading", { name: /密钥生命周期/i })).not.toBeInTheDocument();
    expect(screen.queryByText("凭证安全")).not.toBeInTheDocument();
    expect(screen.getByText("API密钥")).toHaveClass("panel-kicker");
    expect(screen.getByText("凭证库")).toHaveClass("panel-kicker");
    expect(screen.queryByText(/管理脚本、CLI 和外部系统访问 WeMail API/)).not.toBeInTheDocument();
    expect(screen.queryByText(/用用途命名密钥/)).not.toBeInTheDocument();
    expect(screen.getByText("总密钥")).toBeInTheDocument();
    expect(screen.getByText("活跃密钥")).toBeInTheDocument();
    expect(screen.getByText("从未使用")).toBeInTheDocument();
    expect(screen.getByText("已吊销")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /快速开始/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /安全建议/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/如何选择这三种接入/i)).not.toBeInTheDocument();
    const heroCard = document.querySelector(".api-keys-hero-card");
    const terminalCard = document.querySelector(".api-keys-terminal-card");
    const topStats = document.querySelector(".api-keys-top-stats");
    const vaultCard = document.querySelector(".api-keys-vault-card");
    expect(heroCard).not.toBeNull();
    expect(terminalCard).not.toBeNull();
    expect(topStats).not.toBeNull();
    expect(vaultCard).not.toBeNull();
    expect(heroCard).toContainElement(terminalCard as HTMLElement);
    expect(heroCard).toContainElement(topStats as HTMLElement);
    expect((terminalCard as HTMLElement).compareDocumentPosition(topStats as HTMLElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelector(".api-keys-credential-grid")).not.toBeNull();
    expect(document.querySelector(".api-keys-side-rail")).toBeNull();
    expect(within(vaultCard as HTMLElement).getByRole("button", { name: /创建密钥/i })).toBeInTheDocument();
    expect((vaultCard as HTMLElement).querySelector(".api-keys-record-name-line")).not.toBeNull();
    expect(screen.getByRole("button", { name: "展开调用示例" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Authorization Header")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /复制代码/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "展开调用示例" }));

    expect(screen.getByRole("button", { name: "收起调用示例" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Authorization Header")).toBeInTheDocument();
    expect(screen.getByText("curl 示例")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "复制 Authorization Header" }));

    expect(writeText).toHaveBeenCalledWith("Authorization: Bearer <your-api-key>");

    await user.click(screen.getByRole("button", { name: "复制 curl 示例" }));

    expect(writeText).toHaveBeenCalledWith('curl https://api.example.com/messages \\\n  -H "Authorization: Bearer <your-api-key>"');

    await user.click(screen.getByRole("button", { name: /创建密钥/i }));
    const createDialog = screen.getByRole("dialog", { name: /创建 API 密钥/i });
    expect(createDialog).toBeInTheDocument();
    expect(document.querySelector(".api-keys-create-panel")).toBeNull();
    expect(within(createDialog).getByRole("group", { name: "API 密钥权限范围" })).toBeInTheDocument();
    expect(within(createDialog).getByText("读取邮件", { selector: "strong" })).toBeInTheDocument();
    expect(within(createDialog).queryByText("管理员自动化", { selector: "strong" })).not.toBeInTheDocument();

    await user.type(within(createDialog).getByLabelText(/密钥名称/i), "个人 CLI");
    await user.click(within(createDialog).getByRole("button", { name: /确认创建/i }));

    expect(onCreateApiKey).toHaveBeenCalledWith("个人 CLI", [...DEFAULT_API_KEY_SCOPES]);
    expect(await screen.findByText(/只会显示一次/i)).toBeInTheDocument();
    expect(screen.getByText("wk_live_secret_123456", { selector: "code" })).toBeInTheDocument();
    expect(screen.getByText(/权限：读取邮件、发送邮件/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /我已安全保存/i })).toBeInTheDocument();
  });

  it("paginates api keys and omits per-row copy example actions", async () => {
    const user = userEvent.setup();
    const apiKeys = Array.from({ length: 6 }, (_, index) => ({
      id: `key-${index + 1}`,
      label: `脚本 ${index + 1}`,
      prefix: `wk_live_000${index + 1}`,
      scopes: (index % 2 === 0 ? ["mail:read"] : ["mail:send"]) as ApiKeyScope[],
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

  it("shows api key owners when an admin reviews the credential vault", () => {
    renderWithRouter(
      <ApiKeysPage
        apiKeys={[
          {
            id: "key-member",
            label: "成员脚本",
            owner: {
              id: "user-member",
              email: "member-long-address@example.com",
              name: "成员用户",
              role: "member",
              status: "active",
              createdAt: "2026-04-01T00:00:00.000Z",
              updatedAt: "2026-04-01T00:00:00.000Z"
            },
            prefix: "wk_live_member",
            scopes: ["mail:read", "settings:read"],
            createdAt: "2026-04-08T00:00:00.000Z",
            lastUsedAt: null,
            revokedAt: null
          }
        ]}
        currentUserRole="admin"
        onCreateApiKey={vi.fn()}
        onRevokeApiKey={vi.fn()}
      />
    );

    const recordList = document.querySelector(".api-keys-record-list");
    if (!recordList) throw new Error("api key record list missing");

    expect(within(recordList as HTMLElement).getByText("所属用户")).toBeInTheDocument();
    expect(within(recordList as HTMLElement).getByText("成员用户")).toBeInTheDocument();
    expect(within(recordList as HTMLElement).getByText("member-l...address@example.com")).toHaveClass("truncated-email");
    expect(within(recordList as HTMLElement).getByText("member-l...address@example.com")).toHaveAttribute(
      "title",
      "member-long-address@example.com"
    );
  });

  it("keeps api key status chips wide enough for Chinese labels", () => {
    const statusPillRule = getStyleRule(".api-keys-status-pill");
    const recordRowRule = getStyleRule(".api-keys-record-row");
    const topStatsRule = getStyleRule(".api-keys-top-stats");
    const credentialGridRule = getStyleRule(".api-keys-credential-grid");
    const terminalGridRule = getStyleRule(".api-keys-terminal-grid");
    const terminalToggleRule = getStyleRule(".api-keys-terminal-toggle");
    const vaultHeaderRule = getStyleRule(".api-keys-vault-header");
    const vaultSectionHeaderRule = getStyleRule(".api-keys-vault-header .api-keys-section-header");
    const vaultCopyRule = getStyleRule(".api-keys-vault-header .integration-card-copy");
    const codeSurfaceRule = getStyleRule(".api-keys-code-surface");
    const recordNameLineRule = getStyleRule(".api-keys-record-name-line");
    const scopeListRule = getStyleRule(".api-keys-scope-list");
    const scopeChipRule = getStyleRule(".api-keys-scope-list span");

    expect(statusPillRule).toContain("min-width: 76px");
    expect(statusPillRule).toContain("white-space: nowrap");
    expect(statusPillRule).toContain("word-break: keep-all");
    expect(statusPillRule).toContain("flex-shrink: 0");
    expect(recordRowRule).toContain("minmax(92px, auto)");
    expect(topStatsRule).toContain("grid-column: 1 / -1");
    expect(credentialGridRule).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(terminalGridRule).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(terminalToggleRule).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(vaultHeaderRule).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(vaultSectionHeaderRule).toContain("align-items: center");
    expect(vaultCopyRule).toContain("align-content: center");
    expect(vaultCopyRule).toContain("min-height: 40px");
    expect(codeSurfaceRule).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(recordNameLineRule).toContain("display: flex");
    expect(recordNameLineRule).toContain("align-items: center");
    expect(scopeListRule).toContain("grid-template-columns: repeat(2, max-content)");
    expect(scopeListRule).toContain("justify-content: start");
    expect(scopeChipRule).toContain("justify-self: start");
  });

  it("renders a webhook control-center scaffold instead of the old placeholder", async () => {
    const user = userEvent.setup();
    renderWithRouter(<WebhookPage />);

    expect(screen.queryByRole("heading", { name: /事件订阅/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /通知规则/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /开发者参考/i })).toBeInTheDocument();
    expect(screen.getByText("Webhook", { selector: ".panel-kicker" })).toBeInTheDocument();
    expect(screen.getByText("端点列表", { selector: ".panel-kicker" })).toBeInTheDocument();
    expect(screen.getByText("规则引擎", { selector: ".panel-kicker" })).toBeInTheDocument();
    expect(screen.getByText("运行观察", { selector: ".panel-kicker" })).toBeInTheDocument();
    expect(screen.queryByText("端点配置", { selector: ".panel-kicker" })).not.toBeInTheDocument();
    expect(screen.queryByText(/把收件、提取、通知和安全事件/)).not.toBeInTheDocument();
    expect(screen.queryByText(/按目标、事件、邮箱、关键词和静默时间控制/)).not.toBeInTheDocument();
    expect(screen.queryByText(/按当前端点查看投递状态/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "展开开发者参考" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Payload 示例与签名校验")).not.toBeInTheDocument();
    expect(screen.queryByText(/Secret 不会明文放进 Header/)).not.toBeInTheDocument();
    expect(screen.queryByText("Signing Secret")).not.toBeInTheDocument();
    expect(screen.queryByText("Headers")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /投递日志/i })).toBeInTheDocument();
    expect(screen.getByText("尚未创建端点", { selector: "strong" })).toBeInTheDocument();

    const heroCard = document.querySelector(".webhook-page-grid > .webhook-hero-card");
    const referenceCard = document.querySelector(".webhook-hero-reference-card");
    const overviewGrid = document.querySelector(".webhook-overview-grid");
    expect(heroCard).not.toBeNull();
    expect(referenceCard).not.toBeNull();
    expect(overviewGrid).not.toBeNull();
    expect(heroCard).toContainElement(referenceCard as HTMLElement);
    expect(referenceCard?.compareDocumentPosition(overviewGrid as Element)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(document.querySelector(".integration-primary-column > .webhook-reference-card")).toBeNull();
    expect(document.querySelector(".webhook-side-column")).toBeNull();
    expect(document.querySelector(".webhook-workbench-card .webhook-section-title-kicker")).not.toBeNull();
    expect(document.querySelector(".webhook-rule-card .webhook-section-title-kicker")).not.toBeNull();
    expect(document.querySelector(".webhook-delivery-card .webhook-section-title-kicker")).not.toBeNull();
    expect(screen.getByRole("button", { name: "新增端点" }).closest(".webhook-workbench-card")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "展开开发者参考" }));

    expect(screen.getByRole("button", { name: "收起开发者参考" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Signing Secret")).toBeInTheDocument();
    expect(screen.getAllByText(/不会明文放进 Header/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Headers")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Signature Verify")).toBeInTheDocument();
  });

  it("keeps the webhook hero and developer reference layout aligned", () => {
    const pageRule = getStyleRule(".webhook-page-grid");
    const primaryColumnRule = getStyleRule(".webhook-page-grid > .integration-primary-column");
    const heroRule = getStyleRule(".webhook-hero-card");
    const overviewRule = getStyleRule(".webhook-overview-grid");
    const sectionTitleKickerRule = getStyleRule(".webhook-section-title-kicker");
    const kickerOnlyRule = getStyleRule(".webhook-kicker-only");
    const workbenchActionsRule = getStyleRule(".webhook-workbench-actions");
    const endpointRowRule = getStyleRule(".webhook-endpoint-row");
    const endpointMainRule = getStyleRule(".webhook-endpoint-main");
    const endpointMetaRule = getStyleRule(".webhook-endpoint-meta");
    const endpointActionsRule = getStyleRule(".webhook-endpoint-actions");
    const endpointEventsRule = getStyleRule(".webhook-endpoint-events");
    const referenceToggleRule = getStyleRule(".webhook-reference-toggle");
    const referenceGridRule = getStyleRule(".webhook-hero-reference-card .webhook-reference-grid");
    const signaturePanelRule = getStyleRule(".webhook-signature-panel");
    const secretPanelRule = getStyleRule(".webhook-signature-panel .webhook-secret-panel");

    expect(pageRule).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(primaryColumnRule).toContain("grid-column: 1 / -1");
    expect(heroRule).toContain("grid-column: 1 / -1");
    expect(overviewRule).toContain("grid-template-columns: repeat(5, minmax(0, 1fr))");
    expect(sectionTitleKickerRule).toContain("align-items: center");
    expect(kickerOnlyRule).toContain("align-content: center");
    expect(kickerOnlyRule).toContain("min-height: 38px");
    expect(workbenchActionsRule).toContain("justify-content: flex-end");
    expect(endpointRowRule).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(endpointMainRule).toContain("grid-template-columns: minmax(0, 1fr) auto auto");
    expect(endpointMainRule).toContain("align-items: center");
    expect(endpointMetaRule).toContain("display: flex");
    expect(endpointActionsRule).toContain("justify-content: flex-end");
    expect(endpointEventsRule).toContain("grid-column: 1 / -1");
    expect(referenceToggleRule).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(referenceGridRule).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(signaturePanelRule).toContain("grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.2fr)");
    expect(secretPanelRule).toContain("grid-template-columns: minmax(0, 1fr) auto auto");
  });

  it("creates notification rules from the webhook page", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const requestUrl = String(url);
      if (requestUrl.includes("/api/webhook/endpoints?")) {
        return new Response(JSON.stringify({ endpoints: [], page: 1, pageSize: 5, total: 0 }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (requestUrl.includes("/api/webhook/deliveries")) {
        return new Response(JSON.stringify({ deliveries: [], page: 1, pageSize: 5, total: 0 }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (requestUrl.endsWith("/api/notification/rules") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            rule: {
              id: "rule-1",
              name: "验证码通知",
              enabled: true,
              target: "webhook",
              targetId: null,
              eventTypes: ["message.received"],
              mailboxIds: [],
              keyword: "code",
              quietHoursStart: "",
              quietHoursEnd: "",
              createdAt: "2026-06-14T01:05:00.000Z",
              updatedAt: "2026-06-14T01:05:00.000Z"
            }
          }),
          { status: 201, headers: { "content-type": "application/json" } }
        );
      }
      if (requestUrl.endsWith("/api/notification/rules")) {
        return new Response(JSON.stringify({ rules: [] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ error: `Unhandled ${requestUrl}` }), {
        status: 500,
        headers: { "content-type": "application/json" }
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithRouter(<WebhookPage />);

    await user.type(await screen.findByLabelText("通知规则名称"), "验证码通知");
    await user.type(screen.getByLabelText("通知规则关键词"), "code");
    await user.click(screen.getByRole("button", { name: /保存规则/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/notification/rules"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"keyword":"code"')
        })
      );
    });
    expect(screen.getByText("验证码通知")).toBeInTheDocument();
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
                events: ["message.received", "message.extracted"],
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

    expect(await screen.findByText("生产同步")).toBeInTheDocument();
    const endpointRow = screen.getByText("https://hooks.example.test/wemail").closest(".webhook-endpoint-row");
    expect(endpointRow).not.toBeNull();
    expect(within(endpointRow as HTMLElement).getByText("2 项事件")).toBeInTheDocument();
    expect(within(endpointRow as HTMLElement).getByText(/更新于/)).toBeInTheDocument();
    expect(within(endpointRow as HTMLElement).getByRole("button", { name: "展开 生产同步 订阅事件" })).toHaveAttribute("aria-expanded", "false");
    expect(within(endpointRow as HTMLElement).queryByText("message.received")).not.toBeInTheDocument();
    expect(within(endpointRow as HTMLElement).getByRole("button", { name: "编辑 生产同步" })).toBeInTheDocument();
    expect(within(endpointRow as HTMLElement).getByRole("button", { name: "暂停 生产同步" })).toBeInTheDocument();
    expect(within(endpointRow as HTMLElement).getByRole("button", { name: "删除 生产同步" })).toBeInTheDocument();

    await user.click(within(endpointRow as HTMLElement).getByRole("button", { name: "展开 生产同步 订阅事件" }));

    expect(within(endpointRow as HTMLElement).getByRole("button", { name: "收起 生产同步 订阅事件" })).toHaveAttribute("aria-expanded", "true");
    expect(within(endpointRow as HTMLElement).getByText("新邮件到达")).toBeInTheDocument();
    expect(within(endpointRow as HTMLElement).getByText("message.received")).toBeInTheDocument();
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
        canConfigureBotMenu={false}
        deliveries={telegramDeliveries}
        overview={telegramOverview}
        onConfigureBotMenu={vi.fn()}
        onConfigureWebhook={vi.fn()}
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
    const telegramPrimaryColumn = screen.getByRole("heading", { name: /Telegram 通知控制台/i }).closest(".telegram-primary-column");
    expect(telegramPrimaryColumn).not.toBeNull();
    expect(within(telegramPrimaryColumn as HTMLElement).getByRole("heading", { name: /最近投递/i })).toBeInTheDocument();
    expect(getStyleRule(".telegram-control-grid")).toContain('grid-template-areas: "primary side"');
    expect(getStyleRule(".telegram-primary-column")).toContain("gap: 16px");

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

  it("lets admins configure the telegram bot menu from the page", async () => {
    const user = userEvent.setup();
    const onConfigureBotMenu = vi.fn().mockResolvedValue(undefined);
    const onConfigureWebhook = vi.fn().mockResolvedValue({
      ok: true,
      reason: null,
      url: "https://api.example.com/api/telegram/webhook",
      allowedUpdates: ["message", "channel_post"]
    });

    renderWithRouter(
      <TelegramSettingsPage
        canConfigureBotMenu
        deliveries={telegramDeliveries}
        overview={telegramOverview}
        onConfigureBotMenu={onConfigureBotMenu}
        onConfigureWebhook={onConfigureWebhook}
        onCreateTelegramLinkCode={vi.fn()}
        onRefreshTelegram={vi.fn()}
        onSaveTelegram={vi.fn()}
        onSendTelegramTest={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /配置 Webhook/i }));
    expect(onConfigureWebhook).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Webhook 已配置：https:\/\/api\.example\.com\/api\/telegram\/webhook/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /配置 Bot 菜单/i }));

    expect(onConfigureBotMenu).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Bot 菜单已配置/i)).toBeInTheDocument();
  });

  it("hides the telegram bot menu action from non-admin users", () => {
    renderWithRouter(
      <TelegramSettingsPage
        canConfigureBotMenu={false}
        deliveries={telegramDeliveries}
        overview={telegramOverview}
        onConfigureBotMenu={vi.fn()}
        onConfigureWebhook={vi.fn()}
        onCreateTelegramLinkCode={vi.fn()}
        onRefreshTelegram={vi.fn()}
        onSaveTelegram={vi.fn()}
        onSendTelegramTest={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /配置 Bot 菜单/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /配置 Webhook/i })).not.toBeInTheDocument();
  });

  it("renders telegram test-message backend errors in the validation panel", async () => {
    const user = userEvent.setup();
    const onSendTelegramTest = vi.fn().mockRejectedValue(new Error("Telegram subscription paused"));

    renderWithRouter(
      <TelegramSettingsPage
        canConfigureBotMenu={false}
        deliveries={[]}
        overview={telegramOverview}
        onConfigureBotMenu={vi.fn()}
        onConfigureWebhook={vi.fn()}
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
