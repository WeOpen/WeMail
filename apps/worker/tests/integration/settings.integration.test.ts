import { describe, expect, it } from "vitest";

import { registerUserAndGetCookie } from "../helpers/test-env";

describe("worker settings integration", () => {
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
});
