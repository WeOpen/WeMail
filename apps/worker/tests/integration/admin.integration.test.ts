import { describe, expect, it } from "vitest";

import { createWorkerTestHarness, registerUserAndGetCookie } from "../helpers/test-env";

describe("worker admin integration", () => {
  it("allows an admin session to create users and reflects quota-backed status", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie({
      email: "admin@example.com",
      inviteCode: "INVITE-ADMIN-USERS"
    });

    const createResponse = await app.request(
      "/api/users",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie
        },
        body: JSON.stringify({
          email: "New.User@Example.COM",
          password: "password123",
          role: "member"
        })
      },
      env
    );
    const createPayload = (await createResponse.json()) as {
      user: { id: string; email: string; role: string; status: string };
    };

    expect(createResponse.status).toBe(201);
    expect(createPayload.user).toMatchObject({
      email: "new.user@example.com",
      role: "member",
      status: "active"
    });

    const quotaResponse = await app.request(
      `/api/users/${createPayload.user.id}/quota`,
      {
        headers: { cookie }
      },
      env
    );
    const quotaPayload = (await quotaResponse.json()) as { quota: { dailyLimit: number; disabled: boolean } };

    expect(quotaPayload.quota).toMatchObject({ dailyLimit: 20, disabled: false });

    await app.request(
      `/api/users/${createPayload.user.id}/quota`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie
        },
        body: JSON.stringify({ disabled: true })
      },
      env
    );

    const listResponse = await app.request(
      "/api/users",
      {
        headers: { cookie }
      },
      env
    );
    const listPayload = (await listResponse.json()) as {
      users: Array<{ email: string; status: string }>;
    };

    expect(listPayload.users.find((user) => user.email === "new.user@example.com")).toMatchObject({
      status: "outbound_disabled"
    });
  });

  it("allows admins to update user roles", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie({
      email: "admin@example.com",
      inviteCode: "INVITE-ADMIN-ROLE"
    });

    const createResponse = await app.request(
      "/api/users",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie
        },
        body: JSON.stringify({
          email: "role-target@example.com",
          password: "password123",
          role: "member"
        })
      },
      env
    );
    const createPayload = (await createResponse.json()) as { user: { id: string } };

    const updateResponse = await app.request(
      `/api/users/${createPayload.user.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie
        },
        body: JSON.stringify({ role: "admin" })
      },
      env
    );
    const updatePayload = (await updateResponse.json()) as { user: { email: string; role: string } };

    expect(updateResponse.status).toBe(200);
    expect(updatePayload.user).toMatchObject({
      email: "role-target@example.com",
      role: "admin"
    });
  });

  it("allows an admin session to create and list invites", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie({
      email: "admin@example.com",
      inviteCode: "INVITE-ADMIN-1"
    });

    const createResponse = await app.request(
      "/api/users/invites",
      {
        method: "POST",
        headers: { cookie }
      },
      env
    );

    expect(createResponse.status).toBe(201);

    const listResponse = await app.request(
      "/api/users/invites",
      {
        headers: { cookie }
      },
      env
    );

    const payload = (await listResponse.json()) as {
      invites: Array<{ code: string; status: string }>;
    };

    expect(payload.invites.length).toBeGreaterThan(0);
    expect(payload.invites[0].code).toContain("INVITE-");
  });

  it("allows admins to manage mailbox domain suffixes", async () => {
    const { app, env, cookie, store } = await registerUserAndGetCookie({
      email: "admin@example.com",
      inviteCode: "INVITE-DOMAINS-1"
    });

    const defaultResponse = await app.request(
      "/api/system/domains",
      {
        headers: { cookie }
      },
      env
    );
    const defaultPayload = (await defaultResponse.json()) as {
      domains: Array<{ domain: string; allowedRoles: string[] }>;
      primaryDomain: string;
    };

    expect(defaultResponse.status).toBe(200);
    expect(defaultPayload).toEqual({
      domains: [{ domain: "example.com", allowedRoles: [] }],
      primaryDomain: "example.com"
    });

    const updateResponse = await app.request(
      "/api/system/domains",
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie
        },
        body: JSON.stringify({
          domains: [
            { domain: "member.example.com", allowedRoles: ["member"] },
            { domain: "admin.example.com", allowedRoles: ["admin"] },
            { domain: "member.example.com", allowedRoles: ["admin"] },
            { domain: "@QA.EXAMPLE.NET", allowedRoles: ["owner"] },
            { domain: "bad-.example.com", allowedRoles: ["member"] },
            "-bad.example.com"
          ]
        })
      },
      env
    );
    const updatePayload = (await updateResponse.json()) as {
      domains: Array<{ domain: string; allowedRoles: string[] }>;
      primaryDomain: string;
    };

    expect(updateResponse.status).toBe(200);
    expect(updatePayload).toEqual({
      domains: [
        { domain: "member.example.com", allowedRoles: ["member"] },
        { domain: "admin.example.com", allowedRoles: ["admin"] },
        { domain: "qa.example.net", allowedRoles: [] }
      ],
      primaryDomain: "member.example.com"
    });

    const createAdminMailboxResponse = await app.request(
      "/api/accounts",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie
        },
        body: JSON.stringify({ label: "QA Inbox" })
      },
      env
    );
    const adminMailboxPayload = (await createAdminMailboxResponse.json()) as { mailbox: { address: string } };

    expect(createAdminMailboxResponse.status).toBe(201);
    expect(adminMailboxPayload.mailbox.address).toMatch(/@admin\.example\.com$/);

    await store.invites.create({
      code: "INVITE-DOMAINS-MEMBER",
      createdByUserId: "system"
    });
    const memberRegisterResponse = await app.request(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "member@example.com",
          password: "password123",
          inviteCode: "INVITE-DOMAINS-MEMBER"
        })
      },
      env
    );
    const memberCookie = memberRegisterResponse.headers.get("set-cookie") ?? "";

    const createMemberMailboxResponse = await app.request(
      "/api/accounts",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: memberCookie
        },
        body: JSON.stringify({ label: "Member Inbox" })
      },
      env
    );
    const memberMailboxPayload = (await createMemberMailboxResponse.json()) as { mailbox: { address: string } };

    expect(createMemberMailboxResponse.status).toBe(201);
    expect(memberMailboxPayload.mailbox.address).toMatch(/@member\.example\.com$/);
  });

  it("rejects admin routes without an admin session", async () => {
    const { app, env } = createWorkerTestHarness();
    const response = await app.request("/api/users", {}, env);
    expect(response.status).toBe(403);
  });

  it("rejects feature toggle routes without an admin session", async () => {
    const { app, env } = createWorkerTestHarness();

    const getResponse = await app.request("/api/system/features", {}, env);
    expect(getResponse.status).toBe(403);

    const patchResponse = await app.request(
      "/api/system/features",
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outboundEnabled: false })
      },
      env
    );
    expect(patchResponse.status).toBe(403);

    const domainsResponse = await app.request("/api/system/domains", {}, env);
    expect(domainsResponse.status).toBe(403);
  });
});
