import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminGovernanceSummary, ProductMaturitySummary, SystemDiagnosticsSummary, SystemOperationsSummary } from "@wemail/shared";

import { createApp, runCleanup } from "../src/app/create-app";
import { createInMemoryStore } from "../src/infrastructure/persistence/in-memory";

const env = {
  APP_NAME: "WeMail",
  COOKIE_NAME: "wemail_session",
  DEFAULT_MAIL_DOMAIN: "example.com",
  MAILBOX_LIMIT: "5",
  MESSAGE_RETENTION_DAYS: "7",
  OUTBOUND_DAILY_LIMIT: "20",
  API_DAILY_LIMIT: "20000",
  AI_FALLBACK_LIMIT: "20",
  MAX_ATTACHMENT_BYTES: "10485760",
  MAX_TOTAL_ATTACHMENT_BYTES: "15728640",
  ENABLE_AI: "true",
  ENABLE_TELEGRAM: "true",
  ENABLE_OUTBOUND: "true",
  ENABLE_MAILBOX_CREATION: "true",
  ADMIN_EMAILS: "admin@example.com",
  COOKIE_SECURE: "false"
} as const;

async function registerSessionUser(options: { app: ReturnType<typeof createApp>; store: ReturnType<typeof createInMemoryStore>; email: string }) {
  const invite = await options.store.invites.create({
    code: `INVITE-${options.email}`,
    createdByUserId: "system"
  });

  const registerResponse = await options.app.request(
    "/api/auth/register",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: options.email,
        name: "Webhook Tester",
        password: "password123",
        inviteCode: invite.code
      })
    },
    env
  );

  return registerResponse.headers.get("set-cookie") ?? "";
}

describe("worker app", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("requires a valid invite for registration and sets a session cookie", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });

    const invite = await store.invites.create({
      code: "INVITE-1",
      createdByUserId: "system"
    });

    const response = await app.request(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "admin@example.com",
          name: "Admin Example",
          password: "password123",
          inviteCode: invite.code
        })
      },
      env
    );
    const registerPayload = (await response.json()) as {
      user: { name: string; status: string; updatedAt: string; createdAt: string };
    };

    expect(response.status).toBe(201);
    expect(response.headers.get("set-cookie")).toContain("wemail_session=");
    expect(registerPayload.user).toMatchObject({
      name: "Admin Example",
      status: "active"
    });
    expect(registerPayload.user.updatedAt).toBe(registerPayload.user.createdAt);

    const loginResponse = await app.request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "admin@example.com",
          password: "password123"
        })
      },
      env
    );
    const loginPayload = (await loginResponse.json()) as {
      user: { name: string; status: string; updatedAt: string };
    };

    expect(loginResponse.status).toBe(200);
    expect(loginPayload.user).toMatchObject({
      name: "Admin Example",
      status: "active"
    });

    const sessionResponse = await app.request(
      "/api/auth/session",
      {
        headers: { cookie: response.headers.get("set-cookie") ?? "" }
      },
      env
    );
    const sessionPayload = (await sessionResponse.json()) as {
      user: { name: string; status: string; updatedAt: string };
    };

    expect(sessionResponse.status).toBe(200);
    expect(sessionPayload.user).toMatchObject({
      name: "Admin Example",
      status: "active"
    });
  });

  it("allows the first registered user to become admin without an invite", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });

    const response = await app.request(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "first-admin@example.com",
          name: "First Admin",
          password: "password123"
        })
      },
      env
    );
    const payload = (await response.json()) as {
      user: { email: string; role: string };
    };

    expect(response.status).toBe(201);
    expect(response.headers.get("set-cookie")).toContain("wemail_session=");
    expect(payload.user).toMatchObject({
      email: "first-admin@example.com",
      role: "admin"
    });
  });

  it("returns governance login history, audit events, rate limits, and batch invite analytics", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });
    const cookie = await registerSessionUser({ app, store, email: "admin@example.com" });

    const failedLoginResponse = await app.request(
      "/api/auth/login",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": "203.0.113.44",
          "user-agent": "Governance Test Browser"
        },
        body: JSON.stringify({
          email: "admin@example.com",
          password: "wrong-password"
        })
      },
      env
    );

    expect(failedLoginResponse.status).toBe(401);

    const inviteResponse = await app.request(
      "/api/users/invites",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          count: 3,
          expiresInDays: 7,
          targetRole: "member"
        })
      },
      env
    );
    const invitePayload = (await inviteResponse.json()) as { invites: Array<{ code: string; targetRole: string }> };

    expect(inviteResponse.status).toBe(201);
    expect(invitePayload.invites).toHaveLength(3);
    expect(invitePayload.invites[0]).toMatchObject({ targetRole: "member" });

    const governanceResponse = await app.request(
      "/api/users/governance",
      {
        headers: { cookie }
      },
      {
        ...env,
        RATE_LIMITER: { limit: async () => ({ success: true }) }
      }
    );
    const governancePayload = (await governanceResponse.json()) as { governance: AdminGovernanceSummary };

    expect(governanceResponse.status).toBe(200);
    expect(governancePayload.governance.inviteStats.available).toBeGreaterThanOrEqual(3);
    expect(governancePayload.governance.loginHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userEmail: "admin@example.com",
          status: "failed",
          reason: "invalid_credentials",
          ipAddress: "203.0.113.44"
        })
      ])
    );
    expect(governancePayload.governance.auditEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "invite-create",
          detail: "数量 3，角色 member"
        })
      ])
    );
    expect(governancePayload.governance.rateLimits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "login",
          enforced: true
        }),
        expect.objectContaining({
          key: "api_daily",
          enforced: true
        })
      ])
    );
  });

  it("returns commercial model and data reliability summaries for administrators", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });
    const cookie = await registerSessionUser({ app, store, email: "admin@example.com" });
    const admin = await store.users.findByEmail("admin@example.com");
    if (!admin) throw new Error("admin not found");

    const member = await store.users.create({
      email: "member@example.com",
      name: "Member",
      passwordHash: "hash",
      role: "member"
    });
    await store.quotas.save({
      userId: member.id,
      apiDailyLimit: 20000,
      apiCallsToday: 7,
      dailyLimit: 20,
      sendsToday: 2,
      disabled: false,
      updatedAt: new Date().toISOString()
    });
    const mailbox = await store.mailboxes.create({
      userId: member.id,
      label: "Shared mailbox",
      address: "shared@example.com"
    });
    await store.messages.create({
      mailboxId: mailbox.id,
      toAddress: mailbox.address,
      fromAddress: "sender@example.com",
      subject: "Expired",
      previewText: "Expired message",
      bodyText: "Expired message",
      extractionJson: JSON.stringify({ method: "none", type: "none", value: "", label: "No extraction" }),
      oversizeStatus: null,
      attachmentCount: 0,
      receivedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-02T00:00:00.000Z"
    });
    await store.audit.record({
      actorType: "user",
      actorId: admin.id,
      eventType: "quota-update",
      payloadJson: JSON.stringify({ userId: member.id })
    });
    await runCleanup(store, env);

    const commercialResponse = await app.request("/api/users/commercial", { headers: { cookie } }, env);
    const commercialPayload = (await commercialResponse.json()) as {
      commercial: {
        currentPlanId: string;
        planTiers: Array<{ id: string; name: string }>;
        quotaUsage: { users: number; mailboxes: number; apiCallsToday: number };
        teamWorkspaces: Array<{ name: string; memberCount: number; sharedMailboxCount: number }>;
        organizationAudit: Array<{ eventType: string }>;
      };
    };

    expect(commercialResponse.status).toBe(200);
    expect(commercialPayload.commercial.currentPlanId).toBe("team");
    expect(commercialPayload.commercial.planTiers.map((tier) => tier.id)).toEqual(["free", "pro", "team"]);
    expect(commercialPayload.commercial.quotaUsage).toMatchObject({
      users: 2,
      mailboxes: 1,
      apiCallsToday: 7
    });
    expect(commercialPayload.commercial.teamWorkspaces[0]).toMatchObject({
      name: "WeMail 默认组织",
      memberCount: 2,
      sharedMailboxCount: 1
    });
    expect(commercialPayload.commercial.organizationAudit).toEqual(
      expect.arrayContaining([expect.objectContaining({ eventType: "quota-update" })])
    );

    const reliabilityResponse = await app.request("/api/system/reliability", { headers: { cookie } }, env);
    const reliabilityPayload = (await reliabilityResponse.json()) as {
      reliability: {
        cleanup: { recentRuns: Array<{ status: string; deletedMessages: number }> };
        migrations: Array<{ id: string }>;
        idempotency: { enabled: boolean; duplicateNotificationPrevention: boolean };
        backupRunbook: Array<{ command: string }>;
      };
    };

    expect(reliabilityResponse.status).toBe(200);
    expect(reliabilityPayload.reliability.cleanup.recentRuns[0]).toMatchObject({
      status: "success",
      deletedMessages: 1
    });
    expect(reliabilityPayload.reliability.migrations).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "0017" })])
    );
    expect(reliabilityPayload.reliability.idempotency).toMatchObject({
      enabled: true,
      duplicateNotificationPrevention: true
    });
    expect(reliabilityPayload.reliability.backupRunbook[0].command).toContain("wrangler d1 export");
  });

  it("lists active profile sessions and revokes other devices", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });

    const registerResponse = await app.request(
      "/api/auth/register",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
          "cf-connecting-ip": "203.0.113.10"
        },
        body: JSON.stringify({
          email: "session-owner@example.com",
          name: "Session Owner",
          password: "password123"
        })
      },
      env
    );
    const firstCookie = registerResponse.headers.get("set-cookie") ?? "";

    const loginResponse = await app.request(
      "/api/auth/login",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
          "cf-connecting-ip": "198.51.100.12"
        },
        body: JSON.stringify({
          email: "session-owner@example.com",
          password: "password123"
        })
      },
      env
    );
    const currentCookie = loginResponse.headers.get("set-cookie") ?? "";

    const listResponse = await app.request(
      "/api/profile/sessions",
      {
        headers: { cookie: currentCookie }
      },
      env
    );
    const listPayload = (await listResponse.json()) as {
      sessions: Array<{ id: string; ipAddress: string | null; isCurrent: boolean; userAgent: string | null }>;
    };

    expect(listResponse.status).toBe(200);
    expect(listPayload.sessions).toHaveLength(2);
    expect(listPayload.sessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ipAddress: "198.51.100.12", isCurrent: true }),
        expect.objectContaining({ ipAddress: "203.0.113.10", isCurrent: false })
      ])
    );
    expect(listPayload.sessions[0].userAgent).toContain("Chrome");

    const otherSessionId = listPayload.sessions.find((session) => !session.isCurrent)!.id;
    const revokeResponse = await app.request(
      `/api/profile/sessions/${otherSessionId}`,
      {
        method: "DELETE",
        headers: { cookie: currentCookie }
      },
      env
    );

    expect(revokeResponse.status).toBe(200);
    expect(await store.sessions.findById(otherSessionId)).toBeNull();

    const thirdLoginResponse = await app.request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "session-owner@example.com",
          password: "password123"
        })
      },
      env
    );

    expect(thirdLoginResponse.headers.get("set-cookie")).toContain("wemail_session=");

    const revokeOthersResponse = await app.request(
      "/api/profile/sessions/others",
      {
        method: "DELETE",
        headers: { cookie: currentCookie }
      },
      env
    );
    const finalSessionsResponse = await app.request(
      "/api/profile/sessions",
      {
        headers: { cookie: currentCookie }
      },
      env
    );
    const finalPayload = (await finalSessionsResponse.json()) as { sessions: Array<{ isCurrent: boolean }> };

    expect(firstCookie).toContain("wemail_session=");
    expect(revokeOthersResponse.status).toBe(200);
    expect(finalPayload.sessions).toEqual([expect.objectContaining({ isCurrent: true })]);
  });

  it("rejects expired invites during registration", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });
    await store.invites.create({
      code: "INVITE-EXPIRED",
      createdByUserId: "system",
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
      targetRole: "member"
    });

    const response = await app.request(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "expired@example.com",
          name: "Expired Invite",
          password: "password123",
          inviteCode: "INVITE-EXPIRED"
        })
      },
      env
    );

    expect(response.status).toBe(403);
  });

  it("applies target roles from invites for new users", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });

    await app.request(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "bootstrap-admin@example.com",
          name: "Bootstrap Admin",
          password: "password123"
        })
      },
      env
    );
    const invite = await store.invites.create({
      code: "INVITE-ADMIN-ROLE",
      createdByUserId: "system",
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      targetRole: "admin"
    });

    const response = await app.request(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "invited-admin@example.com",
          name: "Invited Admin",
          password: "password123",
          inviteCode: invite.code
        })
      },
      env
    );
    const payload = (await response.json()) as { user: { role: string } };

    expect(response.status).toBe(201);
    expect(payload.user.role).toBe("admin");
  });

  it("returns system diagnostics for admin sessions", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });
    const adminCookie = await registerSessionUser({ app, store, email: "admin@example.com" });

    const response = await app.request(
      "/api/system/diagnostics",
      {
        headers: { cookie: adminCookie }
      },
      {
        ...env,
        ENVIRONMENT: "production",
        COOKIE_SECURE: "false",
        CORS_ALLOWED_ORIGINS: "",
        TELEGRAM_BOT_TOKEN: "test-token",
        ENABLE_TELEGRAM: "true",
        ENABLE_OUTBOUND: "true"
      }
    );
    const payload = (await response.json()) as { diagnostics: SystemDiagnosticsSummary };

    expect(response.status).toBe(200);
    expect(payload.diagnostics).toMatchObject({
      environment: "production",
      overallStatus: "error"
    });
    expect(payload.diagnostics.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "cookie.secure", status: "error" }),
        expect.objectContaining({ id: "cors.origins", status: "error" }),
        expect.objectContaining({ id: "telegram.webhook_secret", status: "error" }),
        expect.objectContaining({ id: "outbound.resend", status: "warning" })
      ])
    );
  });

  it("rejects system diagnostics for member sessions", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });
    await registerSessionUser({ app, store, email: "admin@example.com" });
    const memberCookie = await registerSessionUser({ app, store, email: "member@example.com" });

    const response = await app.request(
      "/api/system/diagnostics",
      {
        headers: { cookie: memberCookie }
      },
      env
    );
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(403);
    expect(payload.error).toMatch(/admin session/i);
  });

  it("returns product maturity coverage for admin sessions", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });
    const adminCookie = await registerSessionUser({ app, store, email: "admin@example.com" });

    const response = await app.request(
      "/api/system/maturity",
      {
        headers: { cookie: adminCookie }
      },
      env
    );
    const payload = (await response.json()) as { maturity: ProductMaturitySummary };

    expect(response.status).toBe(200);
    expect(payload.maturity).toMatchObject({
      totalAreas: 8
    });
    expect(payload.maturity.areas.map((area) => area.id)).toEqual([
      "observability",
      "security",
      "mail_workflow",
      "notifications",
      "outbound",
      "commercial",
      "documentation",
      "data_reliability"
    ]);
    expect(payload.maturity.areas.find((area) => area.id === "security")?.signals).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "可用邀请码" })])
    );
  });

  it("rejects product maturity coverage for member sessions", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });
    await registerSessionUser({ app, store, email: "admin@example.com" });
    const memberCookie = await registerSessionUser({ app, store, email: "member@example.com" });

    const response = await app.request(
      "/api/system/maturity",
      {
        headers: { cookie: memberCookie }
      },
      env
    );
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(403);
    expect(payload.error).toMatch(/admin session/i);
  });

  it("returns operations failures for admin sessions", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });
    const adminCookie = await registerSessionUser({ app, store, email: "admin@example.com" });
    const admin = await store.users.findByEmail("admin@example.com");
    if (!admin) throw new Error("admin missing");
    const endpoint = await store.webhookEndpoints.create({
      userId: admin.id,
      name: "Ops hook",
      url: "https://hooks.example.test/wemail",
      eventsJson: JSON.stringify(["message.received"]),
      enabled: true
    });
    await store.webhookDeliveries.record({
      endpointId: endpoint.id,
      eventType: "message.received",
      status: "failed",
      statusCode: 500,
      durationMs: 120,
      errorText: "target failed",
      payloadJson: JSON.stringify({ event: "message.received" }),
      responseText: "boom"
    });
    const mailbox = await store.mailboxes.create({
      userId: admin.id,
      address: "ops@example.com",
      label: "Ops"
    });
    await store.outboundMessages.create({
      mailboxId: mailbox.id,
      fromAddress: "ops@example.com",
      toAddress: "user@example.com",
      subject: "Ops alert",
      bodyText: "hello",
      status: "failed",
      errorText: "resend quota exceeded",
      providerMessageId: null,
      requestPayloadJson: "{}",
      responsePayloadJson: null
    });
    await store.audit.record({
      actorType: "user",
      actorId: admin.id,
      eventType: "telegram-delivery",
      payloadJson: JSON.stringify({
        eventId: "telegram.test",
        label: "测试通知",
        delivered: false,
        reason: "telegram_api_failed"
      })
    });

    const response = await app.request(
      "/api/system/operations",
      {
        headers: { cookie: adminCookie }
      },
      env
    );
    const payload = (await response.json()) as { operations: SystemOperationsSummary };

    expect(response.status).toBe(200);
    expect(payload.operations.overallStatus).toBe("error");
    expect(payload.operations.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Webhook 失败", value: "1", status: "error" }),
        expect.objectContaining({ label: "Telegram 失败", value: "1", status: "error" }),
        expect.objectContaining({ label: "发信失败", value: "1", status: "error" })
      ])
    );
    expect(payload.operations.recentEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "webhook", message: "target failed" }),
        expect.objectContaining({ source: "telegram", message: "telegram_api_failed" }),
        expect.objectContaining({ source: "outbound", message: "resend quota exceeded" })
      ])
    );
  });

  it("rejects operations failures for member sessions", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });
    await registerSessionUser({ app, store, email: "admin@example.com" });
    const memberCookie = await registerSessionUser({ app, store, email: "member-ops@example.com" });

    const response = await app.request(
      "/api/system/operations",
      {
        headers: { cookie: memberCookie }
      },
      env
    );
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(403);
    expect(payload.error).toMatch(/admin session/i);
  });

  it("paginates webhook endpoints for the current session user", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });

    const invite = await store.invites.create({
      code: "INVITE-WEBHOOK-PAGE",
      createdByUserId: "system"
    });

    const registerResponse = await app.request(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "webhook-page@example.com",
          name: "Webhook Page",
          password: "password123",
          inviteCode: invite.code
        })
      },
      env
    );
    const cookie = registerResponse.headers.get("set-cookie") ?? "";

    for (let index = 1; index <= 6; index += 1) {
      const createResponse = await app.request(
        "/api/webhook/endpoints",
        {
          method: "POST",
          headers: {
            cookie,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            enabled: true,
            events: ["message.received"],
            name: `Endpoint ${index}`,
            url: `https://hooks.example.test/${index}`
          })
        },
        env
      );

      expect(createResponse.status).toBe(201);
    }

    const pageResponse = await app.request(
      "/api/webhook/endpoints?page=2&pageSize=5",
      {
        headers: { cookie }
      },
      env
    );
    const pagePayload = (await pageResponse.json()) as {
      endpoints: unknown[];
      page: number;
      pageSize: number;
      total: number;
    };

    expect(pageResponse.status).toBe(200);
    expect(pagePayload).toMatchObject({
      page: 2,
      pageSize: 5,
      total: 6
    });
    expect(pagePayload.endpoints).toHaveLength(1);
  });

  it("rejects webhook endpoints that target private or local literal addresses", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });
    const cookie = await registerSessionUser({ app, store, email: "webhook-ssrf@example.com" });
    const privateTargets = [
      "https://localhost/hooks",
      "https://127.1/hooks",
      "https://0x7f000001/hooks",
      "https://169.254.1.1/hooks",
      "https://10.0.0.5/hooks",
      "https://[::1]/hooks",
      "https://[fc00::1]/hooks",
      "https://[fe80::1]/hooks",
      "https://[::ffff:127.0.0.1]/hooks"
    ];

    for (const url of privateTargets) {
      const response = await app.request(
        "/api/webhook/endpoints",
        {
          method: "POST",
          headers: {
            cookie,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            enabled: true,
            events: ["message.received"],
            name: "Blocked endpoint",
            url
          })
        },
        env
      );
      const payload = (await response.json()) as { error?: string };

      expect(response.status, url).toBe(400);
      expect(payload.error, url).toMatch(/local|private/i);
    }
  });

  it("paginates announcements for signed-in users while keeping publishing admin-only", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });
    const adminCookie = await registerSessionUser({ app, store, email: "admin@example.com" });
    const memberCookie = await registerSessionUser({ app, store, email: "ann-member@example.com" });

    const deniedResponse = await app.request(
      "/api/announcements",
      {
        method: "POST",
        headers: {
          cookie: memberCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          title: "Member post",
          summary: "Members should not be able to publish."
        })
      },
      env
    );

    expect(deniedResponse.status).toBe(403);

    for (let index = 1; index <= 7; index += 1) {
      const createResponse = await app.request(
        "/api/announcements",
        {
          method: "POST",
          headers: {
            cookie: adminCookie,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            title: `Announcement ${index}`,
            summary: `Announcement body ${index}`,
            type: "产品更新",
            status: "已发布",
            audience: "全部成员",
            priority: "中",
            tags: ["测试"],
            pinned: index <= 2
          })
        },
        env
      );

      expect(createResponse.status).toBe(201);
    }

    const pageResponse = await app.request(
      "/api/announcements?page=2&pageSize=3",
      {
        headers: { cookie: memberCookie }
      },
      env
    );
    const pagePayload = (await pageResponse.json()) as {
      announcements: unknown[];
      page: number;
      pageSize: number;
      total: number;
    };

    expect(pageResponse.status).toBe(200);
    expect(pagePayload).toMatchObject({
      page: 2,
      pageSize: 3,
      total: 7
    });
    expect(pagePayload.announcements).toHaveLength(3);

    const firstPageResponse = await app.request(
      "/api/announcements?page=1&pageSize=3",
      {
        headers: { cookie: memberCookie }
      },
      env
    );
    const firstPagePayload = (await firstPageResponse.json()) as {
      announcements: Array<{ pinned: boolean; title: string }>;
    };

    expect(firstPageResponse.status).toBe(200);
    expect(firstPagePayload.announcements[0]?.pinned).toBe(true);
  });

  it("returns dashboard metrics from persisted workspace data", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });
    const adminCookie = await registerSessionUser({ app, store, email: "admin@example.com" });
    await registerSessionUser({ app, store, email: "dashboard-member@example.com" });
    const adminUser = await store.users.findByEmail("admin@example.com");
    expect(adminUser).not.toBeNull();
    if (!adminUser) return;

    const primaryMailbox = await store.mailboxes.create({
      userId: adminUser.id,
      address: "dashboard@example.com",
      label: "Dashboard"
    });
    const disabledMailbox = await store.mailboxes.create({
      userId: adminUser.id,
      address: "disabled@example.com",
      label: "Disabled",
      status: "disabled"
    });

    const receivedAt = new Date();
    await store.messages.create({
      mailboxId: primaryMailbox.id,
      toAddress: primaryMailbox.address,
      fromAddress: "sender@example.com",
      subject: "Inbound",
      previewText: "One inbound",
      bodyText: "One inbound",
      extractionJson: "{}",
      oversizeStatus: null,
      attachmentCount: 0,
      receivedAt: receivedAt.toISOString(),
      expiresAt: new Date(receivedAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    await store.outboundMessages.create({
      mailboxId: primaryMailbox.id,
      fromAddress: primaryMailbox.address,
      toAddress: "recipient@example.com",
      subject: "Sent",
      bodyText: "Sent",
      status: "sent",
      errorText: null,
      providerMessageId: "provider-1",
      requestPayloadJson: "{}",
      responsePayloadJson: "{}"
    });
    await store.outboundMessages.create({
      mailboxId: disabledMailbox.id,
      fromAddress: disabledMailbox.address,
      toAddress: "recipient@example.com",
      subject: "Failed",
      bodyText: "Failed",
      status: "failed",
      errorText: "boom",
      providerMessageId: null,
      requestPayloadJson: "{}",
      responsePayloadJson: null
    });
    const key = await store.apiKeys.create({
      userId: adminUser.id,
      label: "Dashboard key",
      prefix: "wm_dash",
      scopes: ["mail:read", "settings:read"],
      keyHash: "hash-dashboard"
    });
    await store.apiKeys.revoke(key.id, adminUser.id);
    await store.apiKeys.create({
      userId: adminUser.id,
      label: "Active dashboard key",
      prefix: "wm_live",
      scopes: ["mail:read", "mail:send"],
      keyHash: "hash-dashboard-live"
    });
    await store.webhookEndpoints.create({
      userId: adminUser.id,
      name: "Dashboard hook",
      url: "https://hooks.example.test/dashboard",
      eventsJson: JSON.stringify(["message.received"]),
      enabled: true
    });
    await store.announcements.create({
      title: "Dashboard announcement",
      summary: "Dashboard announcement summary",
      type: "产品更新",
      status: "已发布",
      audience: "全部成员",
      priority: "中",
      authorUserId: adminUser.id,
      authorLabel: "Admin",
      tagsJson: "[]",
      pinned: true,
      startAt: null,
      endAt: null
    });

    const response = await app.request("/api/dashboard", { headers: { cookie: adminCookie } }, env);
    const payload = (await response.json()) as {
      accountDistribution: { label: string; value: number }[];
      accountTotal: number;
      growth: Record<"week" | "month" | "year", { label: string; accounts: number; mailboxes: number }[]>;
      kpis: { kicker: string; label: string; value: string; detail: string; change: string }[];
      resources: { label: string; value: string; detail: string; progress: number }[];
      trend: { week: { day: string; inbound: number; outbound: number }[] };
      userRoles: { label: string; value: number }[];
      userTotal: number;
    };

    expect(response.status).toBe(200);
    expect(payload.kpis).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kicker: "今日收件", label: "收件总量", value: "1" }),
        expect.objectContaining({ kicker: "今日发件", label: "发件总量", value: "2" }),
        expect.objectContaining({ kicker: "API 密钥数", label: "活跃密钥", value: "1" }),
        expect.objectContaining({ kicker: "Webhook", label: "投递端点", value: "1" }),
        expect.objectContaining({ kicker: "公告", label: "已发布公告", value: "1" })
      ])
    );
    expect(payload.accountTotal).toBe(2);
    expect(payload.accountDistribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "活跃账号", value: 50 }),
        expect.objectContaining({ label: "暂停账号", value: 50 })
      ])
    );
    expect(payload.trend.week.at(-1)).toEqual(expect.objectContaining({ inbound: 1, outbound: 2 }));
    expect(payload.growth.week).toHaveLength(5);
    expect(payload.growth.month).toHaveLength(4);
    expect(payload.growth.year).toHaveLength(6);
    expect(payload.growth.week.at(-1)).toEqual(expect.objectContaining({ accounts: 2, mailboxes: 2 }));
    expect(payload.resources).toEqual(expect.arrayContaining([expect.objectContaining({ label: "可用邀请码" })]));
    expect(payload.userTotal).toBe(2);
    expect(payload.userRoles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "管理员", value: 50 }),
        expect.objectContaining({ label: "成员", value: 50 })
      ])
    );
  });

  it("publishes announcement windows and records per-user receipts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T10:00:00.000Z"));

    const store = createInMemoryStore();
    const app = createApp({ store });
    const adminCookie = await registerSessionUser({ app, store, email: "admin@example.com" });
    const memberCookie = await registerSessionUser({ app, store, email: "receipt-member@example.com" });

    const createResponse = await app.request(
      "/api/announcements",
      {
        method: "POST",
        headers: {
          cookie: adminCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          title: "Maintenance receipt window",
          summary: "Members must acknowledge this maintenance notice.",
          type: "维护通知",
          status: "已发布",
          audience: "全部成员",
          priority: "高",
          tags: ["维护"],
          pinned: true,
          startAt: "2026-06-14T01:00:00.000Z",
          endAt: "2026-06-20T03:00:00.000Z"
        })
      },
      env
    );
    const createPayload = (await createResponse.json()) as {
      announcement: {
        id: string;
        startAt: string | null;
        endAt: string | null;
        receiptStatus: string;
        receiptSummary: { signed: number; unsigned: number };
      };
    };

    expect(createResponse.status).toBe(201);
    expect(createPayload.announcement).toMatchObject({
      startAt: "2026-06-14T01:00:00.000Z",
      endAt: "2026-06-20T03:00:00.000Z",
      receiptStatus: "未签收",
      receiptSummary: {
        signed: 0,
        unsigned: 2
      }
    });

    const memberListBeforeResponse = await app.request("/api/announcements?page=1&pageSize=4", { headers: { cookie: memberCookie } }, env);
    const memberListBefore = (await memberListBeforeResponse.json()) as {
      announcements: Array<{ id: string; receiptStatus: string; receiptSummary: { signed: number; unsigned: number } }>;
    };
    expect(memberListBefore.announcements[0]).toMatchObject({
      id: createPayload.announcement.id,
      receiptStatus: "未签收",
      receiptSummary: {
        signed: 0,
        unsigned: 2
      }
    });

    const receiptResponse = await app.request(
      `/api/announcements/${createPayload.announcement.id}/receipt`,
      {
        method: "POST",
        headers: { cookie: memberCookie }
      },
      env
    );
    const receiptPayload = (await receiptResponse.json()) as {
      announcement: { id: string; receiptStatus: string; acknowledgedAt: string; receiptSummary: { signed: number; unsigned: number } };
    };

    expect(receiptResponse.status).toBe(200);
    expect(receiptPayload.announcement).toMatchObject({
      id: createPayload.announcement.id,
      receiptStatus: "已签收",
      receiptSummary: {
        signed: 1,
        unsigned: 1
      }
    });
    expect(receiptPayload.announcement.acknowledgedAt).toEqual(expect.any(String));

    const memberListAfterResponse = await app.request("/api/announcements?page=1&pageSize=4", { headers: { cookie: memberCookie } }, env);
    const memberListAfter = (await memberListAfterResponse.json()) as {
      announcements: Array<{ id: string; receiptStatus: string; receiptSummary: { signed: number; unsigned: number } }>;
    };
    expect(memberListAfter.announcements[0]).toMatchObject({
      id: createPayload.announcement.id,
      receiptStatus: "已签收",
      receiptSummary: {
        signed: 1,
        unsigned: 1
      }
    });
  });

  it("reports announcement status from publish windows in list, filters, and summary", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T10:00:00.000Z"));

    const store = createInMemoryStore();
    const app = createApp({ store });
    const adminCookie = await registerSessionUser({ app, store, email: "admin@example.com" });

    async function publish(input: { endAt?: string | null; startAt?: string | null; title: string }) {
      const response = await app.request(
        "/api/announcements",
        {
          method: "POST",
          headers: {
            cookie: adminCookie,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            title: input.title,
            summary: `${input.title} summary`,
            type: "产品更新",
            audience: "全部成员",
            priority: "中",
            tags: ["发布"],
            pinned: false,
            startAt: input.startAt ?? null,
            endAt: input.endAt ?? null
          })
        },
        env
      );
      expect(response.status).toBe(201);
    }

    await publish({ title: "No window notice" });
    await publish({
      title: "Active release notice",
      startAt: "2026-06-15T09:00:00.000Z",
      endAt: "2026-06-15T11:00:00.000Z"
    });
    await publish({
      title: "Future release notice",
      startAt: "2026-06-15T11:30:00.000Z",
      endAt: "2026-06-15T12:30:00.000Z"
    });
    await publish({
      title: "Expired release notice",
      startAt: "2026-06-15T08:00:00.000Z",
      endAt: "2026-06-15T09:30:00.000Z"
    });

    const listResponse = await app.request(
      "/api/announcements?page=1&pageSize=10&scope=manage",
      { headers: { cookie: adminCookie } },
      env
    );
    const listPayload = (await listResponse.json()) as {
      announcements: Array<{ status: string; title: string }>;
      summary: Array<{ label: string; value: number }>;
      total: number;
    };

    expect(listResponse.status).toBe(200);
    expect(listPayload.announcements.find((announcement) => announcement.title === "No window notice")?.status).toBe("已发布");
    expect(listPayload.announcements.find((announcement) => announcement.title === "Active release notice")?.status).toBe("进行中");
    expect(listPayload.announcements.find((announcement) => announcement.title === "Future release notice")?.status).toBe("即将开始");
    expect(listPayload.announcements.find((announcement) => announcement.title === "Expired release notice")?.status).toBe("已结束");
    expect(listPayload.summary).toEqual([
      { label: "已发布", value: 1 },
      { label: "进行中", value: 1 },
      { label: "即将开始", value: 1 },
      { label: "已结束", value: 1 },
      { label: "已归档", value: 0 }
    ]);

    const ongoingResponse = await app.request(
      "/api/announcements?page=1&pageSize=10&scope=manage&status=进行中",
      { headers: { cookie: adminCookie } },
      env
    );
    const ongoingPayload = (await ongoingResponse.json()) as { announcements: Array<{ title: string }>; total: number };
    expect(ongoingPayload.total).toBe(1);
    expect(ongoingPayload.announcements[0]?.title).toBe("Active release notice");

    const publishedResponse = await app.request(
      "/api/announcements?page=1&pageSize=10&scope=manage&status=已发布",
      { headers: { cookie: adminCookie } },
      env
    );
    const publishedPayload = (await publishedResponse.json()) as { announcements: Array<{ title: string }>; total: number };
    expect(publishedPayload.total).toBe(1);
    expect(publishedPayload.announcements[0]?.title).toBe("No window notice");
  });

  it("filters announcements by visibility, query, windows, and eligible receipt audience", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });
    const adminCookie = await registerSessionUser({ app, store, email: "admin@example.com" });
    const memberCookie = await registerSessionUser({ app, store, email: "visible-member@example.com" });
    await registerSessionUser({ app, store, email: "second-member@example.com" });

    async function publish(input: {
      audience?: string;
      endAt?: string | null;
      pinned?: boolean;
      startAt?: string | null;
      status?: string;
      summary?: string;
      title: string;
      type?: string;
    }) {
      const response = await app.request(
        "/api/announcements",
        {
          method: "POST",
          headers: {
            cookie: adminCookie,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            title: input.title,
            summary: input.summary ?? `${input.title} body`,
            type: input.type ?? "产品更新",
            status: input.status ?? "已发布",
            audience: input.audience ?? "全部成员",
            priority: "中",
            tags: [input.type ?? "产品更新"],
            pinned: input.pinned ?? false,
            startAt: input.startAt ?? null,
            endAt: input.endAt ?? null
          })
        },
        env
      );
      expect(response.status).toBe(201);
      return (await response.json()) as {
        announcement: { id: string; receiptSummary: { signed: number; unsigned: number }; title: string };
      };
    }

    const publicAnnouncement = await publish({
      audience: "全部成员",
      pinned: true,
      title: "Public platform notice",
      type: "产品更新"
    });
    const memberAnnouncement = await publish({
      audience: "普通成员",
      title: "Member security notice",
      type: "安全提醒"
    });
    const adminAnnouncement = await publish({
      audience: "管理员",
      title: "Admin only incident",
      type: "运营通知"
    });
    await publish({ status: "已归档", title: "Archived old notice" });
    await publish({ startAt: "2099-01-01T00:00:00.000Z", title: "Future notice" });
    await publish({ endAt: "2000-01-01T00:00:00.000Z", title: "Expired notice" });

    expect(memberAnnouncement.announcement.receiptSummary).toEqual({ signed: 0, unsigned: 2 });
    expect(adminAnnouncement.announcement.receiptSummary).toEqual({ signed: 0, unsigned: 1 });

    const memberListResponse = await app.request(
      "/api/announcements?page=1&pageSize=10",
      { headers: { cookie: memberCookie } },
      env
    );
    const memberList = (await memberListResponse.json()) as {
      announcements: Array<{ title: string }>;
      featuredAnnouncements: Array<{ title: string }>;
      summary: Array<{ label: string; value: number }>;
      total: number;
    };

    expect(memberListResponse.status).toBe(200);
    expect(memberList.total).toBe(2);
    expect(memberList.announcements.map((announcement) => announcement.title)).toEqual([
      "Public platform notice",
      "Member security notice"
    ]);
    expect(memberList.featuredAnnouncements.map((announcement) => announcement.title)).toEqual(["Public platform notice"]);
    expect(memberList.summary).toEqual([
      { label: "已发布", value: 2 },
      { label: "进行中", value: 0 },
      { label: "即将开始", value: 0 },
      { label: "已结束", value: 0 },
      { label: "已归档", value: 0 }
    ]);

    const memberSearchResponse = await app.request(
      "/api/announcements?page=1&pageSize=10&q=security&type=安全提醒&status=已发布&time=30d",
      { headers: { cookie: memberCookie } },
      env
    );
    const memberSearch = (await memberSearchResponse.json()) as { announcements: Array<{ title: string }>; total: number };
    expect(memberSearch.total).toBe(1);
    expect(memberSearch.announcements[0]?.title).toBe("Member security notice");

    const adminManageResponse = await app.request(
      "/api/announcements?page=1&pageSize=10&scope=manage",
      { headers: { cookie: adminCookie } },
      env
    );
    const adminManage = (await adminManageResponse.json()) as { announcements: Array<{ title: string }>; total: number };
    expect(adminManage.total).toBe(6);
    expect(adminManage.announcements.map((announcement) => announcement.title)).toContain("Archived old notice");
    expect(adminManage.announcements.map((announcement) => announcement.title)).toContain("Future notice");

    const hiddenDetailResponse = await app.request(
      `/api/announcements/${adminAnnouncement.announcement.id}`,
      { headers: { cookie: memberCookie } },
      env
    );
    expect(hiddenDetailResponse.status).toBe(404);

    const visibleDetailResponse = await app.request(
      `/api/announcements/${publicAnnouncement.announcement.id}`,
      { headers: { cookie: memberCookie } },
      env
    );
    const visibleDetail = (await visibleDetailResponse.json()) as { announcement: { title: string } };
    expect(visibleDetailResponse.status).toBe(200);
    expect(visibleDetail.announcement.title).toBe("Public platform notice");

    const invalidStatusResponse = await app.request(
      "/api/announcements",
      {
        method: "POST",
        headers: {
          cookie: adminCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          title: "Invalid status",
          summary: "Should fail",
          status: "准备发布"
        })
      },
      env
    );
    expect(invalidStatusResponse.status).toBe(400);

    const invalidWindowResponse = await app.request(
      `/api/announcements/${publicAnnouncement.announcement.id}`,
      {
        method: "PATCH",
        headers: {
          cookie: adminCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          startAt: "2026-06-20T03:00:00.000Z",
          endAt: "2026-06-20T01:00:00.000Z"
        })
      },
      env
    );
    expect(invalidWindowResponse.status).toBe(400);
  });

  it("allows only admins to update archive and delete announcements", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });
    const adminCookie = await registerSessionUser({ app, store, email: "admin@example.com" });
    const memberCookie = await registerSessionUser({ app, store, email: "announcement-member@example.com" });

    const createResponse = await app.request(
      "/api/announcements",
      {
        method: "POST",
        headers: {
          cookie: adminCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          title: "Editable announcement",
          summary: "Original summary",
          type: "产品更新",
          status: "已发布",
          audience: "全部成员",
          priority: "中",
          tags: ["编辑"],
          pinned: false
        })
      },
      env
    );
    const createPayload = (await createResponse.json()) as { announcement: { id: string } };

    const deniedPatchResponse = await app.request(
      `/api/announcements/${createPayload.announcement.id}`,
      {
        method: "PATCH",
        headers: {
          cookie: memberCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ title: "Member edit" })
      },
      env
    );
    expect(deniedPatchResponse.status).toBe(403);

    const editResponse = await app.request(
      `/api/announcements/${createPayload.announcement.id}`,
      {
        method: "PATCH",
        headers: {
          cookie: adminCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          title: "Edited announcement",
          summary: "Updated summary",
          startAt: "2026-06-21T01:00:00.000Z",
          endAt: "2026-06-21T02:00:00.000Z"
        })
      },
      env
    );
    const editPayload = (await editResponse.json()) as {
      announcement: { title: string; summary: string; startAt: string | null; endAt: string | null };
    };

    expect(editResponse.status).toBe(200);
    expect(editPayload.announcement).toMatchObject({
      title: "Edited announcement",
      summary: "Updated summary",
      startAt: "2026-06-21T01:00:00.000Z",
      endAt: "2026-06-21T02:00:00.000Z"
    });

    const archiveResponse = await app.request(
      `/api/announcements/${createPayload.announcement.id}`,
      {
        method: "PATCH",
        headers: {
          cookie: adminCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ status: "已归档" })
      },
      env
    );
    const archivePayload = (await archiveResponse.json()) as { announcement: { status: string } };
    expect(archiveResponse.status).toBe(200);
    expect(archivePayload.announcement.status).toBe("已归档");

    const deniedDeleteResponse = await app.request(
      `/api/announcements/${createPayload.announcement.id}`,
      {
        method: "DELETE",
        headers: { cookie: memberCookie }
      },
      env
    );
    expect(deniedDeleteResponse.status).toBe(403);

    const deleteResponse = await app.request(
      `/api/announcements/${createPayload.announcement.id}`,
      {
        method: "DELETE",
        headers: { cookie: adminCookie }
      },
      env
    );
    expect(deleteResponse.status).toBe(204);

    const listResponse = await app.request("/api/announcements?page=1&pageSize=4", { headers: { cookie: adminCookie } }, env);
    const listPayload = (await listResponse.json()) as { total: number; announcements: unknown[] };
    expect(listPayload.total).toBe(0);
    expect(listPayload.announcements).toHaveLength(0);
  });

  it("sends a signed webhook test event and records a filterable delivery", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("accepted", { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const store = createInMemoryStore();
    const app = createApp({ store });
    const cookie = await registerSessionUser({ app, store, email: "webhook-test@example.com" });

    const createResponse = await app.request(
      "/api/webhook/endpoints",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          enabled: true,
          events: ["message.received"],
          name: "Test receiver",
          url: "https://hooks.example.test/wemail"
        })
      },
      env
    );
    const createPayload = (await createResponse.json()) as { endpoint: { id: string; signingSecret: string } };

    const testResponse = await app.request(
      `/api/webhook/endpoints/${createPayload.endpoint.id}/test`,
      {
        method: "POST",
        headers: { cookie }
      },
      env
    );
    expect(testResponse.status).toBe(200);
    const testPayload = (await testResponse.json()) as {
      delivery: { endpointId: string; eventType: string; status: string; statusCode: number; payload: { eventType: string } };
    };
    expect(testPayload.delivery).toMatchObject({
      endpointId: createPayload.endpoint.id,
      eventType: "webhook.test",
      status: "success",
      statusCode: 202,
      payload: { eventType: "webhook.test" }
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://hooks.example.test/wemail");
    const sentHeaders = new Headers(fetchMock.mock.calls[0][1]?.headers as HeadersInit);
    expect(sentHeaders.get("x-wemail-event")).toBe("webhook.test");
    expect(sentHeaders.get("x-wemail-signature")).toMatch(/^sha256=/);
    expect(sentHeaders.get("x-wemail-delivery-id")).toEqual(expect.any(String));

    const deliveryListResponse = await app.request(
      `/api/webhook/deliveries?endpointId=${createPayload.endpoint.id}&status=success&page=1&pageSize=5`,
      {
        headers: { cookie }
      },
      env
    );
    const deliveryListPayload = (await deliveryListResponse.json()) as {
      deliveries: Array<{ id: string; eventType: string; payload: { eventType: string } }>;
      page: number;
      pageSize: number;
      total: number;
    };

    expect(deliveryListResponse.status).toBe(200);
    expect(deliveryListPayload).toMatchObject({ page: 1, pageSize: 5, total: 1 });
    expect(deliveryListPayload.deliveries[0]).toMatchObject({
      eventType: "webhook.test",
      payload: { eventType: "webhook.test" }
    });
  });

  it("retries a failed webhook delivery and records the retry result", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("upstream unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const store = createInMemoryStore();
    const app = createApp({ store });
    const cookie = await registerSessionUser({ app, store, email: "webhook-retry@example.com" });

    const createResponse = await app.request(
      "/api/webhook/endpoints",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          enabled: true,
          events: ["message.received"],
          name: "Retry receiver",
          url: "https://hooks.example.test/retry"
        })
      },
      env
    );
    const createPayload = (await createResponse.json()) as { endpoint: { id: string } };

    const failedTestResponse = await app.request(
      `/api/webhook/endpoints/${createPayload.endpoint.id}/test`,
      {
        method: "POST",
        headers: { cookie }
      },
      env
    );
    expect(failedTestResponse.status).toBe(200);
    const failedPayload = (await failedTestResponse.json()) as {
      delivery: { id: string; status: string; statusCode: number; errorText: string };
    };
    expect(failedPayload.delivery).toMatchObject({
      status: "failed",
      statusCode: 503
    });
    expect(failedPayload.delivery.errorText).toContain("HTTP 503");

    const retryResponse = await app.request(
      `/api/webhook/deliveries/${failedPayload.delivery.id}/retry`,
      {
        method: "POST",
        headers: { cookie }
      },
      env
    );
    expect(retryResponse.status).toBe(200);
    const retryPayload = (await retryResponse.json()) as {
      delivery: { status: string; statusCode: number };
    };
    expect(retryPayload.delivery).toMatchObject({
      status: "success",
      statusCode: 204
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const failedListResponse = await app.request(
      `/api/webhook/deliveries?endpointId=${createPayload.endpoint.id}&status=failed&page=1&pageSize=5`,
      { headers: { cookie } },
      env
    );
    const failedListPayload = (await failedListResponse.json()) as { total: number; deliveries: unknown[] };
    expect(failedListPayload.total).toBe(1);
    expect(failedListPayload.deliveries).toHaveLength(1);
  });

  it("rotates webhook signing secrets for owned endpoints", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });
    const cookie = await registerSessionUser({ app, store, email: "webhook-secret@example.com" });

    const createResponse = await app.request(
      "/api/webhook/endpoints",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          enabled: true,
          events: ["message.received"],
          name: "Secret receiver",
          url: "https://hooks.example.test/secret"
        })
      },
      env
    );
    const createPayload = (await createResponse.json()) as { endpoint: { id: string; signingSecret: string } };

    const rotateResponse = await app.request(
      `/api/webhook/endpoints/${createPayload.endpoint.id}/secret`,
      {
        method: "POST",
        headers: { cookie }
      },
      env
    );
    expect(rotateResponse.status).toBe(200);
    const rotatePayload = (await rotateResponse.json()) as { endpoint: { id: string; signingSecret: string } };
    expect(rotatePayload.endpoint.id).toBe(createPayload.endpoint.id);
    expect(rotatePayload.endpoint.signingSecret).not.toBe(createPayload.endpoint.signingSecret);
  });

  it("marks session cookies as secure when COOKIE_SECURE is enabled", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });

    const invite = await store.invites.create({
      code: "INVITE-SECURE",
      createdByUserId: "system"
    });

    const response = await app.request(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "secure@example.com",
          password: "password123",
          inviteCode: invite.code
        })
      },
      {
        ...env,
        COOKIE_SECURE: "true"
      }
    );

    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("uses SESSION_TTL_HOURS from config for both the cookie and stored session expiry", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });

    const invite = await store.invites.create({
      code: "INVITE-TTL",
      createdByUserId: "system"
    });

    const before = Date.now();
    const response = await app.request(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "ttl@example.com",
          password: "password123",
          inviteCode: invite.code
        })
      },
      {
        ...env,
        SESSION_TTL_HOURS: "24"
      }
    );

    const cookie = response.headers.get("set-cookie") ?? "";
    const sessionId = cookie.match(/^([^=]+)=([^;]+)/)?.[2] ?? "";
    const session = await store.sessions.findById(sessionId);

    expect(cookie).toContain("Max-Age=86400");
    expect(session).not.toBeNull();
    expect(new Date(session!.expiresAt).getTime() - before).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 5000);
    expect(new Date(session!.expiresAt).getTime() - before).toBeGreaterThan(23 * 60 * 60 * 1000);
  });

  it("prevents anonymous mailbox creation", async () => {
    const app = createApp({ store: createInMemoryStore() });

    const response = await app.request(
      "/api/accounts",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: "temp" })
      },
      env
    );

    expect(response.status).toBe(401);
  });

  it("allows a signed-in user to create a mailbox and lists it back", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });

    const invite = await store.invites.create({
      code: "INVITE-2",
      createdByUserId: "system"
    });

    const registerResponse = await app.request(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "member@example.com",
          password: "password123",
          inviteCode: invite.code
        })
      },
      env
    );

    const cookie = registerResponse.headers.get("set-cookie") ?? "";

    const createResponse = await app.request(
      "/api/accounts",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie
        },
        body: JSON.stringify({ label: "Primary inbox" })
      },
      env
    );

    expect(createResponse.status).toBe(201);

    const listResponse = await app.request(
      "/api/accounts",
      {
        headers: { cookie }
      },
      env
    );

    const payload = (await listResponse.json()) as { mailboxes: Array<{ address: string }> };
    expect(payload.mailboxes).toHaveLength(1);
    expect(payload.mailboxes[0].address).toContain("@example.com");
  });

  it("returns an explicit origin for credentialed local CORS requests", async () => {
    const app = createApp({ store: createInMemoryStore() });

    const response = await app.request(
      "/api/auth/session",
      {
        method: "OPTIONS",
        headers: {
          origin: "http://127.0.0.1:5173",
          "access-control-request-method": "GET"
        }
      },
      env
    );

    expect(response.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:5173");
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("returns configured production origins for credentialed CORS requests", async () => {
    const app = createApp({ store: createInMemoryStore() });

    const allowedResponse = await app.request(
      "/api/auth/session",
      {
        method: "OPTIONS",
        headers: {
          origin: "https://mail.example.com",
          "access-control-request-method": "GET"
        }
      },
      {
        ...env,
        CORS_ALLOWED_ORIGINS: "https://mail.example.com, https://admin.example.com"
      }
    );

    expect(allowedResponse.headers.get("access-control-allow-origin")).toBe("https://mail.example.com");
    expect(allowedResponse.headers.get("access-control-allow-credentials")).toBe("true");

    const blockedResponse = await app.request(
      "/api/auth/session",
      {
        method: "OPTIONS",
        headers: {
          origin: "https://evil.example.com",
          "access-control-request-method": "GET"
        }
      },
      {
        ...env,
        CORS_ALLOWED_ORIGINS: "https://mail.example.com, https://admin.example.com"
      }
    );

    expect(blockedResponse.headers.get("access-control-allow-origin")).toBeNull();
  });
});
