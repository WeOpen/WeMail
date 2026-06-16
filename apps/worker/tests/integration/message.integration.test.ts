import { afterEach, describe, expect, it, vi } from "vitest";

import { processInboundEmail } from "../../src/app/create-app";
import { createWorkerTestHarness } from "../helpers/test-env";

async function registerMemberAndCreateMailbox() {
  const { app, env, store } = createWorkerTestHarness();

  await store.invites.create({
    code: "INVITE-MESSAGE",
    createdByUserId: "system"
  });

  const registerResponse = await app.request(
    "/api/auth/register",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "member@example.com",
        password: "password123",
        inviteCode: "INVITE-MESSAGE"
      })
    },
    env
  );

  const cookie = registerResponse.headers.get("set-cookie") ?? "";
  const sessionResponse = await app.request(
    "/api/auth/session",
    { headers: { cookie } },
    env
  );
  const sessionPayload = (await sessionResponse.json()) as {
    user: { id: string };
  };
  await store.users.updateRole(sessionPayload.user.id, "member");

  const mailbox = await store.mailboxes.create({
    userId: sessionPayload.user.id,
    label: "Primary inbox",
    address: "primary@example.com"
  });

  return { app, env, store, cookie, mailbox, userId: sessionPayload.user.id };
}

describe("worker message integration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("processes inbound routed email into the addressed mailbox and marks the account active", async () => {
    const { app, env, store, cookie, mailbox } = await registerMemberAndCreateMailbox();
    const rawEmail = [
      "From: Product Security <security@example.com>",
      `To: ${mailbox.address}`,
      "Subject: Your login code",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Use 654321 to finish signing in."
    ].join("\r\n");

    const message = await processInboundEmail(env, store, {
      to: mailbox.address,
      raw: new Response(rawEmail).body!
    });

    expect(message?.mailboxId).toBe(mailbox.id);

    const listResponse = await app.request(
      `/api/mail/messages?accountId=${mailbox.id}&filter=code&page=1&pageSize=10`,
      { headers: { cookie } },
      env
    );
    expect(listResponse.status).toBe(200);
    const listPayload = (await listResponse.json()) as {
      messages: Array<{ fromAddress: string; subject: string; extraction: { value: string } }>;
    };
    expect(listPayload.messages).toHaveLength(1);
    expect(listPayload.messages[0]).toMatchObject({
      fromAddress: "security@example.com",
      subject: "Your login code",
      extraction: { value: "654321" }
    });

    const updatedMailbox = await store.mailboxes.findDetailById(mailbox.id);
    expect(updatedMailbox?.lastActiveAt).toEqual(expect.any(String));
  });

  it("does not send telegram notifications when the global telegram feature is disabled", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { env, store, mailbox, userId } = await registerMemberAndCreateMailbox();

    await store.telegram.upsert({ userId, chatId: "12345678", enabled: true });

    const rawEmail = [
      "From: Product Security <security@example.com>",
      `To: ${mailbox.address}`,
      "Subject: Your login code",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Use 654321 to finish signing in."
    ].join("\r\n");

    await processInboundEmail(
      { ...env, ENABLE_TELEGRAM: "false", TELEGRAM_BOT_TOKEN: "test-token" },
      store,
      {
        to: mailbox.address,
        raw: new Response(rawEmail).body!
      }
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends telegram notifications for new mail and extracted results", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { env, store, mailbox, userId } = await registerMemberAndCreateMailbox();

    await store.telegram.upsert({ userId, chatId: "12345678", enabled: true });

    const rawEmail = [
      "From: Product Security <security@example.com>",
      `To: ${mailbox.address}`,
      "Subject: Your login code",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Use 654321 to finish signing in."
    ].join("\r\n");

    await processInboundEmail(
      { ...env, TELEGRAM_BOT_TOKEN: "test-token" },
      store,
      {
        to: mailbox.address,
        raw: new Response(rawEmail).body!
      }
    );

    const sendMessageBodies = fetchMock.mock.calls
      .filter(([url]) => String(url).endsWith("/sendMessage"))
      .map(([, init]) => JSON.parse(String((init as RequestInit).body)));

    expect(sendMessageBodies).toHaveLength(2);
    expect(sendMessageBodies[0].text).toContain("New mail");
    expect(sendMessageBodies[1].text).toContain("Extracted result");
    expect(sendMessageBodies[1].text).toContain("654321");
  });

  it("sends webhook events for new mail and extracted results", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { env, store, mailbox, userId } = await registerMemberAndCreateMailbox();

    await store.webhookEndpoints.create({
      userId,
      name: "Automation receiver",
      url: "https://hooks.example.test/inbound",
      eventsJson: JSON.stringify(["message.received", "message.extracted"]),
      enabled: true
    });

    const rawEmail = [
      "From: Product Security <security@example.com>",
      `To: ${mailbox.address}`,
      "Subject: Your login code",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Use 654321 to finish signing in."
    ].join("\r\n");

    await processInboundEmail(env, store, {
      to: mailbox.address,
      raw: new Response(rawEmail).body!
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const webhookBodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(String((init as RequestInit).body)) as { eventType: string });
    expect(webhookBodies.map((body) => body.eventType)).toEqual(["message.received", "message.extracted"]);

    const deliveries = await store.webhookDeliveries.listByUser(userId);
    expect(deliveries.map((delivery) => delivery.eventType).sort()).toEqual(["message.extracted", "message.received"]);
    expect(deliveries.every((delivery) => delivery.status === "success")).toBe(true);
  });

  it("keeps inbound mail for unknown recipient addresses visible to admins only", async () => {
    const { app, env, store, cookie: adminCookie } = await registerMemberAndCreateMailbox();
    const admin = await store.users.findByEmail("member@example.com");
    expect(admin).not.toBeNull();
    if (admin) await store.users.updateRole(admin.id, "admin");

    await store.invites.create({
      code: "INVITE-UNKNOWN-RECIPIENT-MEMBER",
      createdByUserId: "system"
    });
    const memberRegisterResponse = await app.request(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "reader@example.com",
          password: "password123",
          inviteCode: "INVITE-UNKNOWN-RECIPIENT-MEMBER"
        })
      },
      env
    );
    const memberCookie = memberRegisterResponse.headers.get("set-cookie") ?? "";
    const rawEmail = [
      "From: External Sender <sender@example.net>",
      "To: dropped-address@example.com",
      "Subject: Unknown account delivery",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "This should be retained for admin review."
    ].join("\r\n");

    const message = await processInboundEmail(env, store, {
      to: "dropped-address@example.com",
      raw: new Response(rawEmail).body!
    });

    expect(message).toMatchObject({
      mailboxId: "unmatched:dropped-address@example.com",
      toAddress: "dropped-address@example.com"
    });

    const adminResponse = await app.request("/api/mail/messages?page=1&pageSize=10", { headers: { cookie: adminCookie } }, env);
    const adminPayload = (await adminResponse.json()) as {
      messages: Array<{ subject: string; mailboxId: string; toAddress: string | null }>;
    };

    expect(adminResponse.status).toBe(200);
    expect(adminPayload.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: "Unknown account delivery",
          mailboxId: "unmatched:dropped-address@example.com",
          toAddress: "dropped-address@example.com"
        })
      ])
    );

    const memberResponse = await app.request("/api/mail/messages?page=1&pageSize=10", { headers: { cookie: memberCookie } }, env);
    const memberPayload = (await memberResponse.json()) as { messages: Array<{ subject: string }> };

    expect(memberResponse.status).toBe(200);
    expect(memberPayload.messages.map((entry) => entry.subject)).not.toContain("Unknown account delivery");
  });

  it("lists and reads messages that belong to the authenticated user", async () => {
    const { app, env, store, cookie, mailbox } = await registerMemberAndCreateMailbox();

    const message = await store.messages.create({
      mailboxId: mailbox.id,
      fromAddress: "service@example.com",
      subject: "Your verification code",
      previewText: "Code 123456",
      bodyText: "Use code 123456 to continue.",
      extractionJson: JSON.stringify({
        method: "regex",
        type: "auth_code",
        value: "123456",
        label: "Verification code"
      }),
      oversizeStatus: null,
      attachmentCount: 0,
      receivedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });

    const listResponse = await app.request(
      `/api/mail/messages?accountId=${mailbox.id}`,
      { headers: { cookie } },
      env
    );
    expect(listResponse.status).toBe(200);
    const listPayload = (await listResponse.json()) as {
      messages: Array<{ id: string; extraction: { value: string } }>;
    };
    expect(listPayload.messages).toHaveLength(1);
    expect(listPayload.messages[0].id).toBe(message.id);
    expect(listPayload.messages[0].extraction.value).toBe("123456");

    const detailResponse = await app.request(
      `/api/mail/messages/${message.id}`,
      { headers: { cookie } },
      env
    );
    expect(detailResponse.status).toBe(200);
    const detailPayload = (await detailResponse.json()) as {
      message: { subject: string; bodyText: string };
    };
    expect(detailPayload.message.subject).toBe("Your verification code");
    expect(detailPayload.message.bodyText).toContain("123456");
  });

  it("lists messages across all authenticated-user mailboxes when accountId is omitted", async () => {
    const { app, env, store, cookie, mailbox, userId } = await registerMemberAndCreateMailbox();
    const secondaryMailbox = await store.mailboxes.create({
      userId,
      label: "Secondary inbox",
      address: "secondary@example.com"
    });
    const otherUser = await store.users.create({
      email: "other@example.com",
      name: "Other user",
      passwordHash: "hash",
      role: "member"
    });
    const otherMailbox = await store.mailboxes.create({
      userId: otherUser.id,
      label: "Other inbox",
      address: "other-inbox@example.com"
    });

    await store.messages.create({
      mailboxId: mailbox.id,
      fromAddress: "service@example.com",
      subject: "Primary account notice",
      previewText: "Primary code",
      bodyText: "Primary code",
      extractionJson: JSON.stringify({ method: "regex", type: "auth_code", value: "123456", label: "Code" }),
      oversizeStatus: null,
      attachmentCount: 0,
      receivedAt: "2026-04-08T00:00:00.000Z",
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });
    await store.messages.create({
      mailboxId: secondaryMailbox.id,
      fromAddress: "sender@example.com",
      subject: "Secondary account notice",
      previewText: "Secondary link",
      bodyText: "Secondary link",
      extractionJson: JSON.stringify({ method: "regex", type: "auth_link", value: "https://example.com", label: "Link" }),
      oversizeStatus: null,
      attachmentCount: 0,
      receivedAt: "2026-04-08T00:01:00.000Z",
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });
    await store.messages.create({
      mailboxId: otherMailbox.id,
      fromAddress: "other@example.com",
      subject: "Other user notice",
      previewText: "Should not leak",
      bodyText: "Should not leak",
      extractionJson: JSON.stringify({ method: "none", type: "none", value: "", label: "None" }),
      oversizeStatus: null,
      attachmentCount: 0,
      receivedAt: "2026-04-08T00:02:00.000Z",
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });

    const response = await app.request("/api/mail/messages", { headers: { cookie } }, env);

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      messages: Array<{ subject: string }>;
    };
    expect(payload.messages.map((message) => message.subject)).toEqual([
      "Secondary account notice",
      "Primary account notice"
    ]);
    expect(payload.messages.map((message) => message.subject)).not.toContain("Other user notice");
  });

  it("filters, searches, and paginates message list queries", async () => {
    const { app, env, store, cookie, mailbox } = await registerMemberAndCreateMailbox();

    await store.messages.create({
      mailboxId: mailbox.id,
      fromAddress: "security@example.com",
      subject: "Primary magic login link",
      previewText: "Open the magic link",
      bodyText: "Open https://example.com/login-primary",
      extractionJson: JSON.stringify({ method: "regex", type: "auth_link", value: "https://example.com/login-primary", label: "Link" }),
      oversizeStatus: null,
      attachmentCount: 0,
      receivedAt: "2026-04-08T00:03:00.000Z",
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });
    await store.messages.create({
      mailboxId: mailbox.id,
      fromAddress: "backup@example.com",
      subject: "Backup magic login link",
      previewText: "Open the backup magic link",
      bodyText: "Open https://example.com/login-backup",
      extractionJson: JSON.stringify({ method: "regex", type: "service_link", value: "https://example.com/login-backup", label: "Link" }),
      oversizeStatus: null,
      attachmentCount: 0,
      receivedAt: "2026-04-08T00:02:00.000Z",
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });
    await store.messages.create({
      mailboxId: mailbox.id,
      fromAddress: "codes@example.com",
      subject: "Security code",
      previewText: "Use 789012",
      bodyText: "Use 789012",
      extractionJson: JSON.stringify({ method: "regex", type: "auth_code", value: "789012", label: "Code" }),
      oversizeStatus: null,
      attachmentCount: 0,
      receivedAt: "2026-04-08T00:01:00.000Z",
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });

    const response = await app.request(
      `/api/mail/messages?accountId=${mailbox.id}&filter=link&search=magic&page=2&pageSize=1`,
      { headers: { cookie } },
      env
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      messages: Array<{ subject: string; extraction: { type: string } }>;
      page: number;
      pageSize: number;
      total: number;
      summary: { messageCount: number; extractionCount: number; attachmentCount: number };
    };
    expect(payload.messages).toHaveLength(1);
    expect(payload.messages[0].subject).toBe("Backup magic login link");
    expect(payload.messages[0].extraction.type).toBe("service_link");
    expect(payload.total).toBe(2);
    expect(payload.page).toBe(2);
    expect(payload.pageSize).toBe(1);
    expect(payload.summary).toEqual({
      messageCount: 2,
      extractionCount: 2,
      attachmentCount: 0
    });
  });

  it("returns attachment metadata when object storage is not configured", async () => {
    const { app, env, store, cookie, mailbox } = await registerMemberAndCreateMailbox();

    const message = await store.messages.create({
      mailboxId: mailbox.id,
      fromAddress: "sender@example.com",
      subject: "Document",
      previewText: "Attached",
      bodyText: "See attachment",
      extractionJson: JSON.stringify({
        method: "none",
        type: "none",
        value: "",
        label: "No extraction"
      }),
      oversizeStatus: null,
      attachmentCount: 1,
      receivedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });

    await store.attachments.createMany(message.id, [
      {
        id: "attachment-1",
        filename: "test.txt",
        contentType: "text/plain",
        size: 4,
        key: "attachments/test.txt"
      }
    ]);

    const response = await app.request(
      `/api/mail/messages/${message.id}/attachments/attachment-1`,
      { headers: { cookie } },
      env
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      attachment: { filename: string; key: string };
    };
    expect(payload.attachment.filename).toBe("test.txt");
    expect(payload.attachment.key).toBe("attachments/test.txt");
  });

  it("sanitizes downloaded attachment filenames in content-disposition", async () => {
    const { app, env, store, cookie, mailbox } = await registerMemberAndCreateMailbox();

    const message = await store.messages.create({
      mailboxId: mailbox.id,
      fromAddress: "sender@example.com",
      subject: "Hostile attachment",
      previewText: "Attached",
      bodyText: "See attachment",
      extractionJson: JSON.stringify({
        method: "none",
        type: "none",
        value: "",
        label: "No extraction"
      }),
      oversizeStatus: null,
      attachmentCount: 1,
      receivedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });

    await store.attachments.createMany(message.id, [
      {
        id: "attachment-hostile",
        filename: "invoice\"\r\nx-extra: injected.txt",
        contentType: "text/plain",
        size: 7,
        key: "attachments/hostile.txt"
      }
    ]);

    const response = await app.request(
      `/api/mail/messages/${message.id}/attachments/attachment-hostile`,
      { headers: { cookie } },
      {
        ...env,
        ATTACHMENTS: {
          get: async () => ({ body: new Response("payload").body })
        } as unknown as R2Bucket
      }
    );

    expect(response.status).toBe(200);
    const contentDisposition = response.headers.get("content-disposition") ?? "";
    expect(contentDisposition).toContain("attachment;");
    expect(contentDisposition).toContain("filename*=");
    expect(contentDisposition).not.toContain("\r");
    expect(contentDisposition).not.toContain("\n");
    expect(contentDisposition).not.toContain("x-extra");
  });
});
