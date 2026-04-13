import { describe, expect, it } from "vitest";

import { createApp } from "../src/app/create-app";
import { createInMemoryStore } from "../src/infrastructure/persistence/in-memory";

const env = {
  APP_NAME: "wemail",
  COOKIE_NAME: "wemail_session",
  DEFAULT_MAIL_DOMAIN: "example.com",
  MAILBOX_LIMIT: "5",
  MESSAGE_RETENTION_DAYS: "7",
  OUTBOUND_DAILY_LIMIT: "20",
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

describe("worker app", () => {
  it("requires a valid invite for registration and sets a session cookie", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });

    const invite = await store.invites.create({
      code: "INVITE-1",
      createdByUserId: "system"
    });

    const response = await app.request(
      "/auth/register",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "admin@example.com",
          password: "password123",
          inviteCode: invite.code
        })
      },
      env
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("set-cookie")).toContain("wemail_session=");
  });

  it("marks session cookies as secure when COOKIE_SECURE is enabled", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });

    const invite = await store.invites.create({
      code: "INVITE-SECURE",
      createdByUserId: "system"
    });

    const response = await app.request(
      "/auth/register",
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
      "/auth/register",
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
      "/api/mailboxes",
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
      "/auth/register",
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
      "/api/mailboxes",
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
      "/api/mailboxes",
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
      "/auth/session",
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
});
