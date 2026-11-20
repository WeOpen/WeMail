import { describe, expect, it } from "vitest";

import { verifyResendWebhook } from "../src/shared/resend-webhook";

// Independent test vector from Svix's manual verification documentation:
// https://docs.svix.com/receiving/verifying-payloads/how-manual
const secret = "whsec_plJ3nmyCDGBKInavdOK15jsl";
const body = '{"event_type":"ping","data":{"success":true}}';
const timestamp = "1731705121";
const headers = new Headers({
  "svix-id": "msg_loFOjxBNrRLzqYUf", "svix-timestamp": timestamp,
  "svix-signature": "v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0="
});
const nowMs = Number(timestamp) * 1000;

describe("Resend webhook verification", () => {
  it("verifies the independent Svix test vector without Node crypto", async () => {
    expect(await verifyResendWebhook(body, headers, secret, nowMs)).toBe(true);
    const rotated = new Headers(headers);
    rotated.set("svix-signature", `v2,invalid v1,broken ${headers.get("svix-signature")}`);
    expect(await verifyResendWebhook(body, rotated, secret, nowMs)).toBe(true);
  });

  it("rejects changes to the body, identifier, secret and delivery timestamp", async () => {
    expect(await verifyResendWebhook(`${body} `, headers, secret, nowMs)).toBe(false);
    expect(await verifyResendWebhook(body, headers, "whsec_d3Jvbmcta2V5", nowMs)).toBe(false);
    const changed = new Headers(headers);
    changed.set("svix-id", "different-message");
    expect(await verifyResendWebhook(body, changed, secret, nowMs)).toBe(false);
    changed.set("svix-id", headers.get("svix-id")!);
    changed.set("svix-timestamp", String(Number(timestamp) + 1));
    expect(await verifyResendWebhook(body, changed, secret, nowMs)).toBe(false);
  });

  it("rejects stale, future, missing and oversized signature metadata", async () => {
    expect(await verifyResendWebhook(body, headers, secret, nowMs + 301_000)).toBe(false);
    expect(await verifyResendWebhook(body, headers, secret, nowMs - 301_000)).toBe(false);
    expect(await verifyResendWebhook(body, new Headers(), secret, nowMs)).toBe(false);
    const oversized = new Headers(headers);
    oversized.set("svix-signature", "x".repeat(2049));
    expect(await verifyResendWebhook(body, oversized, secret, nowMs)).toBe(false);
  });
});
