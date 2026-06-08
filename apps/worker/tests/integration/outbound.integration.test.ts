import { describe, expect, it, vi } from "vitest";

import { registerUserAndGetCookie } from "../helpers/test-env";

describe("worker outbound integration", () => {
  it("blocks outbound send when quota is exhausted", async () => {
    const { app, env, cookie, store } = await registerUserAndGetCookie({
      email: "sender@example.com",
      inviteCode: "INVITE-OUTBOUND-LIMIT"
    });

    const mailboxResponse = await app.request(
      "/api/accounts",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({ label: "Sender" })
      },
      env
    );

    const mailboxPayload = (await mailboxResponse.json()) as {
      mailbox: { id: string };
    };

    const user = await store.users.findByEmail("sender@example.com");
    if (!user) throw new Error("user not created");

    await store.quotas.save({
      userId: user.id,
      dailyLimit: 1,
      sendsToday: 1,
      disabled: false,
      updatedAt: new Date().toISOString()
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "msg-1" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const response = await app.request(
      "/api/mail/send",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          mailboxId: mailboxPayload.mailbox.id,
          toAddress: "target@example.com",
          subject: "Hello",
          bodyText: "World"
        })
      },
      {
        ...env,
        RESEND_API_KEY: "test-token"
      }
    );

    expect(response.status).toBe(403);
  });
});
