import { describe, expect, it } from "vitest";

import { runCleanup } from "../../src/app/create-app";
import { registerUserAndGetCookie } from "../helpers/test-env";

const validCreationPolicy = {
  defaultTagsEnabled: true,
  defaultTags: "运营, 高优先级",
  allowCreationOverride: true,
  defaultStatus: "enabled",
  requireCreatorNote: false
};

const validLifecyclePolicy = {
  inactiveDays: 30,
  inactiveAction: "archive",
  softDeleteRetentionDays: 30,
  allowHardDelete: false,
  requireSoftDeleteBeforeHardDelete: true
};

const validProtectionPolicy = {
  confirmStandardBulkActions: true,
  standardBulkLimit: 100,
  requireDangerPhrase: true,
  hardDeleteLimit: 20,
  auditLoggingEnabled: true
};

async function saveAccountPolicy(
  store: Awaited<ReturnType<typeof registerUserAndGetCookie>>["store"],
  policy: {
    creation?: Partial<typeof validCreationPolicy>;
    lifecycle?: Partial<typeof validLifecyclePolicy>;
    protection?: Partial<typeof validProtectionPolicy>;
  }
) {
  await store.accountSettings.save({
    creationJson: JSON.stringify({ ...validCreationPolicy, ...policy.creation }),
    lifecycleJson: JSON.stringify({ ...validLifecyclePolicy, ...policy.lifecycle }),
    protectionJson: JSON.stringify({ ...validProtectionPolicy, ...policy.protection })
  });
}

describe("worker mailbox integration", () => {
  it("lets admins page through all enabled accounts with creator metadata while members only see their own accounts", async () => {
    const { app, env, store, cookie: adminCookie } = await registerUserAndGetCookie({
      email: "admin@example.com",
      inviteCode: "INVITE-ACCOUNT-SELECTOR-ADMIN"
    });

    await store.invites.create({
      code: "INVITE-ACCOUNT-SELECTOR-MEMBER",
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
          inviteCode: "INVITE-ACCOUNT-SELECTOR-MEMBER"
        })
      },
      env
    );
    const memberCookie = memberRegisterResponse.headers.get("set-cookie") ?? "";
    const admin = await store.users.findByEmail("admin@example.com");
    const member = await store.users.findByEmail("member@example.com");
    expect(admin).not.toBeNull();
    expect(member).not.toBeNull();

    await store.mailboxes.create({
      userId: admin!.id,
      address: "admin-enabled@example.com",
      label: "Admin enabled"
    });
    await store.mailboxes.create({
      userId: member!.id,
      address: "member-enabled@example.com",
      label: "Member enabled"
    });
    const disabled = await store.mailboxes.create({
      userId: member!.id,
      address: "member-disabled@example.com",
      label: "Member disabled"
    });
    await store.mailboxes.update(disabled.id, { status: "disabled" });

    const adminResponse = await app.request("/api/accounts?page=1&pageSize=10", { headers: { cookie: adminCookie } }, env);
    const adminPayload = (await adminResponse.json()) as {
      mailboxes: Array<{ address: string; createdBy: string | null; createdByName: string | null }>;
      total: number;
    };

    expect(adminResponse.status).toBe(200);
    expect(adminPayload.mailboxes.map((mailbox) => mailbox.address)).toEqual(
      expect.arrayContaining(["admin-enabled@example.com", "member-enabled@example.com"])
    );
    expect(adminPayload.mailboxes.map((mailbox) => mailbox.address)).not.toContain("member-disabled@example.com");
    expect(adminPayload.mailboxes.find((mailbox) => mailbox.address === "member-enabled@example.com")).toMatchObject({
      createdBy: member!.id,
      createdByName: "member"
    });

    const memberResponse = await app.request("/api/accounts?page=1&pageSize=10", { headers: { cookie: memberCookie } }, env);
    const memberPayload = (await memberResponse.json()) as { mailboxes: Array<{ address: string; createdBy?: string | null }> };

    expect(memberResponse.status).toBe(200);
    expect(memberPayload.mailboxes.map((mailbox) => mailbox.address)).toEqual(["member-enabled@example.com"]);
    expect(memberPayload.mailboxes[0].createdBy).toBeUndefined();
  });

  it("returns role-available account domains and creates a mailbox with the selected domain", async () => {
    const { app, env, store } = await registerUserAndGetCookie({
      email: "admin@example.com",
      inviteCode: "INVITE-MAILBOX-DOMAINS-ADMIN"
    });

    await store.mailDomains.saveAll([
      { domain: "member.example.com", allowedRoles: ["member"] },
      { domain: "admin.example.com", allowedRoles: ["admin"] },
      { domain: "shared.example.net", allowedRoles: [] }
    ]);
    await store.invites.create({
      code: "INVITE-MAILBOX-DOMAINS-MEMBER",
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
          inviteCode: "INVITE-MAILBOX-DOMAINS-MEMBER"
        })
      },
      env
    );
    const memberCookie = memberRegisterResponse.headers.get("set-cookie") ?? "";

    const domainsResponse = await app.request(
      "/api/accounts/domains",
      {
        headers: { cookie: memberCookie }
      },
      env
    );
    const domainsPayload = (await domainsResponse.json()) as {
      domains: Array<{ domain: string; allowedRoles: string[] }>;
      primaryDomain: string;
    };

    expect(domainsResponse.status).toBe(200);
    expect(domainsPayload).toEqual({
      domains: [
        { domain: "member.example.com", allowedRoles: ["member"] },
        { domain: "shared.example.net", allowedRoles: [] }
      ],
      primaryDomain: "member.example.com"
    });

    const createResponse = await app.request(
      "/api/accounts",
      {
        method: "POST",
        headers: {
          cookie: memberCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ label: "Selected", domain: "shared.example.net" })
      },
      env
    );
    const createPayload = (await createResponse.json()) as { mailbox: { address: string } };

    expect(createResponse.status).toBe(201);
    expect(createPayload.mailbox.address).toMatch(/@shared\.example\.net$/);

    const unavailableResponse = await app.request(
      "/api/accounts",
      {
        method: "POST",
        headers: {
          cookie: memberCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ label: "Blocked", domain: "admin.example.com" })
      },
      env
    );

    expect(unavailableResponse.status).toBe(403);
  });

  it("enforces mailbox limits for an authenticated user", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie({
      email: "limit@example.com",
      inviteCode: "INVITE-MAILBOX-LIMIT"
    });

    for (let index = 0; index < 5; index += 1) {
      const response = await app.request(
        "/api/accounts",
        {
          method: "POST",
          headers: {
            cookie,
            "content-type": "application/json"
          },
          body: JSON.stringify({ label: `Mailbox ${index + 1}` })
        },
        env
      );

      expect(response.status).toBe(201);
    }

    const overflow = await app.request(
      "/api/accounts",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ label: "Mailbox 6" })
      },
      env
    );

    expect(overflow.status).toBe(403);
  });

  it("does not count soft-deleted mailboxes against the creation limit", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie({
      email: "soft-delete-limit@example.com",
      inviteCode: "INVITE-MAILBOX-SOFT-DELETE-LIMIT"
    });
    const limitedEnv = { ...env, MAILBOX_LIMIT: "1" };

    const createResponse = await app.request(
      "/api/accounts",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ label: "Temporary" })
      },
      limitedEnv
    );
    const createPayload = (await createResponse.json()) as { mailbox: { id: string } };

    expect(createResponse.status).toBe(201);

    const deleteResponse = await app.request(
      `/api/accounts/${createPayload.mailbox.id}`,
      {
        method: "DELETE",
        headers: { cookie }
      },
      limitedEnv
    );

    expect(deleteResponse.status).toBe(200);

    const replacementResponse = await app.request(
      "/api/accounts",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ label: "Replacement" })
      },
      limitedEnv
    );

    expect(replacementResponse.status).toBe(201);
  });

  it("rejects invalid account policy updates instead of persisting partial garbage", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie({
      email: "admin@example.com",
      inviteCode: "INVITE-ACCOUNT-POLICY-INVALID"
    });

    const response = await app.request(
      "/api/accounts/settings",
      {
        method: "PUT",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          lifecycle: {
            inactiveDays: 0
          }
        })
      },
      env
    );

    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/inactiveDays/i);
  });

  it("applies account creation policy defaults and validates creator requirements", async () => {
    const { app, env, cookie, store } = await registerUserAndGetCookie({
      email: "admin@example.com",
      inviteCode: "INVITE-ACCOUNT-CREATION-POLICY"
    });

    await saveAccountPolicy(store, {
      creation: {
        defaultTagsEnabled: true,
        defaultTags: "运营, 高优先级",
        allowCreationOverride: false,
        defaultStatus: "archived",
        requireCreatorNote: true
      }
    });

    const missingNoteResponse = await app.request(
      "/api/accounts",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ label: "Needs Note" })
      },
      env
    );

    expect(missingNoteResponse.status).toBe(400);

    const overrideResponse = await app.request(
      "/api/accounts",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          label: "Override Blocked",
          creatorNote: "临时活动收件",
          status: "enabled",
          tags: ["临时"]
        })
      },
      env
    );

    expect(overrideResponse.status).toBe(400);

    const createResponse = await app.request(
      "/api/accounts",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          label: "Policy Applied",
          creatorNote: "长期运营收件"
        })
      },
      env
    );

    expect(createResponse.status).toBe(201);

    const listResponse = await app.request(
      "/api/accounts/list?page=1&pageSize=10",
      {
        headers: { cookie }
      },
      env
    );
    const listPayload = (await listResponse.json()) as {
      accounts: Array<{ label: string; status: string; tags: string[] }>;
    };
    const createdAccount = listPayload.accounts.find((account) => account.label === "Policy Applied");

    expect(createdAccount).toMatchObject({
      status: "archived",
      tags: ["运营", "高优先级"]
    });
  });

  it("soft-deletes normal deletes and enforces hard-delete policy on bulk deletion", async () => {
    const { app, env, cookie, store } = await registerUserAndGetCookie({
      email: "admin@example.com",
      inviteCode: "INVITE-ACCOUNT-DELETE-POLICY"
    });

    await saveAccountPolicy(store, {
      lifecycle: {
        allowHardDelete: false,
        requireSoftDeleteBeforeHardDelete: true
      },
      protection: {
        hardDeleteLimit: 1,
        requireDangerPhrase: true,
        auditLoggingEnabled: true
      }
    });

    async function createAccount(label: string) {
      const response = await app.request(
        "/api/accounts",
        {
          method: "POST",
          headers: {
            cookie,
            "content-type": "application/json"
          },
          body: JSON.stringify({ label })
        },
        env
      );
      const payload = (await response.json()) as { mailbox: { id: string } };
      expect(response.status).toBe(201);
      return payload.mailbox.id;
    }

    const firstAccountId = await createAccount("Soft Delete Me");
    const secondAccountId = await createAccount("Hard Delete Blocked");

    const hardDeleteDisabledResponse = await app.request(
      "/api/accounts/bulk-delete",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          accountIds: [firstAccountId],
          mode: "hard",
          confirmationPhrase: "DELETE 1 ACCOUNTS"
        })
      },
      env
    );

    expect(hardDeleteDisabledResponse.status).toBe(403);

    const softDeleteResponse = await app.request(
      `/api/accounts/${firstAccountId}`,
      {
        method: "DELETE",
        headers: { cookie }
      },
      env
    );

    expect(softDeleteResponse.status).toBe(200);

    const softDeletedListResponse = await app.request(
      "/api/accounts/list?page=1&pageSize=10&status=soft_deleted",
      {
        headers: { cookie }
      },
      env
    );
    const softDeletedPayload = (await softDeletedListResponse.json()) as {
      accounts: Array<{ id: string; status: string; deletedAt: string | null }>;
    };

    expect(softDeletedPayload.accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: firstAccountId,
          status: "soft_deleted",
          deletedAt: expect.any(String)
        })
      ])
    );

    await saveAccountPolicy(store, {
      lifecycle: {
        allowHardDelete: true,
        requireSoftDeleteBeforeHardDelete: true
      },
      protection: {
        hardDeleteLimit: 1,
        requireDangerPhrase: true,
        auditLoggingEnabled: true
      }
    });

    const hardDeleteBeforeSoftDeleteResponse = await app.request(
      "/api/accounts/bulk-delete",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          accountIds: [secondAccountId],
          mode: "hard",
          confirmationPhrase: "DELETE 1 ACCOUNTS"
        })
      },
      env
    );

    expect(hardDeleteBeforeSoftDeleteResponse.status).toBe(409);

    const hardDeleteResponse = await app.request(
      "/api/accounts/bulk-delete",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          accountIds: [firstAccountId],
          mode: "hard",
          confirmationPhrase: "DELETE 1 ACCOUNTS"
        })
      },
      env
    );
    const hardDeletePayload = (await hardDeleteResponse.json()) as { ok: boolean; deleted: number };

    expect(hardDeleteResponse.status).toBe(200);
    expect(hardDeletePayload).toEqual({ ok: true, deleted: 1 });

    const afterHardDeleteResponse = await app.request(
      "/api/accounts/list?page=1&pageSize=10&status=soft_deleted",
      {
        headers: { cookie }
      },
      env
    );
    const afterHardDeletePayload = (await afterHardDeleteResponse.json()) as {
      accounts: Array<{ id: string }>;
    };

    expect(afterHardDeletePayload.accounts.map((account) => account.id)).not.toContain(firstAccountId);
  });

  it("purges soft-deleted accounts after the configured retention window during cleanup", async () => {
    const { env, store } = await registerUserAndGetCookie({
      email: "admin@example.com",
      inviteCode: "INVITE-ACCOUNT-RETENTION"
    });
    const users = await store.users.list({ page: 1, pageSize: 1 });
    const adminUserId = users.users[0].id;

    await saveAccountPolicy(store, {
      lifecycle: {
        allowHardDelete: true,
        softDeleteRetentionDays: 7
      }
    });

    const oldSoftDeleted = await store.mailboxes.create({
      userId: adminUserId,
      address: "old-soft-deleted@example.com",
      label: "Old soft deleted"
    });
    const recentSoftDeleted = await store.mailboxes.create({
      userId: adminUserId,
      address: "recent-soft-deleted@example.com",
      label: "Recent soft deleted"
    });

    await store.mailboxes.update(oldSoftDeleted.id, {
      status: "soft_deleted",
      deletedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    });
    await store.mailboxes.update(recentSoftDeleted.id, {
      status: "soft_deleted",
      deletedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    });

    const result = await runCleanup(store, env);

    expect(result.deletedAccounts).toBe(1);
    expect(await store.mailboxes.findDetailById(oldSoftDeleted.id)).toBeNull();
    expect(await store.mailboxes.findDetailById(recentSoftDeleted.id)).toMatchObject({
      id: recentSoftDeleted.id,
      status: "soft_deleted"
    });
  });
});
