import { afterEach, describe, expect, it, vi } from "vitest";

import { configureTelegramBotMenu, configureTelegramWebhook, createTelegramLinkCode } from "../features/settings/api";
import { querySettingsData } from "../features/settings/queries";
import { jsonResponse } from "./helpers/mock-api";

describe("settings queries", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads telegram overview state from the backend", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/api-keys")) return jsonResponse({ keys: [] });
      if (url.includes("/api/dictionaries")) {
        return jsonResponse({
          dictionaries: [
            {
              groupKey: "user.role",
              label: "用户角色",
              description: null,
              isSystem: true,
              version: 1,
              items: []
            }
          ]
        });
      }
      if (url.endsWith("/api/telegram/deliveries")) return jsonResponse({ deliveries: [] });
      if (url.endsWith("/api/telegram/overview")) {
        return jsonResponse({
          overview: {
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
              }
            ]
          }
        });
      }
      return jsonResponse({ error: "unexpected" }, 500);
    });

    const data = await querySettingsData();

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/api/telegram/overview",
      expect.objectContaining({ credentials: "include" })
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("http://127.0.0.1:8787/api/dictionaries"),
      expect.objectContaining({ credentials: "include" })
    );
    expect(data.dictionaries?.[0]?.groupKey).toBe("user.role");
    expect(data.telegramOverview).toMatchObject({
      botConfigured: true,
      subscription: {
        chatId: "12345678"
      }
    });
    expect(data.telegramDeliveries).toEqual([]);
  });

  it("falls back to an empty telegram overview when the backend omits it", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/api-keys")) return jsonResponse({ keys: [] });
      if (url.includes("/api/dictionaries")) return jsonResponse({});
      if (url.endsWith("/api/telegram/overview")) return jsonResponse({});
      if (url.endsWith("/api/telegram/deliveries")) {
        return jsonResponse({
          deliveries: [
            {
              id: "delivery-1",
              eventId: "telegram.test",
              label: "测试通知",
              delivered: false,
              reason: "telegram_api_failed",
              chatId: "12345678",
              createdAt: "2026-06-14T01:00:00.000Z"
            }
          ]
        });
      }
      return jsonResponse({ error: "unexpected" }, 500);
    });

    const data = await querySettingsData();

    expect(data.telegramOverview).toEqual({
      botConfigured: false,
      canSendTest: false,
      featureEnabled: false,
      subscription: null,
      supportedEvents: []
    });
    expect(data.telegramDeliveries).toEqual([
      expect.objectContaining({
        eventId: "telegram.test",
        delivered: false,
        reason: "telegram_api_failed"
      })
    ]);
    expect(data.dictionaries).toEqual([]);
  });

  it("skips settings domains that are not requested", async () => {
    const requestedUrls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.endsWith("/api/api-keys")) return jsonResponse({ keys: [] });
      return jsonResponse({ error: "unexpected" }, 500);
    });

    const data = await querySettingsData({
      includeApiKeys: true,
      includeDictionaries: false,
      includeRuntimeSettings: false,
      includeTelegram: false
    });

    expect(data.apiKeys).toEqual([]);
    expect(data.telegramOverview).toBeUndefined();
    expect(requestedUrls.some((url) => url.endsWith("/api/api-keys"))).toBe(true);
    expect(requestedUrls.some((url) => url.includes("/api/telegram/"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("/api/dictionaries"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("/api/system/runtime-settings"))).toBe(false);
  });

  it("keeps successful settings data when one optional system endpoint fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/api-keys")) return jsonResponse({ keys: [{ id: "key-1", label: "Deploy key" }] });
      if (url.endsWith("/api/system/maturity")) return jsonResponse({ error: "query failed" }, 500);
      return jsonResponse({});
    });

    const data = await querySettingsData({
      includeApiKeys: true,
      includeDictionaries: false,
      includeSystemMaturity: true,
      includeTelegram: false
    });

    expect(data.apiKeys).toEqual([expect.objectContaining({ id: "key-1", label: "Deploy key" })]);
    expect(data.systemMaturity).toBeUndefined();
  });

  it("creates a telegram one-time link code through the backend", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      jsonResponse({
        link: {
          code: "wm_abcdefghijklmnop",
          deepLinkUrl: "https://t.me/WeMailBot?start=wm_abcdefghijklmnop",
          expiresAt: "2026-06-14T01:15:00.000Z",
          startCommand: "/start wm_abcdefghijklmnop"
        }
      })
    );

    const payload = await createTelegramLinkCode();

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/api/telegram/link-code",
      expect.objectContaining({
        credentials: "include",
        method: "POST"
      })
    );
    expect(payload.link).toMatchObject({
      code: "wm_abcdefghijklmnop",
      startCommand: "/start wm_abcdefghijklmnop"
    });
  });

  it("configures the telegram bot menu through the backend", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      jsonResponse({
        result: {
          ok: true,
          reason: null,
          commands: [{ command: "status", description: "查看账号与邮件状态" }]
        }
      })
    );

    const payload = await configureTelegramBotMenu();

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/api/telegram/bot-menu",
      expect.objectContaining({
        credentials: "include",
        method: "POST"
      })
    );
    expect(payload.result.commands).toContainEqual(expect.objectContaining({ command: "status" }));
  });

  it("configures the telegram webhook through the backend", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      jsonResponse({
        result: {
          ok: true,
          reason: null,
          url: "https://api.example.com/api/telegram/webhook",
          allowedUpdates: ["message", "channel_post"]
        }
      })
    );

    const payload = await configureTelegramWebhook();

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/api/telegram/webhook/configure",
      expect.objectContaining({
        credentials: "include",
        method: "POST"
      })
    );
    expect(payload.result.url).toBe("https://api.example.com/api/telegram/webhook");
  });
});
