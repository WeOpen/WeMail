import { describe, expect, it } from "vitest";

import { createWorkerTestHarness, registerUserAndGetCookie } from "../helpers/test-env";

describe("worker admin integration", () => {
  it("allows an admin session to create users without coupling quota disabled to user status", async () => {
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
          name: "New User",
          password: "password123",
          role: "member"
        })
      },
      env
    );
    const createPayload = (await createResponse.json()) as {
      user: { id: string; email: string; name: string; role: string; status: string; createdAt: string; updatedAt: string };
    };

    expect(createResponse.status).toBe(201);
    expect(createPayload.user).toMatchObject({
      email: "new.user@example.com",
      name: "New User",
      role: "member",
      status: "active"
    });
    expect(createPayload.user.updatedAt).toBe(createPayload.user.createdAt);

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
      users: Array<{ email: string; name: string; status: string; updatedAt: string }>;
    };

    expect(listPayload.users.find((user) => user.email === "new.user@example.com")).toMatchObject({
      name: "New User",
      status: "active"
    });
    expect(listPayload.users.find((user) => user.email === "new.user@example.com")?.updatedAt).toEqual(expect.any(String));
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
          name: "Role Target",
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
    const updatePayload = (await updateResponse.json()) as { user: { email: string; name: string; role: string; updatedAt: string } };

    expect(updateResponse.status).toBe(200);
    expect(updatePayload.user).toMatchObject({
      email: "role-target@example.com",
      name: "Role Target",
      role: "admin"
    });
    expect(updatePayload.user.updatedAt).toEqual(expect.any(String));
  });

  it("allows admins to update profile, reset password, toggle status, and delete users", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie({
      email: "admin@example.com",
      inviteCode: "INVITE-ADMIN-LIFECYCLE"
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
          email: "lifecycle@example.com",
          name: "Lifecycle User",
          password: "password123",
          role: "member"
        })
      },
      env
    );
    const createPayload = (await createResponse.json()) as { user: { id: string } };

    const profileResponse = await app.request(
      `/api/users/${createPayload.user.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie
        },
        body: JSON.stringify({ name: "Renamed User" })
      },
      env
    );
    const profilePayload = (await profileResponse.json()) as { user: { name: string } };

    expect(profileResponse.status).toBe(200);
    expect(profilePayload.user.name).toBe("Renamed User");

    const resetResponse = await app.request(
      `/api/users/${createPayload.user.id}/password`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie
        },
        body: JSON.stringify({ password: "newpassword123" })
      },
      env
    );

    expect(resetResponse.status).toBe(200);

    const oldPasswordLogin = await app.request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "lifecycle@example.com", password: "password123" })
      },
      env
    );
    const newPasswordLogin = await app.request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "lifecycle@example.com", password: "newpassword123" })
      },
      env
    );

    expect(oldPasswordLogin.status).toBe(401);
    expect(newPasswordLogin.status).toBe(200);

    const disableResponse = await app.request(
      `/api/users/${createPayload.user.id}/status`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie
        },
        body: JSON.stringify({ status: "disabled" })
      },
      env
    );
    const disablePayload = (await disableResponse.json()) as { user: { status: string } };

    expect(disableResponse.status).toBe(200);
    expect(disablePayload.user.status).toBe("disabled");

    const disabledLogin = await app.request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "lifecycle@example.com", password: "newpassword123" })
      },
      env
    );

    expect(disabledLogin.status).toBe(403);

    const enableResponse = await app.request(
      `/api/users/${createPayload.user.id}/status`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie
        },
        body: JSON.stringify({ status: "active" })
      },
      env
    );
    const enablePayload = (await enableResponse.json()) as { user: { status: string } };

    expect(enableResponse.status).toBe(200);
    expect(enablePayload.user.status).toBe("active");

    const deleteResponse = await app.request(
      `/api/users/${createPayload.user.id}`,
      {
        method: "DELETE",
        headers: { cookie }
      },
      env
    );

    expect(deleteResponse.status).toBe(200);

    const listResponse = await app.request("/api/users", { headers: { cookie } }, env);
    const listPayload = (await listResponse.json()) as { users: Array<{ email: string }> };
    expect(listPayload.users.some((user) => user.email === "lifecycle@example.com")).toBe(false);
  });

  it("paginates and filters admin user lists on the backend", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie({
      email: "admin@example.com",
      inviteCode: "INVITE-ADMIN-PAGED-USERS"
    });

    for (const index of Array.from({ length: 12 }, (_, itemIndex) => itemIndex + 1)) {
      const suffix = String(index).padStart(2, "0");
      const response = await app.request(
        "/api/users",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie
          },
          body: JSON.stringify({
            email: `paged-${suffix}@example.com`,
            name: `Paged User ${suffix}`,
            password: "password123",
            role: "member"
          })
        },
        env
      );

      expect(response.status).toBe(201);
    }

    const pageResponse = await app.request(
      "/api/users?page=2&pageSize=10&search=paged&role=member&status=active",
      {
        headers: { cookie }
      },
      env
    );
    const pagePayload = (await pageResponse.json()) as {
      users: Array<{ email: string; name: string }>;
      total: number;
      page: number;
      pageSize: number;
    };

    expect(pageResponse.status).toBe(200);
    expect(pagePayload).toMatchObject({
      total: 12,
      page: 2,
      pageSize: 10
    });
    expect(pagePayload.users.map((user) => user.email)).toEqual([
      "paged-11@example.com",
      "paged-12@example.com"
    ]);

    const searchResponse = await app.request(
      "/api/users?page=1&pageSize=10&search=Paged%20User%2012&role=member&status=active",
      {
        headers: { cookie }
      },
      env
    );
    const searchPayload = (await searchResponse.json()) as {
      users: Array<{ email: string; name: string }>;
      total: number;
    };

    expect(searchResponse.status).toBe(200);
    expect(searchPayload.total).toBe(1);
    expect(searchPayload.users[0]).toMatchObject({
      email: "paged-12@example.com",
      name: "Paged User 12"
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
