import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultMailSettings } from "@wemail/shared";

import { cleanupOutboundPayloads, processOutboundSends } from "../src/app/services/outbound-delivery-service";
import { registerUserAndGetCookie } from "./helpers/test-env";

const secret = `whsec_${btoa("independent-test-signing-key-32byt")}`;

async function sender(retryEnabled = true) {
  const harness = await registerUserAndGetCookie({ email: "sender@example.com" });
  const user = (await harness.store.users.findByEmail("sender@example.com"))!;
  const mailbox = await harness.store.mailboxes.create({ userId: user.id, label: "Sender", address: "sender@example.com" });
  await harness.store.mailSettings.save({ senderRulesJson: JSON.stringify({ ...defaultMailSettings.senderRules, retryEnabled, retryAttempts: "2 次", retryDelay: "5 分钟" }), routingJson: JSON.stringify(defaultMailSettings.routing), workspaceDefaultsJson: JSON.stringify(defaultMailSettings.workspaceDefaults) });
  const env = { ...harness.env, RESEND_API_KEY: "test-provider", RESEND_WEBHOOK_SECRET: secret };
  const payload = { mailboxId: mailbox.id, toAddress: "recipient@example.net", subject: "Recovery", bodyText: "Test body", requestId: "stable-key" };
  const send = (body = payload) => harness.app.request("/api/mail/send", { method: "POST", headers: { cookie: harness.cookie, "content-type": "application/json" }, body: JSON.stringify(body) }, env);
  return { ...harness, env, payload, user, mailbox, send };
}

async function signedEvent(id: string, type: string, providerId: string, data: Record<string, unknown> = {}) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const raw = JSON.stringify({ type, created_at: new Date().toISOString(), data: { email_id: providerId, ...data } });
  const key = await crypto.subtle.importKey("raw", Uint8Array.from(atob(secret.slice(6)), (character) => character.charCodeAt(0)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${raw}`));
  return { raw, headers: { "content-type": "application/json", "svix-id": id, "svix-timestamp": timestamp, "svix-signature": `v1,${btoa(String.fromCharCode(...new Uint8Array(signature)))}` } };
}

describe("outbound recovery", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("deduplicates repeated HTTP requests, preserves quota and rejects a reused key with changed content", async () => {
    const fixture = await sender();
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ id: "provider-1" }));
    vi.stubGlobal("fetch", fetchMock);
    const responses = await Promise.all([fixture.send(), fixture.send()]);
    const messages = await Promise.all(responses.map((response) => response.json())) as Array<{ message: { id: string } }>;
    expect(messages[0].message.id).toBe(messages[1].message.id);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await fixture.store.quotas.getByUserId(fixture.user.id, 20, 20000)).sendsToday).toBe(1);
    expect((await fixture.send({ ...fixture.payload, bodyText: "Different" })).status).toBe(409);
    expect((await fixture.store.quotas.getByUserId(fixture.user.id, 20, 20000)).sendsToday).toBe(1);
  });

  it("retries a network interruption with the same provider key and frozen body after the configured delay", async () => {
    const fixture = await sender();
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValueOnce(new Error("Connection lost after submission")).mockResolvedValueOnce(Response.json({ id: "accepted-once" }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await fixture.send()).status).toBe(202);
    const first = (await fixture.store.outboundSends.findByUserAndKey(fixture.user.id, "stable-key"))!;
    await processOutboundSends(fixture.store, fixture.env, { now: new Date(new Date(first.nextAttemptAt).getTime() - 1) });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await processOutboundSends(fixture.store, fixture.env, { now: new Date(first.nextAttemptAt) });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]?.body).toBe(fetchMock.mock.calls[1][1]?.body);
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Idempotency-Key")).toBe(new Headers(fetchMock.mock.calls[1][1]?.headers).get("Idempotency-Key"));
    expect((await fixture.store.outboundSends.findByUserAndKey(fixture.user.id, "stable-key"))?.status).toBe("accepted");
    expect((await fixture.store.quotas.getByUserId(fixture.user.id, 20, 20000)).sendsToday).toBe(1);
  });

  it("marks an interrupted request uncertain after the idempotency safety window and does not resend it", async () => {
    const fixture = await sender();
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error("Network interruption"));
    vi.stubGlobal("fetch", fetchMock);
    await fixture.send();
    const record = (await fixture.store.outboundSends.findByUserAndKey(fixture.user.id, "stable-key"))!;
    await processOutboundSends(fixture.store, fixture.env, { now: new Date(new Date(record.firstAttemptAt!).getTime() + 24 * 3_600_000) });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await fixture.store.outboundSends.findByUserAndKey(fixture.user.id, "stable-key"))?.status).toBe("uncertain");
  });

  it("validates callbacks before mutation, deduplicates them and prevents late sent events from regressing delivery", async () => {
    const fixture = await sender();
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: "provider-1" })));
    await fixture.send();
    const event = await signedEvent("event-delivered", "email.delivered", "provider-1");
    const path = "/api/mail/providers/resend/events";
    expect((await fixture.app.request(path, { method: "POST", headers: event.headers, body: `${event.raw} ` }, fixture.env)).status).toBe(401);
    expect((await fixture.store.outboundSends.findByUserAndKey(fixture.user.id, "stable-key"))?.status).toBe("accepted");
    for (let count = 0; count < 2; count += 1) expect((await fixture.app.request(path, { method: "POST", headers: event.headers, body: event.raw }, fixture.env)).status).toBe(200);
    const late = await signedEvent("event-sent-late", "email.sent", "provider-1");
    await fixture.app.request(path, { method: "POST", headers: late.headers, body: late.raw }, fixture.env);
    const record = (await fixture.store.outboundSends.findByUserAndKey(fixture.user.id, "stable-key"))!;
    expect(record.status).toBe("delivered");
    expect((await fixture.store.outboundSends.timeline(record.id)).filter((item) => item.type === "email.delivered")).toHaveLength(1);
  });

  it("cleans retained failure payloads without reopening the request key for another quota charge", async () => {
    const fixture = await sender(false);
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response("invalid recipient", { status: 400 })));
    expect((await fixture.send()).status).toBe(502);
    await cleanupOutboundPayloads(fixture.store, new Date(Date.now() + 31 * 86_400_000));
    const record = (await fixture.store.outboundSends.findByUserAndKey(fixture.user.id, "stable-key"))!;
    expect(record).toMatchObject({ payloadRetained: false, bodyText: "", requestPayloadJson: "{}" });
    await fixture.send();
    expect((await fixture.store.quotas.getByUserId(fixture.user.id, 20, 20000)).sendsToday).toBe(1);
  });

  it("retries a concurrent provider request after Retry-After and preserves ambiguity on a later refusal", async () => {
    const fixture = await sender();
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ name: "concurrent_idempotent_requests", message: "In progress" }, { status: 409, headers: { "retry-after": "600" } }))
      .mockResolvedValueOnce(Response.json({ name: "validation_error" }, { status: 422 }));
    vi.stubGlobal("fetch", fetchMock);
    const started = Date.now();
    expect((await fixture.send()).status).toBe(202);
    const queued = (await fixture.store.outboundSends.findByUserAndKey(fixture.user.id, "stable-key"))!;
    expect(queued).toMatchObject({ status: "queued", submissionUncertain: true });
    expect(new Date(queued.nextAttemptAt).getTime()).toBeGreaterThanOrEqual(started + 600_000);
    await processOutboundSends(fixture.store, fixture.env, { now: new Date(new Date(queued.nextAttemptAt).getTime() - 1) });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await processOutboundSends(fixture.store, fixture.env, { now: new Date(queued.nextAttemptAt) });
    expect((await fixture.store.outboundSends.findByUserAndKey(fixture.user.id, "stable-key"))?.status).toBe("uncertain");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a malformed success safely and keeps interrupted local commits recoverable", async () => {
    const fixture = await sender();
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id: "" }))
      .mockImplementation(async () => Response.json({ id: "provider-recovered" }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await fixture.send()).status).toBe(202);
    const queued = (await fixture.store.outboundSends.findByUserAndKey(fixture.user.id, "stable-key"))!;
    const complete = fixture.store.outboundSends.complete.bind(fixture.store.outboundSends);
    const completeSpy = vi.spyOn(fixture.store.outboundSends, "complete").mockRejectedValueOnce(new Error("Database temporarily unavailable")).mockImplementation(complete);
    await expect(processOutboundSends(fixture.store, fixture.env, { now: new Date(queued.nextAttemptAt) })).rejects.toThrow("Database temporarily unavailable");
    expect((await fixture.store.outboundSends.findByUserAndKey(fixture.user.id, "stable-key"))?.status).toBe("sending");
    expect(completeSpy).toHaveBeenCalledTimes(1);
    await processOutboundSends(fixture.store, fixture.env, { now: new Date(new Date(queued.nextAttemptAt).getTime() + 121_000) });
    expect((await fixture.store.outboundSends.findByUserAndKey(fixture.user.id, "stable-key"))?.status).toBe("accepted");
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get("Idempotency-Key")).toBe(new Headers(fetchMock.mock.calls[2][1]?.headers).get("Idempotency-Key"));
  });

  it("ignores unknown prototype event names and rejects signed malformed event details", async () => {
    const fixture = await sender();
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: "provider-1" })));
    await fixture.send();
    const path = "/api/mail/providers/resend/events";
    for (const name of ["constructor", "__proto__", "email.future_event"]) {
      const event = await signedEvent(`unknown-${name}`, name, "provider-1");
      const response = await fixture.app.request(path, { method: "POST", headers: event.headers, body: event.raw }, fixture.env);
      expect(await response.json()).toMatchObject({ received: true, ignored: true });
    }
    const malformed = await signedEvent("malformed-detail", "email.bounced", "provider-1", { bounce: { message: { unexpected: true } } });
    expect((await fixture.app.request(path, { method: "POST", headers: malformed.headers, body: malformed.raw }, fixture.env)).status).toBe(400);
    expect((await fixture.store.outboundSends.findByUserAndKey(fixture.user.id, "stable-key"))?.status).toBe("accepted");
  });


  it("filters each lifecycle status in the API and isolates outbound details by mailbox owner", async () => {
    const fixture = await sender();
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ id: "provider-filter" })));
    await fixture.send();
    const path = `/api/mail/outbound?accountId=${fixture.mailbox.id}`;
    const accepted = await fixture.app.request(`${path}&status=accepted`, { headers: { cookie: fixture.cookie } }, fixture.env);
    expect(await accepted.json()).toMatchObject({ total: 1, messages: [expect.objectContaining({ status: "accepted" })] });
    const delivered = await fixture.app.request(`${path}&status=delivered`, { headers: { cookie: fixture.cookie } }, fixture.env);
    expect(await delivered.json()).toMatchObject({ total: 0, messages: [] });
    const other = await fixture.store.users.create({ email: "other@example.com", name: "Other", passwordHash: "unused", role: "member" });
    const session = await fixture.store.sessions.create({ userId: other.id, expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
    const record = (await fixture.store.outboundSends.findByUserAndKey(fixture.user.id, "stable-key"))!;
    const response = await fixture.app.request(`/api/mail/outbound/${record.id}`, { headers: { cookie: `wemail_session=${session.id}` } }, fixture.env);
    expect(response.status).toBe(404);
  });

});
