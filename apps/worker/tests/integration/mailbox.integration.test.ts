import { describe, expect, it } from "vitest";

import { registerUserAndGetCookie } from "../helpers/test-env";

describe("worker mailbox integration", () => {
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
});
