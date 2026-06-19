import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultMailSettings } from "@wemail/shared";

import { registerUserAndGetCookie } from "../helpers/test-env";

describe("worker outbound integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
      apiDailyLimit: 20000,
      apiCallsToday: 0,
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

  it("uses persisted mail sender settings and retries failed outbound delivery", async () => {
    const { app, env, cookie, store } = await registerUserAndGetCookie({
      email: "sender@example.com",
      inviteCode: "INVITE-OUTBOUND-MAIL-SETTINGS"
    });

    await store.mailSettings.save({
      senderRulesJson: JSON.stringify({
        ...defaultMailSettings.senderRules,
        defaultIdentity: "Ops Mail <ops@wemail.test>",
        signature: "Sent through managed WeMail policy.",
        retryEnabled: true,
        retryAttempts: "1 次"
      }),
      routingJson: JSON.stringify(defaultMailSettings.routing),
      workspaceDefaultsJson: JSON.stringify(defaultMailSettings.workspaceDefaults)
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
    const mailboxPayload = (await mailboxResponse.json()) as { mailbox: { id: string } };

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("temporary failure", { status: 500 }))
      .mockResolvedValueOnce(
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

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const resendPayload = JSON.parse(String(fetchSpy.mock.calls[1][1]?.body)) as { from: string; text: string };
    expect(resendPayload.from).toBe("Ops Mail <ops@wemail.test>");
    expect(resendPayload.text).toBe("World\n\nSent through managed WeMail policy.");
  });

  it("allows only one concurrent outbound send when one daily send remains", async () => {
    const { app, env, cookie, store } = await registerUserAndGetCookie({
      email: "sender-concurrency@example.com",
      inviteCode: "INVITE-OUTBOUND-CONCURRENCY"
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
    const mailboxPayload = (await mailboxResponse.json()) as { mailbox: { id: string } };
    const user = await store.users.findByEmail("sender-concurrency@example.com");
    if (!user) throw new Error("user not created");

    await store.quotas.save({
      userId: user.id,
      apiDailyLimit: 20000,
      apiCallsToday: 0,
      dailyLimit: 1,
      sendsToday: 0,
      disabled: false,
      updatedAt: new Date().toISOString()
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ id: "msg-1" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const requestInit = {
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
    };
    const responses = await Promise.all([
      app.request("/api/mail/send", requestInit, { ...env, RESEND_API_KEY: "test-token" }),
      app.request("/api/mail/send", requestInit, { ...env, RESEND_API_KEY: "test-token" })
    ]);
    const statuses = responses.map((response) => response.status).sort();

    expect(statuses).toEqual([200, 403]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("lists outbound records with server-side filtering and exposes raw delivery details", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie({
      email: "sender@example.com",
      inviteCode: "INVITE-OUTBOUND-LIST"
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
    const mailboxPayload = (await mailboxResponse.json()) as { mailbox: { id: string } };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "provider-welcome" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(new Response("smtp timeout", { status: 500 }));

    const successResponse = await app.request(
      "/api/mail/send",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          mailboxId: mailboxPayload.mailbox.id,
          toAddress: "welcome@example.com",
          subject: "Welcome",
          bodyText: "Welcome body"
        })
      },
      {
        ...env,
        RESEND_API_KEY: "test-token"
      }
    );
    expect(successResponse.status).toBe(200);

    const failedResponse = await app.request(
      "/api/mail/send",
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          mailboxId: mailboxPayload.mailbox.id,
          toAddress: "retry@example.com",
          subject: "Retry delivery",
          bodyText: "Retry body"
        })
      },
      {
        ...env,
        RESEND_API_KEY: "test-token"
      }
    );
    expect(failedResponse.status).toBe(502);

    const listResponse = await app.request(
      `/api/mail/outbound?accountId=${mailboxPayload.mailbox.id}&page=1&pageSize=1&status=failed&search=retry`,
      {
        headers: { cookie }
      },
      env
    );
    expect(listResponse.status).toBe(200);
    const listPayload = (await listResponse.json()) as {
      messages: Array<{
        id: string;
        fromAddress: string;
        toAddress: string;
        subject: string;
        status: string;
        errorText: string | null;
        providerMessageId: string | null;
      }>;
      page: number;
      pageSize: number;
      total: number;
      summary: {
        totalCount: number;
        sentCount: number;
        failedCount: number;
      };
    };

    expect(listPayload.page).toBe(1);
    expect(listPayload.pageSize).toBe(1);
    expect(listPayload.total).toBe(1);
    expect(listPayload.summary).toEqual({
      totalCount: 1,
      sentCount: 0,
      failedCount: 1
    });
    expect(listPayload.messages).toHaveLength(1);
    expect(listPayload.messages[0]).toMatchObject({
      fromAddress: "WeMail <no-reply@example.com>",
      toAddress: "retry@example.com",
      subject: "Retry delivery",
      status: "failed",
      errorText: "smtp timeout",
      providerMessageId: null
    });

    const detailResponse = await app.request(
      `/api/mail/outbound/${listPayload.messages[0].id}`,
      {
        headers: { cookie }
      },
      env
    );
    expect(detailResponse.status).toBe(200);
    const detailPayload = (await detailResponse.json()) as {
      message: {
        bodyText: string;
        requestPayloadJson: string;
        responsePayloadJson: string | null;
      };
    };
    expect(detailPayload.message.bodyText).toBe("Retry body");
    expect(JSON.parse(detailPayload.message.requestPayloadJson)).toMatchObject({
      from: "WeMail <no-reply@example.com>",
      to: "retry@example.com",
      subject: "Retry delivery",
      text: "Retry body"
    });
    expect(JSON.parse(detailPayload.message.responsePayloadJson ?? "{}")).toEqual({ error: "smtp timeout" });
  });

  it("rejects invalid outbound recipient addresses before calling the provider", async () => {
    const { app, env, cookie } = await registerUserAndGetCookie({
      email: "sender@example.com",
      inviteCode: "INVITE-OUTBOUND-INVALID-RECIPIENT"
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
    const mailboxPayload = (await mailboxResponse.json()) as { mailbox: { id: string } };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "provider-should-not-run" }), {
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
          toAddress: "not-an-email",
          subject: "Hello",
          bodyText: "World"
        })
      },
      {
        ...env,
        RESEND_API_KEY: "test-token"
      }
    );

    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
