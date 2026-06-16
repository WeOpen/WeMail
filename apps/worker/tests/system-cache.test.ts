import { describe, expect, it, vi } from "vitest";

import { createWorkerTestHarness } from "./helpers/test-env";

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

async function registerAdmin(options: ReturnType<typeof createWorkerTestHarness>) {
  const invite = await options.store.invites.create({
    code: "INVITE-SYSTEM-CACHE",
    createdByUserId: "system"
  });
  const response = await options.app.request(
    "/api/auth/register",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "admin@example.com",
        password: "password123",
        inviteCode: invite.code
      })
    },
    options.env
  );

  return response.headers.get("set-cookie") ?? "";
}

describe("system KV cache", () => {
  it("caches feature toggles and invalidates them after updates", async () => {
    const harness = createWorkerTestHarness();
    const cookie = await registerAdmin(harness);
    const cache = createMockKv();
    const env = { ...harness.env, CACHE: cache };

    const getResponse = await harness.app.request("/api/system/features", { headers: { cookie } }, env);
    expect(getResponse.status).toBe(200);
    expect(cache.put).toHaveBeenCalledWith(
      "v1:system:features",
      expect.any(String),
      expect.objectContaining({ expirationTtl: 60 })
    );

    const patchResponse = await harness.app.request(
      "/api/system/features",
      {
        method: "PATCH",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ outboundEnabled: false })
      },
      env
    );
    expect(patchResponse.status).toBe(200);
    expect(cache.delete).toHaveBeenCalledWith("v1:system:features");
  });

  it("caches system domain settings and invalidates them after updates", async () => {
    const harness = createWorkerTestHarness();
    const cookie = await registerAdmin(harness);
    const cache = createMockKv();
    const env = { ...harness.env, CACHE: cache };

    const getResponse = await harness.app.request("/api/system/domains", { headers: { cookie } }, env);
    expect(getResponse.status).toBe(200);
    expect(cache.put).toHaveBeenCalledWith(
      "v1:system:domains",
      expect.any(String),
      expect.objectContaining({ expirationTtl: 300 })
    );

    const patchResponse = await harness.app.request(
      "/api/system/domains",
      {
        method: "PATCH",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ domains: [{ domain: "cached.example.com", allowedRoles: ["member"] }] })
      },
      env
    );
    expect(patchResponse.status).toBe(200);
    expect(cache.delete).toHaveBeenCalledWith("v1:system:domains");
  });

  it("caches account policy reads and invalidates them after updates", async () => {
    const harness = createWorkerTestHarness();
    const cookie = await registerAdmin(harness);
    const cache = createMockKv();
    const env = { ...harness.env, CACHE: cache };

    const getResponse = await harness.app.request("/api/accounts/settings", { headers: { cookie } }, env);
    expect(getResponse.status).toBe(200);
    expect(cache.put).toHaveBeenCalledWith(
      "v1:settings:account-policy",
      expect.any(String),
      expect.objectContaining({ expirationTtl: 120 })
    );

    const putResponse = await harness.app.request(
      "/api/accounts/settings",
      {
        method: "PUT",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ lifecycle: { inactiveDays: 45 } })
      },
      env
    );
    expect(putResponse.status).toBe(200);
    expect(cache.delete).toHaveBeenCalledWith("v1:settings:account-policy");
  });

  it("caches mail settings reads and invalidates them after updates", async () => {
    const harness = createWorkerTestHarness();
    const cookie = await registerAdmin(harness);
    const cache = createMockKv();
    const env = { ...harness.env, CACHE: cache };

    const getResponse = await harness.app.request("/api/mail/settings", { headers: { cookie } }, env);
    expect(getResponse.status).toBe(200);
    expect(cache.put).toHaveBeenCalledWith(
      "v1:settings:mail",
      expect.any(String),
      expect.objectContaining({ expirationTtl: 120 })
    );

    const putResponse = await harness.app.request(
      "/api/mail/settings",
      {
        method: "PUT",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ workspaceDefaults: { listDensity: "紧凑" } })
      },
      env
    );
    expect(putResponse.status).toBe(200);
    expect(cache.delete).toHaveBeenCalledWith("v1:settings:mail");
  });
});
