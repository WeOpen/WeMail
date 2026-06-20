import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultMailSettings } from "@wemail/shared";

import { registerUserAndGetCookie } from "../helpers/test-env";

describe("worker settings integration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lets a session-authenticated user read and update their own profile settings", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie({
      email: "profile@example.com",
      inviteCode: "INVITE-PROFILE-1"
    });

    const initialResponse = await app.request(
      "/api/profile",
      {
        headers: { cookie }
      },
      env
    );
    const initialPayload = (await initialResponse.json()) as {
      profile: {
        user: { email: string };
        preferences: { bio: string; locale: string; timezone: string; landingPage: string; density: string };
      };
    };

    expect(initialResponse.status).toBe(200);
    expect(initialPayload.profile.user.email).toBe("profile@example.com");
    expect(initialPayload.profile.preferences).toMatchObject({
      bio: "",
      locale: "zh-CN",
      timezone: "Asia/Shanghai",
      landingPage: "/dashboard",
      density: "comfortable"
    });

    const updateResponse = await app.request(
      "/api/profile",
      {
        method: "PATCH",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: "Profile Owner",
          preferences: {
            bio: "Owns disposable mail operations",
            locale: "en-US",
            timezone: "Asia/Tokyo",
            dateFormat: "dd-mm-yyyy",
            landingPage: "/mail/list",
            density: "compact"
          }
        })
      },
      env
    );
    const updatePayload = (await updateResponse.json()) as {
      profile: { user: { name: string }; preferences: { bio: string; locale: string; density: string } };
    };

    expect(updateResponse.status).toBe(200);
    expect(updatePayload.profile.user.name).toBe("Profile Owner");
    expect(updatePayload.profile.preferences).toMatchObject({
      bio: "Owns disposable mail operations",
      locale: "en-US",
      density: "compact"
    });

    const sessionResponse = await app.request(
      "/api/auth/session",
      {
        headers: { cookie }
      },
      env
    );
    const sessionPayload = (await sessionResponse.json()) as { user: { name: string } };

    expect(sessionPayload.user.name).toBe("Profile Owner");
  });

  it("creates and revokes an api key from a session-authenticated request", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie({
      email: "member@example.com",
      inviteCode: "INVITE-SETTINGS-1"
    });

    const createResponse = await app.request(
      "/api/api-keys",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ label: "CLI key" })
      },
      env
    );

    expect(createResponse.status).toBe(201);

    const listResponse = await app.request(
      "/api/api-keys",
      {
        headers: { cookie }
      },
      env
    );

    const listPayload = (await listResponse.json()) as {
      keys: Array<{ id: string; label: string }>;
    };

    expect(listPayload.keys).toHaveLength(1);
    expect(listPayload.keys[0].label).toBe("CLI key");

    const revokeResponse = await app.request(
      `/api/api-keys/${listPayload.keys[0].id}`,
      {
        method: "DELETE",
        headers: { cookie }
      },
      env
    );

    expect(revokeResponse.status).toBe(200);
  });

  it("enforces the per-user daily API call limit for API key requests", async () => {
    const { app, env, cookie, store } = await registerUserAndGetCookie({
      email: "api-limit@example.com",
      inviteCode: "INVITE-API-LIMIT"
    });
    const user = await store.users.findByEmail("api-limit@example.com");
    expect(user).not.toBeNull();
    if (!user) return;

    await store.quotas.save({
      userId: user.id,
      dailyLimit: 20,
      sendsToday: 0,
      apiDailyLimit: 1,
      apiCallsToday: 0,
      disabled: false,
      updatedAt: new Date().toISOString()
    });

    const createResponse = await app.request(
      "/api/api-keys",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ label: "Limited key" })
      },
      env
    );
    const createPayload = (await createResponse.json()) as { key: { secret: string } };

    const firstResponse = await app.request(
      "/api/api-keys",
      {
        headers: { authorization: `Bearer ${createPayload.key.secret}` }
      },
      env
    );
    const secondResponse = await app.request(
      "/api/api-keys",
      {
        headers: { authorization: `Bearer ${createPayload.key.secret}` }
      },
      env
    );

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(429);
    expect(await secondResponse.json()).toMatchObject({ error: "API daily call limit exceeded" });
  });

  it("allows only one concurrent API key request when one daily call remains", async () => {
    const { app, env, cookie, store } = await registerUserAndGetCookie({
      email: "api-concurrency@example.com",
      inviteCode: "INVITE-API-CONCURRENCY"
    });
    const user = await store.users.findByEmail("api-concurrency@example.com");
    expect(user).not.toBeNull();
    if (!user) return;

    await store.quotas.save({
      userId: user.id,
      dailyLimit: 20,
      sendsToday: 0,
      apiDailyLimit: 1,
      apiCallsToday: 0,
      disabled: false,
      updatedAt: new Date().toISOString()
    });

    const createResponse = await app.request(
      "/api/api-keys",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ label: "Concurrent key" })
      },
      env
    );
    const createPayload = (await createResponse.json()) as { key: { secret: string } };

    const responses = await Promise.all([
      app.request("/api/api-keys", { headers: { authorization: `Bearer ${createPayload.key.secret}` } }, env),
      app.request("/api/api-keys", { headers: { authorization: `Bearer ${createPayload.key.secret}` } }, env)
    ]);
    const statuses = responses.map((response) => response.status).sort();

    expect(statuses).toEqual([200, 429]);
  });

  it("returns real telegram capability state for the current user", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie({
      email: "telegram-overview@example.com",
      inviteCode: "INVITE-TELEGRAM-OVERVIEW"
    });

    const saveResponse = await app.request(
      "/api/telegram/subscription",
      {
        method: "PUT",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ chatId: "12345678", enabled: true })
      },
      env
    );

    expect(saveResponse.status).toBe(200);

    const overviewResponse = await app.request(
      "/api/telegram/overview",
      {
        headers: { cookie }
      },
      {
        ...env,
        TELEGRAM_BOT_TOKEN: "test-token"
      }
    );
    expect(overviewResponse.status).toBe(200);
    const overviewPayload = (await overviewResponse.json()) as {
      overview: {
        botConfigured: boolean;
        canSendTest: boolean;
        featureEnabled: boolean;
        subscription: { chatId: string; enabled: boolean; updatedAt: string } | null;
        supportedEvents: Array<{ id: string; enabled: boolean }>;
      };
    };

    expect(overviewPayload.overview).toMatchObject({
      botConfigured: true,
      canSendTest: true,
      featureEnabled: true,
      subscription: {
        chatId: "12345678",
        enabled: true
      }
    });
    expect(overviewPayload.overview.subscription?.updatedAt).toEqual(expect.any(String));
    expect(overviewPayload.overview.supportedEvents).toContainEqual(
      expect.objectContaining({ id: "message.received", enabled: true })
    );
    expect(overviewPayload.overview.supportedEvents).toContainEqual(
      expect.objectContaining({ id: "message.extraction.detected", enabled: true })
    );
    expect(overviewPayload.overview.supportedEvents).toContainEqual(
      expect.objectContaining({ id: "api_key.created", enabled: true })
    );
  });

  it("binds telegram chat automatically from a one-time start code", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { app, env, cookie, store } = await registerUserAndGetCookie({
      email: "telegram-link@example.com",
      inviteCode: "INVITE-TELEGRAM-LINK"
    });
    const user = await store.users.findByEmail("telegram-link@example.com");
    expect(user).not.toBeNull();

    const codeResponse = await app.request(
      "/api/telegram/link-code",
      {
        method: "POST",
        headers: { cookie }
      },
      {
        ...env,
        TELEGRAM_BOT_USERNAME: "WeMailBot"
      }
    );
    expect(codeResponse.status).toBe(200);
    const codePayload = (await codeResponse.json()) as {
      link: { code: string; deepLinkUrl: string | null; expiresAt: string; startCommand: string };
    };

    expect(codePayload.link.code).toMatch(/^wm_[a-z0-9]{16}$/);
    expect(codePayload.link.startCommand).toBe(`/start ${codePayload.link.code}`);
    expect(codePayload.link.deepLinkUrl).toBe(`https://t.me/WeMailBot?start=${codePayload.link.code}`);
    expect(codePayload.link.expiresAt).toEqual(expect.any(String));

    const webhookResponse = await app.request(
      "/api/telegram/webhook",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          update_id: 1000,
          message: {
            text: codePayload.link.startCommand,
            chat: { id: 99887766 }
          }
        })
      },
      {
        ...env,
        TELEGRAM_BOT_TOKEN: "test-token"
      }
    );
    expect(webhookResponse.status).toBe(200);
    const webhookPayload = (await webhookResponse.json()) as { result: { ok: boolean; chatId: string } };

    expect(webhookPayload.result).toMatchObject({ ok: true, chatId: "99887766" });
    await expect(store.telegram.findByUserId(user!.id)).resolves.toMatchObject({
      chatId: "99887766",
      enabled: true
    });

    const sendMessageBodies = fetchMock.mock.calls
      .filter(([url]) => String(url).endsWith("/sendMessage"))
      .map(([, init]) => JSON.parse(String((init as RequestInit).body)));
    expect(sendMessageBodies).toEqual([
      expect.objectContaining({
        chat_id: "99887766",
        text: expect.stringContaining("Telegram 已绑定")
      })
    ]);

    const reuseResponse = await app.request(
      "/api/telegram/webhook",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          update_id: 1001,
          message: {
            text: codePayload.link.startCommand,
            chat: { id: 11223344 }
          }
        })
      },
      env
    );
    const reusePayload = (await reuseResponse.json()) as { result: { ok: boolean; reason: string } };

    expect(reuseResponse.status).toBe(200);
    expect(reusePayload.result).toMatchObject({ ok: false, reason: "link_code_consumed" });
    await expect(store.telegram.findByUserId(user!.id)).resolves.toMatchObject({ chatId: "99887766" });
  });

  it("rejects telegram webhook calls with an invalid secret token", async () => {
    const { app, env } = await registerUserAndGetCookie({
      email: "telegram-secret@example.com",
      inviteCode: "INVITE-TELEGRAM-SECRET"
    });

    const response = await app.request(
      "/api/telegram/webhook",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-bot-api-secret-token": "wrong-secret"
        },
        body: JSON.stringify({
          message: {
            text: "/start wm_abcdefghijklmnop",
            chat: { id: 12345678 }
          }
        })
      },
      {
        ...env,
        TELEGRAM_WEBHOOK_SECRET: "expected-secret"
      }
    );
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(payload.error).toMatch(/secret/i);
  });

  it("rejects enabled telegram subscriptions when the configured bot cannot access the chat", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: false, description: "Bad Request: chat not found" }), { status: 400 })
    );
    vi.stubGlobal("fetch", fetchMock);
    const { app, env, cookie, store } = await registerUserAndGetCookie({
      email: "telegram-invalid-chat@example.com",
      inviteCode: "INVITE-TELEGRAM-INVALID"
    });

    const response = await app.request(
      "/api/telegram/subscription",
      {
        method: "PUT",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ chatId: "missing-chat", enabled: true })
      },
      {
        ...env,
        TELEGRAM_BOT_TOKEN: "test-token"
      }
    );

    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/chat/i);
    expect(await store.telegram.findByUserId((await store.users.findByEmail("telegram-invalid-chat@example.com"))!.id)).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.telegram.org/bottest-token/getChat",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("missing-chat")
      })
    );
  });

  it("sends a telegram test message through the configured bot", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { app, env, cookie } = await registerUserAndGetCookie({
      email: "telegram-test@example.com",
      inviteCode: "INVITE-TELEGRAM-TEST"
    });

    await app.request(
      "/api/telegram/subscription",
      {
        method: "PUT",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ chatId: "87654321", enabled: true })
      },
      env
    );

    const response = await app.request(
      "/api/telegram/test-message",
      {
        method: "POST",
        headers: { cookie }
      },
      {
        ...env,
        TELEGRAM_BOT_TOKEN: "test-token"
      }
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      result: { delivered: boolean; reason: string | null };
    };

    expect(payload.result).toMatchObject({ delivered: true, reason: null });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.telegram.org/bottest-token/sendMessage",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("87654321")
      })
    );
  });

  it("lists recent telegram delivery records for the current user", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { app, env, cookie } = await registerUserAndGetCookie({
      email: "telegram-deliveries@example.com",
      inviteCode: "INVITE-TELEGRAM-DELIVERIES"
    });

    await app.request(
      "/api/telegram/subscription",
      {
        method: "PUT",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ chatId: "87654321", enabled: true })
      },
      env
    );

    await app.request(
      "/api/telegram/test-message",
      {
        method: "POST",
        headers: { cookie }
      },
      {
        ...env,
        TELEGRAM_BOT_TOKEN: "test-token"
      }
    );

    const response = await app.request("/api/telegram/deliveries", { headers: { cookie } }, env);
    const payload = (await response.json()) as {
      deliveries: Array<{ eventId: string; delivered: boolean; reason: string | null; createdAt: string }>;
    };

    expect(response.status).toBe(200);
    expect(payload.deliveries).toEqual([
      expect.objectContaining({
        eventId: "telegram.test",
        delivered: true,
        reason: null,
        createdAt: expect.any(String)
      })
    ]);
  });

  it("sends telegram notifications for api key security events", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { app, env, cookie, store } = await registerUserAndGetCookie({
      email: "telegram-api-key@example.com",
      inviteCode: "INVITE-TELEGRAM-API-KEY"
    });
    const user = await store.users.findByEmail("telegram-api-key@example.com");
    expect(user).not.toBeNull();
    await store.telegram.upsert({ userId: user!.id, chatId: "12345678", enabled: true });

    const createResponse = await app.request(
      "/api/api-keys",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ label: "CI bot" })
      },
      {
        ...env,
        TELEGRAM_BOT_TOKEN: "test-token"
      }
    );
    expect(createResponse.status).toBe(201);
    const keyPayload = (await createResponse.json()) as { key: { id: string } };

    const revokeResponse = await app.request(
      `/api/api-keys/${keyPayload.key.id}`,
      {
        method: "DELETE",
        headers: { cookie }
      },
      {
        ...env,
        TELEGRAM_BOT_TOKEN: "test-token"
      }
    );
    expect(revokeResponse.status).toBe(200);

    const sendMessageBodies = fetchMock.mock.calls
      .filter(([url]) => String(url).endsWith("/sendMessage"))
      .map(([, init]) => JSON.parse(String((init as RequestInit).body)));

    expect(sendMessageBodies).toHaveLength(2);
    expect(sendMessageBodies[0].text).toContain("API key created");
    expect(sendMessageBodies[0].text).toContain("CI bot");
    expect(sendMessageBodies[1].text).toContain("API key revoked");
  });

  it("does not send a telegram test message when the subscription is paused", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { app, env, cookie } = await registerUserAndGetCookie({
      email: "telegram-paused@example.com",
      inviteCode: "INVITE-TELEGRAM-PAUSED"
    });

    await app.request(
      "/api/telegram/subscription",
      {
        method: "PUT",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ chatId: "87654321", enabled: false })
      },
      env
    );

    const response = await app.request(
      "/api/telegram/test-message",
      {
        method: "POST",
        headers: { cookie }
      },
      {
        ...env,
        TELEGRAM_BOT_TOKEN: "test-token"
      }
    );
    expect(response.status).toBe(409);
    const payload = (await response.json()) as { error?: string };

    expect(payload.error).toMatch(/paused/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads and persists mail settings through the mail settings endpoint", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie();
    const webhookCreateResponse = await app.request(
      "/api/webhook/endpoints",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: "Ops webhook",
          url: "https://hooks.wemail.test/mail",
          events: ["message.failed"],
          enabled: true
        })
      },
      env
    );
    const webhookCreatePayload = (await webhookCreateResponse.json()) as { endpoint: { id: string } };

    const initialResponse = await app.request("/api/mail/settings", { headers: { cookie } }, env);
    const initialPayload = (await initialResponse.json()) as { settings: typeof defaultMailSettings };

    expect(initialResponse.status).toBe(200);
    expect(initialPayload.settings.senderRules.defaultIdentity).toBe("");
    expect(initialPayload.settings.routing.webhookEndpoint).toBe("");
    expect(initialPayload.settings.lastUpdatedLabel).toBe("尚未更新");

    const updateResponse = await app.request(
      "/api/mail/settings",
      {
        method: "PUT",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          senderRules: {
            defaultIdentity: "Ops Mail <ops@wemail.test>",
            signature: "Managed by WeMail.",
            retryEnabled: true,
            retryAttempts: "3 次",
            retryDelay: "15 分钟",
            failureRetention: "14 天",
            allowManualOverride: false
          },
          routing: {
            webhookEnabled: true,
            webhookEndpoint: webhookCreatePayload.endpoint.id,
            telegramEnabled: false,
            telegramTarget: "",
            failureAlerts: true,
            exceptionAlerts: true,
            exceptionStrategy: "自动转交到值班邮箱",
            fallbackOwner: "ops@wemail.test"
          }
        })
      },
      env
    );
    const updatePayload = (await updateResponse.json()) as { settings: typeof defaultMailSettings };

    expect(updateResponse.status).toBe(200);
    expect(updatePayload.settings.senderRules.defaultIdentity).toBe("Ops Mail <ops@wemail.test>");
    expect(updatePayload.settings.routing.fallbackOwner).toBe("ops@wemail.test");
    expect(updatePayload.settings.workspaceDefaults).toEqual(defaultMailSettings.workspaceDefaults);
    expect(updatePayload.settings.lastUpdatedLabel).not.toBe("尚未更新");

    const persistedResponse = await app.request("/api/mail/settings", { headers: { cookie } }, env);
    const persistedPayload = (await persistedResponse.json()) as { settings: typeof defaultMailSettings };

    expect(persistedPayload.settings.senderRules.signature).toBe("Managed by WeMail.");
    expect(persistedPayload.settings.routing.exceptionStrategy).toBe("自动转交到值班邮箱");
  });

  it("rejects invalid mail settings options instead of persisting them", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie();

    const response = await app.request(
      "/api/mail/settings",
      {
        method: "PUT",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          workspaceDefaults: {
            listDensity: "very dense"
          }
        })
      },
      env
    );
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/listDensity/i);
  });

  it("rejects malformed default sender identities", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie();

    const response = await app.request(
      "/api/mail/settings",
      {
        method: "PUT",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          senderRules: {
            defaultIdentity: "Ops Mail without address"
          }
        })
      },
      env
    );
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/defaultIdentity/i);
  });

  it("rejects enabled mail notification channels without valid targets", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie();

    const webhookResponse = await app.request(
      "/api/mail/settings",
      {
        method: "PUT",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          routing: {
            webhookEnabled: true,
            webhookEndpoint: "missing-webhook"
          }
        })
      },
      env
    );
    const webhookPayload = (await webhookResponse.json()) as { error?: string };

    expect(webhookResponse.status).toBe(400);
    expect(webhookPayload.error).toMatch(/configured webhook/i);

    const telegramResponse = await app.request(
      "/api/mail/settings",
      {
        method: "PUT",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          routing: {
            telegramEnabled: true,
            telegramTarget: ""
          }
        })
      },
      env
    );
    const telegramPayload = (await telegramResponse.json()) as { error?: string };

    expect(telegramResponse.status).toBe(400);
    expect(telegramPayload.error).toMatch(/telegramTarget/i);

    const pausedTelegramSaveResponse = await app.request(
      "/api/telegram/subscription",
      {
        method: "PUT",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ chatId: "123456", enabled: false })
      },
      env
    );
    expect(pausedTelegramSaveResponse.status).toBe(200);

    const pausedTelegramResponse = await app.request(
      "/api/mail/settings",
      {
        method: "PUT",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          routing: {
            telegramEnabled: true,
            telegramTarget: "123456"
          }
        })
      },
      env
    );
    const pausedTelegramPayload = (await pausedTelegramResponse.json()) as { error?: string };

    expect(pausedTelegramResponse.status).toBe(400);
    expect(pausedTelegramPayload.error).toMatch(/enabled Telegram/i);
  });

  it("reads runtime settings from env defaults and lets admins override them", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie({
      email: "runtime-admin@example.com",
      inviteCode: "INVITE-RUNTIME-SETTINGS"
    });

    const initialResponse = await app.request(
      "/api/system/runtime-settings",
      {
        headers: { cookie }
      },
      env
    );

    expect(initialResponse.status).toBe(200);
    expect(await initialResponse.json()).toMatchObject({
      settings: {
        mailbox: { limit: 5 },
        message: { retentionDays: 7 },
        outbound: { dailyLimit: 20 },
        api: { dailyLimit: 20000 },
        attachments: {
          maxBytes: 10485760,
          maxTotalBytes: 15728640
        },
        ai: { fallbackLimit: 20 }
      }
    });

    const updateResponse = await app.request(
      "/api/system/runtime-settings",
      {
        method: "PATCH",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          mailbox: { limit: 9 },
          message: { retentionDays: 14 },
          outbound: { dailyLimit: 50 },
          api: { dailyLimit: 50000 },
          attachments: { maxBytes: 20971520, maxTotalBytes: 31457280 },
          ai: { fallbackLimit: 35 }
        })
      },
      env
    );

    expect(updateResponse.status).toBe(200);
    expect(await updateResponse.json()).toMatchObject({
      settings: {
        mailbox: { limit: 9 },
        message: { retentionDays: 14 },
        outbound: { dailyLimit: 50 },
        api: { dailyLimit: 50000 },
        attachments: {
          maxBytes: 20971520,
          maxTotalBytes: 31457280
        },
        ai: { fallbackLimit: 35 }
      }
    });

    const persistedResponse = await app.request(
      "/api/system/runtime-settings",
      {
        headers: { cookie }
      },
      env
    );

    expect(persistedResponse.status).toBe(200);
    expect(await persistedResponse.json()).toMatchObject({
      settings: {
        mailbox: { limit: 9 },
        message: { retentionDays: 14 },
        outbound: { dailyLimit: 50 },
        api: { dailyLimit: 50000 },
        attachments: {
          maxBytes: 20971520,
          maxTotalBytes: 31457280
        },
        ai: { fallbackLimit: 35 }
      }
    });
  });

  it("rejects runtime attachment totals below the single attachment limit", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie({
      email: "runtime-attachment-guard@example.com",
      inviteCode: "INVITE-RUNTIME-ATTACHMENT-GUARD"
    });

    const response = await app.request(
      "/api/system/runtime-settings",
      {
        method: "PATCH",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          attachments: {
            maxBytes: 20 * 1024 * 1024,
            maxTotalBytes: 10 * 1024 * 1024
          }
        })
      },
      env
    );
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(payload.error).toBe("attachments.maxTotalBytes must be greater than or equal to attachments.maxBytes");
  });
});
