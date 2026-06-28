import { afterEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app/create-app";
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
  COOKIE_SECURE: "false",
  GITHUB_OAUTH_CLIENT_ID: "github-client",
  GITHUB_OAUTH_CLIENT_SECRET: "github-secret",
  GITHUB_OAUTH_CALLBACK_URL: "https://mail.example.test/api/auth/oauth/github/callback",
  LINUXDO_OAUTH_CLIENT_ID: "linuxdo-client",
  LINUXDO_OAUTH_CLIENT_SECRET: "linuxdo-secret",
  LINUXDO_OAUTH_CALLBACK_URL: "https://mail.example.test/api/auth/oauth/linuxdo/callback"
} as const;

function readLocation(response: Response) {
  const location = response.headers.get("location");
  expect(location).toBeTruthy();
  return location ?? "";
}

function readSearchParam(location: string, key: string) {
  return new URL(location, "https://mail.example.test").searchParams.get(key) ?? "";
}

function mockGithubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url === "https://github.com/login/oauth/access_token") {
        return Response.json({ access_token: "github-access-token", token_type: "bearer" });
      }
      if (url === "https://api.github.com/user") {
        return Response.json({ id: 12345, login: "octo", name: "Octo User" });
      }
      if (url === "https://api.github.com/user/emails") {
        return Response.json([
          { email: "octo@example.com", primary: true, verified: true },
          { email: "unverified@example.com", primary: false, verified: false }
        ]);
      }
      throw new Error(`Unexpected fetch ${url}`);
    })
  );
}

function mockGithubFetchWithPublicEmailOnly() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url === "https://github.com/login/oauth/access_token") {
        return Response.json({ access_token: "github-access-token", token_type: "bearer" });
      }
      if (url === "https://api.github.com/user") {
        return Response.json({ id: 12345, login: "octo", name: "Octo User", email: "public-octo@example.com" });
      }
      if (url === "https://api.github.com/user/emails") {
        return Response.json([]);
      }
      throw new Error(`Unexpected fetch ${url}`);
    })
  );
}

function mockGithubFetchWithoutEmail() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url === "https://github.com/login/oauth/access_token") {
        return Response.json({ access_token: "github-access-token", token_type: "bearer" });
      }
      if (url === "https://api.github.com/user") {
        return Response.json({ id: 12345, login: "octo", name: "Octo User", email: null });
      }
      if (url === "https://api.github.com/user/emails") {
        return Response.json([]);
      }
      throw new Error(`Unexpected fetch ${url}`);
    })
  );
}

function mockLinuxDoFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url === "https://connect.linux.do/oauth2/token") {
        return Response.json({ access_token: "linuxdo-access-token", token_type: "bearer" });
      }
      if (url === "https://connect.linux.do/api/user") {
        return Response.json({
          sub: "linuxdo-123",
          username: "linuxdo-user",
          name: "LinuxDo User",
          email: "linuxdo@example.com"
        });
      }
      throw new Error(`Unexpected fetch ${url}`);
    })
  );
}

describe("oauth authentication", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("holds a new GitHub user behind invite finalization before creating a session", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });
    mockGithubFetch();

    const startResponse = await app.request("/api/auth/oauth/github/start?next=/dashboard", {}, env);
    const authorizeLocation = readLocation(startResponse);
    const state = readSearchParam(authorizeLocation, "state");

    expect(startResponse.status).toBe(302);
    expect(authorizeLocation).toContain("https://github.com/login/oauth/authorize");
    expect(readSearchParam(authorizeLocation, "client_id")).toBe("github-client");
    expect(state).toBeTruthy();

    const callbackResponse = await app.request(`/api/auth/oauth/github/callback?code=github-code&state=${state}`, {}, env);
    const callbackLocation = readLocation(callbackResponse);
    const ticket = readSearchParam(callbackLocation, "ticket");

    expect(callbackResponse.status).toBe(302);
    expect(callbackResponse.headers.get("set-cookie")).toBeNull();
    expect(callbackLocation).toContain("/login");
    expect(readSearchParam(callbackLocation, "oauth")).toBe("invite");
    expect(readSearchParam(callbackLocation, "provider")).toBe("github");
    expect(ticket).toBeTruthy();

    const rejectedResponse = await app.request(
      "/api/auth/oauth/github/finalize",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticket, inviteCode: "WRONG" })
      },
      env
    );

    expect(rejectedResponse.status).toBe(403);
    expect(await store.users.count()).toBe(0);

    const invite = await store.invites.create({ code: "INVITE-GITHUB", createdByUserId: "system" });
    const finalizedResponse = await app.request(
      "/api/auth/oauth/github/finalize",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticket, inviteCode: invite.code })
      },
      env
    );
    const finalizedPayload = (await finalizedResponse.json()) as { user: { email: string; name: string; role: string } };

    expect(finalizedResponse.status).toBe(200);
    expect(finalizedResponse.headers.get("set-cookie")).toContain("wemail_session=");
    expect(finalizedPayload.user).toMatchObject({
      email: "octo@example.com",
      name: "Octo User",
      role: "admin"
    });
  });

  it("uses the GitHub public profile email when the verified email list is empty", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });
    mockGithubFetchWithPublicEmailOnly();

    const startResponse = await app.request("/api/auth/oauth/github/start?next=/dashboard", {}, env);
    const authorizeLocation = readLocation(startResponse);
    const state = readSearchParam(authorizeLocation, "state");

    const callbackResponse = await app.request(`/api/auth/oauth/github/callback?code=github-code&state=${state}`, {}, env);
    const callbackLocation = readLocation(callbackResponse);

    expect(callbackResponse.status).toBe(302);
    expect(callbackLocation).toContain("/login");
    expect(readSearchParam(callbackLocation, "oauth")).toBe("invite");
    expect(readSearchParam(callbackLocation, "provider")).toBe("github");
    expect(readSearchParam(callbackLocation, "ticket")).toBeTruthy();
  });

  it("redirects GitHub callback failures back to login with a visible OAuth error", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });
    mockGithubFetchWithoutEmail();

    const startResponse = await app.request("/api/auth/oauth/github/start?next=/dashboard", {}, env);
    const authorizeLocation = readLocation(startResponse);
    const state = readSearchParam(authorizeLocation, "state");

    const callbackResponse = await app.request(`/api/auth/oauth/github/callback?code=github-code&state=${state}`, {}, env);
    const callbackLocation = readLocation(callbackResponse);

    expect(callbackResponse.status).toBe(302);
    expect(callbackLocation).toContain("/login");
    expect(readSearchParam(callbackLocation, "oauth")).toBe("error");
    expect(readSearchParam(callbackLocation, "provider")).toBe("github");
    expect(readSearchParam(callbackLocation, "reason")).toBe("email_required");
    expect(readSearchParam(callbackLocation, "next")).toBe("/dashboard");
  });

  it("logs in an existing LinuxDo user by verified email without asking for an invite", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });
    const invite = await store.invites.create({ code: "INVITE-LINUXDO", createdByUserId: "system" });

    const registerResponse = await app.request(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "linuxdo@example.com",
          name: "Existing User",
          password: "password123",
          inviteCode: invite.code
        })
      },
      env
    );
    expect(registerResponse.status).toBe(201);
    mockLinuxDoFetch();

    const startResponse = await app.request("/api/auth/oauth/linuxdo/start?next=/settings/profile", {}, env);
    const authorizeLocation = readLocation(startResponse);
    const state = readSearchParam(authorizeLocation, "state");

    expect(startResponse.status).toBe(302);
    expect(authorizeLocation).toContain("https://connect.linux.do/oauth2/authorize");
    expect(readSearchParam(authorizeLocation, "client_id")).toBe("linuxdo-client");

    const callbackResponse = await app.request(`/api/auth/oauth/linuxdo/callback?code=linuxdo-code&state=${state}`, {}, env);
    const callbackLocation = readLocation(callbackResponse);

    expect(callbackResponse.status).toBe(302);
    expect(callbackResponse.headers.get("set-cookie")).toContain("wemail_session=");
    expect(callbackLocation).toBe("/settings/profile");
  });

  it("sets OAuth session cookies on the configured parent domain", async () => {
    const store = createInMemoryStore();
    const app = createApp({ store });
    const invite = await store.invites.create({ code: "INVITE-LINUXDO-DOMAIN", createdByUserId: "system" });
    const domainEnv = { ...env, COOKIE_DOMAIN: ".example.test" };

    const registerResponse = await app.request(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "linuxdo@example.com",
          name: "Existing User",
          password: "password123",
          inviteCode: invite.code
        })
      },
      domainEnv
    );
    expect(registerResponse.headers.get("set-cookie")).toContain("Domain=.example.test");
    mockLinuxDoFetch();

    const startResponse = await app.request("/api/auth/oauth/linuxdo/start?next=/settings/profile", {}, domainEnv);
    const state = readSearchParam(readLocation(startResponse), "state");
    const callbackResponse = await app.request(
      `/api/auth/oauth/linuxdo/callback?code=linuxdo-code&state=${state}`,
      {},
      domainEnv
    );

    expect(callbackResponse.status).toBe(302);
    expect(callbackResponse.headers.get("set-cookie")).toContain("Domain=.example.test");
  });
});
