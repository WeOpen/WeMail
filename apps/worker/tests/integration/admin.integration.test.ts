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
    const quotaPayload = (await quotaResponse.json()) as { quota: { apiDailyLimit: number; dailyLimit: number; disabled: boolean } };

    expect(quotaPayload.quota).toMatchObject({ apiDailyLimit: 20000, dailyLimit: 20, disabled: false });

    await app.request(
      `/api/users/${createPayload.user.id}/quota`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie
        },
        body: JSON.stringify({ apiDailyLimit: 5000, disabled: true })
      },
      env
    );

    const updatedQuotaResponse = await app.request(
      `/api/users/${createPayload.user.id}/quota`,
      {
        headers: { cookie }
      },
      env
    );
    const updatedQuotaPayload = (await updatedQuotaResponse.json()) as { quota: { apiDailyLimit: number; disabled: boolean } };
    expect(updatedQuotaPayload.quota).toMatchObject({ apiDailyLimit: 5000, disabled: true });

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

  it("lets admins update, disable, list, and delete mailbox accounts", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie({
      email: "admin@example.com",
      inviteCode: "INVITE-ACCOUNT-MUTATIONS"
    });

    const createResponse = await app.request(
      "/api/accounts",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie
        },
        body: JSON.stringify({ label: "operations" })
      },
      env
    );
    const createPayload = (await createResponse.json()) as { mailbox: { id: string; address: string } };

    expect(createResponse.status).toBe(201);

    const updateResponse = await app.request(
      `/api/accounts/${createPayload.mailbox.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie
        },
        body: JSON.stringify({ label: "ops-desk", status: "disabled" })
      },
      env
    );
    const updatePayload = (await updateResponse.json()) as {
      account: { address: string; createdByName: string | null; label: string; status: string };
    };

    expect(updateResponse.status).toBe(200);
    expect(updatePayload.account).toMatchObject({
      address: createPayload.mailbox.address,
      createdByName: "admin",
      label: "ops-desk",
      status: "disabled"
    });

    const listResponse = await app.request(
      "/api/accounts/list?page=1&pageSize=10&status=disabled",
      {
        headers: { cookie }
      },
      env
    );
    const listPayload = (await listResponse.json()) as {
      accounts: Array<{ id: string; label: string; status: string }>;
      total: number;
    };

    expect(listResponse.status).toBe(200);
    expect(listPayload.total).toBe(1);
    expect(listPayload.accounts[0]).toMatchObject({
      id: createPayload.mailbox.id,
      label: "ops-desk",
      status: "disabled"
    });

    const anomalyResponse = await app.request(
      "/api/accounts/list?page=1&pageSize=10&quickFilter=anomaly",
      {
        headers: { cookie }
      },
      env
    );
    const anomalyPayload = (await anomalyResponse.json()) as {
      accounts: Array<{ id: string; status: string }>;
      total: number;
    };

    expect(anomalyResponse.status).toBe(200);
    expect(anomalyPayload.total).toBe(1);
    expect(anomalyPayload.accounts[0]).toMatchObject({
      id: createPayload.mailbox.id,
      status: "disabled"
    });

    const deleteResponse = await app.request(
      `/api/accounts/${createPayload.mailbox.id}`,
      {
        method: "DELETE",
        headers: { cookie }
      },
      env
    );

    expect(deleteResponse.status).toBe(200);

    const softDeletedListResponse = await app.request(
      "/api/accounts/list?page=1&pageSize=10&status=soft_deleted",
      {
        headers: { cookie }
      },
      env
    );
    const softDeletedListPayload = (await softDeletedListResponse.json()) as {
      accounts: Array<{ id: string; status: string; deletedAt: string | null }>;
      total: number;
    };

    expect(softDeletedListPayload.total).toBe(1);
    expect(softDeletedListPayload.accounts[0]).toMatchObject({
      id: createPayload.mailbox.id,
      status: "soft_deleted",
      deletedAt: expect.any(String)
    });
  });

  it("filters mailbox accounts by active range, policy-backed inactivity, and safe pagination", async () => {
    const { app, env, cookie, store } = await registerUserAndGetCookie({
      email: "admin@example.com",
      inviteCode: "INVITE-ACCOUNT-FILTERS"
    });
    const users = await store.users.list({ page: 1, pageSize: 1 });
    const adminUserId = users.users[0].id;

    await store.accountSettings.save({
      creationJson: JSON.stringify({}),
      lifecycleJson: JSON.stringify({ inactiveDays: 120 }),
      protectionJson: JSON.stringify({})
    });

    const recentMailbox = await store.mailboxes.create({
      userId: adminUserId,
      address: "recent-active@example.com",
      label: "Recent",
      lastActiveAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    } as Parameters<typeof store.mailboxes.create>[0] & { lastActiveAt: string });
    const oldMailbox = await store.mailboxes.create({
      userId: adminUserId,
      address: "old-active@example.com",
      label: "Old",
      lastActiveAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString()
    } as Parameters<typeof store.mailboxes.create>[0] & { lastActiveAt: string });
    await store.mailboxes.create({
      userId: adminUserId,
      address: "never-active@example.com",
      label: "Never"
    });

    const activeRangeResponse = await app.request(
      "/api/accounts/list?page=1&pageSize=10&activeRange=90d",
      {
        headers: { cookie }
      },
      env
    );
    const activeRangePayload = (await activeRangeResponse.json()) as {
      accounts: Array<{ id: string }>;
      total: number;
    };

    expect(activeRangeResponse.status).toBe(200);
    expect(activeRangePayload.total).toBe(1);
    expect(activeRangePayload.accounts[0].id).toBe(recentMailbox.id);

    const inactiveResponse = await app.request(
      "/api/accounts/list?page=1&pageSize=10&quickFilter=inactive",
      {
        headers: { cookie }
      },
      env
    );
    const inactivePayload = (await inactiveResponse.json()) as {
      accounts: Array<{ id: string }>;
      total: number;
    };

    expect(inactiveResponse.status).toBe(200);
    expect(inactivePayload.total).toBe(2);
    expect(inactivePayload.accounts.map((account) => account.id)).toContain(oldMailbox.id);
    expect(inactivePayload.accounts.map((account) => account.id)).not.toContain(recentMailbox.id);

    const clampedResponse = await app.request(
      "/api/accounts/list?page=0&pageSize=0",
      {
        headers: { cookie }
      },
      env
    );
    const clampedPayload = (await clampedResponse.json()) as { accounts: unknown[]; total: number };

    expect(clampedResponse.status).toBe(200);
    expect(clampedPayload.total).toBe(3);
    expect(clampedPayload.accounts.length).toBeGreaterThan(0);
  });

  it("returns a user settings summary independent of the paginated user list", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie({
      email: "admin@example.com",
      inviteCode: "INVITE-ADMIN-SUMMARY"
    });

    let disabledUserId = "";
    for (let index = 1; index <= 11; index += 1) {
      const createResponse = await app.request(
        "/api/users",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie
          },
          body: JSON.stringify({
            email: `summary-${String(index).padStart(2, "0")}@example.com`,
            name: `Summary ${index}`,
            password: "password123",
            role: "member"
          })
        },
        env
      );
      const createPayload = (await createResponse.json()) as { user: { id: string } };
      if (index === 11) disabledUserId = createPayload.user.id;
    }

    await app.request(
      `/api/users/${disabledUserId}/status`,
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

    const paginatedResponse = await app.request("/api/users?page=1&pageSize=10", { headers: { cookie } }, env);
    const paginatedPayload = (await paginatedResponse.json()) as { users: unknown[]; total: number };

    expect(paginatedPayload.users).toHaveLength(10);
    expect(paginatedPayload.total).toBe(12);

    const summaryResponse = await app.request("/api/users/summary", { headers: { cookie } }, env);
    const summaryPayload = (await summaryResponse.json()) as {
      quotaUsers: unknown[];
      stats: { active: number; total: number };
    };

    expect(summaryResponse.status).toBe(200);
    expect(summaryPayload.stats).toEqual({ active: 11, total: 12 });
    expect(summaryPayload.quotaUsers).toHaveLength(12);
  });

  it("paginates admin invites and mailboxes on the backend", async () => {
    const { app, env, cookie, store } = await registerUserAndGetCookie({
      email: "admin@example.com",
      inviteCode: "INVITE-ADMIN-PAGINATION"
    });
    const users = await store.users.list({ page: 1, pageSize: 1 });
    const adminUserId = users.users[0].id;

    for (let index = 1; index <= 6; index += 1) {
      await store.invites.create({
        code: `INVITE-PAGE-${index}`,
        createdByUserId: adminUserId
      });
      await store.mailboxes.create({
        userId: adminUserId,
        address: `mailbox-${index}@example.com`,
        label: `Mailbox ${index}`
      });
    }

    const invitesResponse = await app.request("/api/users/invites?page=2&pageSize=5", { headers: { cookie } }, env);
    const invitesPayload = (await invitesResponse.json()) as {
      available: number;
      invites: unknown[];
      page: number;
      pageSize: number;
      total: number;
    };

    expect(invitesPayload).toMatchObject({
      available: 6,
      page: 2,
      pageSize: 5,
      total: 7
    });
    expect(invitesPayload.invites).toHaveLength(2);

    const mailboxesResponse = await app.request("/api/users/accounts?page=2&pageSize=5", { headers: { cookie } }, env);
    const mailboxesPayload = (await mailboxesResponse.json()) as {
      mailboxes: unknown[];
      page: number;
      pageSize: number;
      total: number;
    };

    expect(mailboxesPayload).toMatchObject({
      page: 2,
      pageSize: 5,
      total: 6
    });
    expect(mailboxesPayload.mailboxes).toHaveLength(1);
  });

  it("protects invite disabling when the invite is missing or already redeemed", async () => {
    const { app, env, cookie, store } = await registerUserAndGetCookie({
      email: "admin@example.com",
      inviteCode: "INVITE-ADMIN-PROTECT"
    });
    const users = await store.users.list({ page: 1, pageSize: 1 });
    const adminUserId = users.users[0].id;
    const redeemedInvite = await store.invites.create({
      code: "INVITE-REDEEMED-PROTECT",
      createdByUserId: adminUserId
    });
    await store.invites.redeem(redeemedInvite.code, adminUserId);

    const missingResponse = await app.request("/api/users/invites/not-found", { method: "DELETE", headers: { cookie } }, env);
    expect(missingResponse.status).toBe(404);

    const redeemedResponse = await app.request(
      `/api/users/invites/${redeemedInvite.id}`,
      {
        method: "DELETE",
        headers: { cookie }
      },
      env
    );
    expect(redeemedResponse.status).toBe(409);
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
