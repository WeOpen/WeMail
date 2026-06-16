import { describe, expect, it, vi } from "vitest";

import { createWorkerTestHarness } from "./helpers/test-env";

async function registerUser(options: {
  app: ReturnType<typeof createWorkerTestHarness>["app"];
  email: string;
  env: ReturnType<typeof createWorkerTestHarness>["env"] & { CACHE?: unknown };
  store: ReturnType<typeof createWorkerTestHarness>["store"];
}) {
  const invite = await options.store.invites.create({
    code: `INVITE-${options.email}`,
    createdByUserId: "system"
  });

  const response = await options.app.request(
    "/api/auth/register",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: options.email,
        password: "password123",
        inviteCode: invite.code
      })
    },
    options.env
  );

  return response.headers.get("set-cookie") ?? "";
}

function createMockKv() {
  const values = new Map<string, string>();
  return {
    delete: vi.fn(async (key: string) => {
      values.delete(key);
    }),
    get: vi.fn(async (key: string, type?: "json" | "text") => {
      const value = values.get(key) ?? null;
      if (type === "json" && value) return JSON.parse(value) as unknown;
      return value;
    }),
    put: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    })
  };
}

describe("dictionary catalog", () => {
  it("returns default dictionaries and filters disabled items after admin updates", async () => {
    const { app, env, store } = createWorkerTestHarness();
    const adminCookie = await registerUser({ app, env, store, email: "admin@example.com" });
    const memberCookie = await registerUser({ app, env, store, email: "dictionary-member@example.com" });

    const initialResponse = await app.request(
      "/api/dictionaries?groups=announcement.status,mailbox.status,user.role",
      {
        headers: { cookie: memberCookie }
      },
      env
    );

    expect(initialResponse.status).toBe(200);

    const initialPayload = (await initialResponse.json()) as {
      dictionaries: Array<{
        groupKey: string;
        items: Array<{ enabled: boolean; label: string; sortOrder: number; value: string }>;
        label: string;
      }>;
    };

    expect(initialPayload.dictionaries.map((dictionary) => dictionary.groupKey)).toEqual([
      "announcement.status",
      "mailbox.status",
      "user.role"
    ]);
    expect(initialPayload.dictionaries.find((dictionary) => dictionary.groupKey === "announcement.status")?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ enabled: true, label: "已发布", value: "已发布" }),
        expect.objectContaining({ enabled: true, label: "已归档", value: "已归档" })
      ])
    );
    expect(initialPayload.dictionaries.find((dictionary) => dictionary.groupKey === "mailbox.status")?.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "已启用", value: "enabled" })])
    );

    const deniedResponse = await app.request(
      `/api/dictionaries/announcement.type/items/${encodeURIComponent("运营通知")}`,
      {
        method: "PATCH",
        headers: {
          cookie: memberCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ enabled: false })
      },
      env
    );

    expect(deniedResponse.status).toBe(403);

    const updateResponse = await app.request(
      `/api/dictionaries/announcement.type/items/${encodeURIComponent("运营通知")}`,
      {
        method: "PATCH",
        headers: {
          cookie: adminCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ enabled: false })
      },
      env
    );
    const updatePayload = (await updateResponse.json()) as { item: { enabled: boolean; value: string } };

    expect(updateResponse.status).toBe(200);
    expect(updatePayload.item).toMatchObject({ enabled: false, value: "运营通知" });

    const memberResponse = await app.request("/api/dictionaries?groups=announcement.type", { headers: { cookie: memberCookie } }, env);
    const memberPayload = (await memberResponse.json()) as {
      dictionaries: Array<{ items: Array<{ value: string }> }>;
    };
    expect(memberResponse.status).toBe(200);
    expect(memberPayload.dictionaries[0]?.items.map((item) => item.value)).not.toContain("运营通知");

    const adminResponse = await app.request(
      "/api/dictionaries?groups=announcement.type&includeDisabled=true",
      { headers: { cookie: adminCookie } },
      env
    );
    const adminPayload = (await adminResponse.json()) as {
      dictionaries: Array<{ items: Array<{ enabled: boolean; value: string }> }>;
    };

    expect(adminResponse.status).toBe(200);
    expect(adminPayload.dictionaries[0]?.items).toContainEqual(expect.objectContaining({ enabled: false, value: "运营通知" }));
  });

  it("caches dictionary reads in KV and invalidates them after admin updates", async () => {
    const { app, env, store } = createWorkerTestHarness();
    const cache = createMockKv();
    const cachedEnv = { ...env, CACHE: cache };
    const adminCookie = await registerUser({ app, env: cachedEnv, store, email: "admin@example.com" });
    const memberCookie = await registerUser({ app, env: cachedEnv, store, email: "dictionary-cache-member@example.com" });

    const firstResponse = await app.request("/api/dictionaries?groups=announcement.type", { headers: { cookie: memberCookie } }, cachedEnv);
    expect(firstResponse.status).toBe(200);
    expect(cache.put).toHaveBeenCalledWith(
      "v1:dict:catalog:visible:announcement.type",
      expect.any(String),
      expect.objectContaining({ expirationTtl: 300 })
    );

    const secondResponse = await app.request("/api/dictionaries?groups=announcement.type", { headers: { cookie: memberCookie } }, cachedEnv);
    expect(secondResponse.status).toBe(200);
    expect(cache.get).toHaveBeenCalledWith("v1:dict:catalog:visible:announcement.type", "json");

    const updateResponse = await app.request(
      `/api/dictionaries/announcement.type/items/${encodeURIComponent("运营通知")}`,
      {
        method: "PATCH",
        headers: {
          cookie: adminCookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ enabled: false })
      },
      cachedEnv
    );

    expect(updateResponse.status).toBe(200);
    expect(cache.delete).toHaveBeenCalledWith("v1:dict:catalog:visible:all");
    expect(cache.delete).toHaveBeenCalledWith("v1:dict:catalog:admin:all");
    expect(cache.delete).toHaveBeenCalledWith("v1:dict:catalog:visible:announcement.type");
    expect(cache.delete).toHaveBeenCalledWith("v1:dict:catalog:admin:announcement.type");
  });
});
