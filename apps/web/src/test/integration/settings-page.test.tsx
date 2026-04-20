import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

import { ApiKeysPage } from "../../features/settings/ApiKeysPage";
import { TelegramSettingsPage } from "../../features/settings/TelegramSettingsPage";
import { WebhookPage } from "../../features/settings/WebhookPage";

function renderWithRouter(element: ReactElement) {
  return render(<MemoryRouter>{element}</MemoryRouter>);
}

describe("settings pages", () => {
  afterEach(() => {
    cleanup();
  });

  it("reveals a newly created api key inside the new top-stats layout", async () => {
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
    expect(screen.getByText("总密钥")).toBeInTheDocument();
    expect(screen.getByText("活跃密钥")).toBeInTheDocument();
    expect(screen.getByText("从未使用")).toBeInTheDocument();
    expect(screen.getByText("已吊销")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /快速开始/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /安全建议/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/如何选择这三种接入/i)).not.toBeInTheDocument();
    expect(document.querySelector(".api-keys-top-stats")).not.toBeNull();
    expect(document.querySelector(".api-keys-content-grid")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: /创建密钥/i }));
    await user.type(screen.getByLabelText(/密钥名称/i), "个人 CLI");
    await user.click(screen.getByRole("button", { name: /确认创建/i }));

    expect(onCreateApiKey).toHaveBeenCalledWith("个人 CLI");
    expect(await screen.findByText(/只会显示一次/i)).toBeInTheDocument();
    expect(screen.getByText("wk_live_secret_123456", { selector: "code" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /我已安全保存/i })).toBeInTheDocument();
  });

  it("renders a webhook control-center scaffold instead of the old placeholder", () => {
    renderWithRouter(<WebhookPage />);

    expect(screen.getByRole("heading", { name: /事件订阅/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Payload 示例/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /投递日志/i })).toBeInTheDocument();
    expect(screen.getByText("接口即将开放", { selector: "strong" })).toBeInTheDocument();
  });

  it("renders the telegram self-serve notification center and submits chat settings", async () => {
    const user = userEvent.setup();
    const onSaveTelegram = vi.fn().mockResolvedValue(undefined);

    renderWithRouter(
      <TelegramSettingsPage telegram={{ chatId: "12345678", enabled: true }} onSaveTelegram={onSaveTelegram} />
    );

    expect(screen.getByDisplayValue("12345678")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /通知偏好/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /打扰控制/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /测试通知/i })).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/Chat ID/i));
    await user.type(screen.getByLabelText(/Chat ID/i), "87654321");
    await user.click(screen.getByRole("button", { name: /保存 Telegram 设置/i }));

    expect(onSaveTelegram).toHaveBeenCalledWith({ chatId: "87654321", enabled: true });
  });
});
