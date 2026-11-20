import { afterEach, describe, expect, it, vi } from "vitest";

import {
  retryWebhookDelivery,
  sendWebhookEventToEndpoint,
  WEBHOOK_TIMEOUT_MS,
  webhookDeliveryJson
} from "../src/app/services/webhook-service";
import type { WebhookChannel } from "../src/core/bindings";
import { createInMemoryStore } from "../src/infrastructure/persistence/in-memory";

const channels: WebhookChannel[] = ["webhook", "slack", "discord", "feishu", "wecom"];
const chatChannels: WebhookChannel[] = ["slack", "discord", "feishu", "wecom"];
const userId = "notification-owner";
const messageData = {
  mailboxAddress: "verification@example.com",
  subject: "Confirm your account",
  fromAddress: "sender@example.net",
  extraction: { type: "auth_code", label: "验证码", value: "654321", confidence: 1 },
  extractions: [
    { type: "auth_code", label: "验证码", value: "654321", confidence: 1 },
    { type: "verification_link", label: "验证链接", value: "https://example.net/verify/unique-token", confidence: 1 }
  ],
  expiresHint: "10 分钟内有效"
};

async function createEndpoint(channel: WebhookChannel) {
  const store = createInMemoryStore();
  const endpoint = await store.webhookEndpoints.create({
    userId,
    name: `${channel} notifications`,
    url: `https://hooks.example.test/${channel}`,
    channel,
    enabled: true,
    eventsJson: JSON.stringify(["message.extracted"])
  });
  return { store, endpoint };
}

function successResponse(channel: WebhookChannel) {
  if (channel === "slack") return new Response("ok", { status: 200 });
  if (channel === "discord") return Response.json({ id: "discord-message-1" });
  if (channel === "feishu") return Response.json({ code: 0, msg: "success" });
  if (channel === "wecom") return Response.json({ errcode: 0, errmsg: "ok" });
  return new Response(null, { status: 204 });
}

function chatText(channel: WebhookChannel, bodyText: string) {
  const body = JSON.parse(bodyText);
  if (channel === "slack") return body.text as string;
  if (channel === "discord") return body.content as string;
  if (channel === "feishu") return body.content.text as string;
  if (channel === "wecom") return body.text.content as string;
  throw new Error("Expected a chat notification body");
}

function legacyChatBody(channel: WebhookChannel) {
  const text = "【WeMail】提取结果\nverification@example.com · 654321";
  if (channel === "slack") return JSON.stringify({ text });
  if (channel === "discord") return JSON.stringify({ content: text });
  if (channel === "feishu") return JSON.stringify({ msg_type: "text", content: { text } });
  return JSON.stringify({ msgtype: "text", text: { content: text } });
}

describe("webhook delivery recovery", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each(channels)("preserves the original extraction event when a failed %s notification is retried", async (channel) => {
    const { store, endpoint } = await createEndpoint(channel);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("temporarily unavailable", { status: 503 }))
      .mockResolvedValueOnce(successResponse(channel));
    vi.stubGlobal("fetch", fetchMock);

    const failedDelivery = await sendWebhookEventToEndpoint(store, endpoint, "message.extracted", messageData);
    expect(failedDelivery.status).toBe("failed");
    expect(failedDelivery.errorText).toContain("HTTP 503");

    const retry = await retryWebhookDelivery(store, userId, failedDelivery.id);
    expect(retry).toMatchObject({ endpointId: endpoint.id, eventType: "message.extracted", status: "success" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    if (channel === "discord") {
      expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.get("wait")).toBe("true");
      expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).allowed_mentions).toEqual({ parse: [] });
    }
    expect(retry?.id).not.toBe(failedDelivery.id);

    const originalPayload = JSON.parse(failedDelivery.payloadJson);
    const retryPayload = JSON.parse(retry!.payloadJson);
    expect(originalPayload).toMatchObject({
      deliveryId: failedDelivery.id,
      endpoint: { id: endpoint.id, name: endpoint.name },
      eventType: "message.extracted",
      data: messageData
    });
    expect(retryPayload).toMatchObject({
      deliveryId: retry!.id,
      eventType: "message.extracted",
      data: { ...messageData, retryOfDeliveryId: failedDelivery.id }
    });

    const originalBody = fetchMock.mock.calls[0][1]?.body as string;
    const retryBody = fetchMock.mock.calls[1][1]?.body as string;
    expect(failedDelivery.requestBodyText).toBe(originalBody);
    expect(retry?.requestBodyText).toBe(retryBody);
    expect(webhookDeliveryJson(retry!)).toMatchObject({ payload: retryPayload, requestBodyText: retryBody });
    const signingKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(endpoint.signingSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    for (const [index, delivery] of [failedDelivery, retry!].entries()) {
      const request = fetchMock.mock.calls[index][1]!;
      const headers = new Headers(request.headers);
      const signature = headers.get("x-wemail-signature")!;
      expect(headers.get("x-wemail-delivery-id")).toBe(delivery.id);
      expect(headers.get("x-wemail-event")).toBe("message.extracted");
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
      const signatureBytes = Uint8Array.from(signature.slice(7).match(/.{2}/g)!, (byte) => Number.parseInt(byte, 16));
      expect(await crypto.subtle.verify("HMAC", signingKey, signatureBytes, new TextEncoder().encode(request.body as string))).toBe(true);
    }

    if (channel === "webhook") {
      expect(JSON.parse(retryBody)).toEqual(retryPayload);
    } else {
      const text = chatText(channel, retryBody);
      expect(text).toBe(chatText(channel, originalBody));
      expect(text).toContain(messageData.mailboxAddress);
      expect(text).toContain(messageData.subject);
      expect(text).toContain(messageData.fromAddress);
      expect(text).toContain(messageData.extraction.value);
      expect(text).toContain(messageData.extractions[1].value);
      expect(text).toContain(messageData.expiresHint);
      expect(text).not.toContain("[object Object]");
    }
  });

  it("replays a legacy generic record containing the canonical event without a request-body snapshot", async () => {
    const { store, endpoint } = await createEndpoint("webhook");
    const legacy = await store.webhookDeliveries.record({
      id: "legacy-generic-delivery",
      endpointId: endpoint.id,
      eventType: "message.extracted",
      status: "failed",
      statusCode: 503,
      durationMs: 4,
      errorText: "HTTP 503",
      payloadJson: JSON.stringify({
        deliveryId: "legacy-generic-delivery",
        createdAt: "2026-10-01T00:00:00.000Z",
        endpoint: { id: endpoint.id, name: endpoint.name },
        eventType: "message.extracted",
        data: messageData
      }),
      responseText: "unavailable"
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(successResponse("webhook"));
    vi.stubGlobal("fetch", fetchMock);

    const retry = await retryWebhookDelivery(store, userId, legacy.id);

    expect(retry?.status).toBe("success");
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toMatchObject({
      eventType: "message.extracted",
      data: { ...messageData, retryOfDeliveryId: legacy.id }
    });
  });

  it.each(chatChannels)("rejects a legacy %s body that no longer contains its original event", async (channel) => {
    const { store, endpoint } = await createEndpoint(channel);
    const legacy = await store.webhookDeliveries.record({
      endpointId: endpoint.id,
      eventType: "message.extracted",
      status: "failed",
      statusCode: 503,
      durationMs: 4,
      errorText: "HTTP 503",
      payloadJson: legacyChatBody(channel),
      responseText: "unavailable"
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(successResponse(channel));
    vi.stubGlobal("fetch", fetchMock);

    await expect(retryWebhookDelivery(store, userId, legacy.id)).rejects.toThrow(/original webhook event.*unavailable|cannot be replayed/i);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await store.webhookDeliveries.listByUser(userId)).toHaveLength(1);
  });

  it("does not read or replay a delivery for another user", async () => {
    const { store, endpoint } = await createEndpoint("webhook");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("unavailable", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const failedDelivery = await sendWebhookEventToEndpoint(store, endpoint, "message.extracted", messageData);
    fetchMock.mockClear();

    expect(await store.webhookDeliveries.findByUser(failedDelivery.id, "another-user")).toBeNull();
    expect(await store.webhookDeliveries.listByUser("another-user")).toEqual([]);
    expect(await retryWebhookDelivery(store, "another-user", failedDelivery.id)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await store.webhookDeliveries.listByUser(userId)).toHaveLength(1);
  });

  it("does not replay a delivery after its endpoint has been disabled", async () => {
    const { store, endpoint } = await createEndpoint("webhook");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("unavailable", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const failedDelivery = await sendWebhookEventToEndpoint(store, endpoint, "message.extracted", messageData);
    fetchMock.mockClear();
    await store.webhookEndpoints.update(endpoint.id, userId, { ...endpoint, enabled: false });

    await expect(retryWebhookDelivery(store, userId, failedDelivery.id)).rejects.toThrow(/must be enabled/i);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await store.webhookDeliveries.listByUser(userId)).toHaveLength(1);
  });

  it.each(chatChannels)("renders an extraction envelope and expiry in a %s notification", async (channel) => {
    const { store, endpoint } = await createEndpoint(channel);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(successResponse(channel));
    vi.stubGlobal("fetch", fetchMock);
    const envelopeData = {
      mailboxAddress: messageData.mailboxAddress,
      extraction: {
        primary: messageData.extraction,
        items: messageData.extractions,
        expiresHint: messageData.expiresHint
      }
    };

    const delivery = await sendWebhookEventToEndpoint(store, endpoint, "message.extracted", envelopeData);

    expect(delivery.status).toBe("success");
    const text = chatText(channel, fetchMock.mock.calls[0][1]?.body as string);
    expect(text).toContain(messageData.extraction.value);
    expect(text).toContain(messageData.expiresHint);
    expect(text).not.toContain("[object Object]");
    expect(JSON.parse(delivery.payloadJson).data).toEqual(envelopeData);
  });

  it.each(chatChannels)("keeps legacy string extraction values visible in a %s notification", async (channel) => {
    const { store, endpoint } = await createEndpoint(channel);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(successResponse(channel));
    vi.stubGlobal("fetch", fetchMock);

    await sendWebhookEventToEndpoint(store, endpoint, "message.extracted", { extraction: "legacy-token" });

    expect(chatText(channel, fetchMock.mock.calls[0][1]?.body as string)).toContain("legacy-token");
  });

  it.each(chatChannels)("bounds long %s messages by UTF-8 bytes while preserving the original event", async (channel) => {
    const { store, endpoint } = await createEndpoint(channel);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(successResponse(channel));
    vi.stubGlobal("fetch", fetchMock);
    const longData = { ...messageData, subject: "邮件主题🙂".repeat(2000) };

    const delivery = await sendWebhookEventToEndpoint(store, endpoint, "message.extracted", longData);

    const text = chatText(channel, fetchMock.mock.calls[0][1]?.body as string);
    expect(new TextEncoder().encode(text).byteLength).toBeLessThanOrEqual(1800);
    expect(text).toContain("【WeMail】提取结果");
    expect(text).toContain("邮件主题🙂");
    expect(text).toContain(messageData.extraction.value);
    expect(text).toContain(messageData.expiresHint);
    expect(text).not.toContain("\uFFFD");
    expect(text).toContain("…");
    expect(JSON.parse(delivery.payloadJson).data).toEqual(longData);
  });

  it.each([
    { channel: "slack" as const, responseText: "invalid_payload", error: /slack|invalid_payload/i },
    { channel: "discord" as const, responseText: JSON.stringify({ code: 50035, message: "Invalid Form Body" }), error: /discord|confirm/i },
    { channel: "feishu" as const, responseText: JSON.stringify({ code: 19001, msg: "param invalid" }), error: /19001|param invalid/i },
    { channel: "wecom" as const, responseText: JSON.stringify({ errcode: 93000, errmsg: "invalid webhook key" }), error: /93000|invalid webhook key/i }
  ])("records an HTTP 200 $channel API rejection as a failed delivery", async ({ channel, responseText, error }) => {
    const { store, endpoint } = await createEndpoint(channel);
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(responseText, { status: 200 })));

    const delivery = await sendWebhookEventToEndpoint(store, endpoint, "message.extracted", messageData);

    expect(delivery).toMatchObject({ status: "failed", statusCode: 200, responseText });
    expect(delivery.errorText).toMatch(error);
  });

  it("stops reading and cancels an oversized error response before storing a bounded diagnostic", async () => {
    const { store, endpoint } = await createEndpoint("webhook");
    const handleCancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`upstream-error ${"x".repeat(20_000)} unexpected-tail`));
      },
      cancel: handleCancel
    });
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status: 503 })));

    const delivery = await sendWebhookEventToEndpoint(store, endpoint, "message.extracted", messageData);

    expect(delivery).toMatchObject({ status: "failed", statusCode: 503 });
    expect(handleCancel).toHaveBeenCalledOnce();
    expect(delivery.responseText).toMatch(/^upstream-error /);
    expect(delivery.responseText!.length).toBeLessThanOrEqual(2003);
    expect(delivery.responseText).not.toContain("unexpected-tail");
    expect(delivery.errorText).toContain("HTTP 503");
    expect(delivery.errorText).not.toContain("unexpected-tail");
  });

  it("aborts and records a timed-out request instead of leaving notification delivery pending", async () => {
    vi.useFakeTimers();
    const { store, endpoint } = await createEndpoint("webhook");
    let handleFetchStarted!: () => void;
    const fetchStarted = new Promise<void>((resolve) => { handleFetchStarted = resolve; });
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((_input, init) => {
      handleFetchStarted();
      if (!init?.signal) return Promise.reject(new Error("Fetch requires an abort signal"));
      return new Promise<Response>((_resolve, reject) => {
        init.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const pendingDelivery = sendWebhookEventToEndpoint(store, endpoint, "message.extracted", messageData);
    await fetchStarted;
    await vi.advanceTimersByTimeAsync(WEBHOOK_TIMEOUT_MS);
    const delivery = await pendingDelivery;

    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(delivery).toMatchObject({ status: "failed", statusCode: null });
    expect(delivery.errorText).toMatch(/timed out|timeout/i);
    expect(delivery.durationMs).toBe(WEBHOOK_TIMEOUT_MS);
    expect(await store.webhookDeliveries.findByUser(delivery.id, userId)).toMatchObject({ status: "failed" });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the timeout active while waiting for the response body and releases the reader after abort", async () => {
    vi.useFakeTimers();
    const { store, endpoint } = await createEndpoint("webhook");
    let handleBodyReadStarted!: () => void;
    const bodyReadStarted = new Promise<void>((resolve) => { handleBodyReadStarted = resolve; });
    let response!: Response;
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (_input, init) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          init?.signal?.addEventListener("abort", () => controller.error(new DOMException("Aborted", "AbortError")), { once: true });
        },
        pull() {
          handleBodyReadStarted();
          return new Promise<void>(() => {});
        }
      });
      response = new Response(body, { status: 200 });
      return response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const pendingDelivery = sendWebhookEventToEndpoint(store, endpoint, "message.extracted", messageData);
    await bodyReadStarted;
    await vi.advanceTimersByTimeAsync(WEBHOOK_TIMEOUT_MS);
    const delivery = await pendingDelivery;

    expect(delivery).toMatchObject({ status: "failed", statusCode: 200 });
    expect(delivery.errorText).toMatch(/timed out|timeout/i);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(response.body?.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
