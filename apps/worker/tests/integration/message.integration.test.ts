import { describe, expect, it } from "vitest";

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

  const mailbox = await store.mailboxes.create({
    userId: sessionPayload.user.id,
    label: "Primary inbox",
    address: "primary@example.com"
  });

  return { app, env, store, cookie, mailbox };
}

describe("worker message integration", () => {
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
});
