import { describe, expect, it } from "vitest";

import { processInboundEmail } from "../src/app/runtime";
import { readTrustedRoutingAuthentication } from "../src/shared/mail";
import { createWorkerTestHarness } from "./helpers/test-env";

describe("inbound authentication trust boundary", () => {
  it("accepts only the first platform header with the exact Cloudflare authserv-id", () => {
    expect(readTrustedRoutingAuthentication(undefined)).toBeNull();
    expect(readTrustedRoutingAuthentication(new Headers({ "authentication-results": "attacker.test; spf=pass, mx.cloudflare.net; dmarc=pass" }))).toBeNull();
    expect(readTrustedRoutingAuthentication(new Headers({ "authentication-results": "mx.cloudflare.net.attacker.test; spf=pass" }))).toBeNull();
    expect(readTrustedRoutingAuthentication(new Headers({ "authentication-results": "mx.cloudflare.net; spf=fail; dkim=none; dmarc=fail, attacker.test; spf=pass; dkim=pass; dmarc=pass" }))).toMatchObject({
      spf: "fail", dkim: "none", dmarc: "fail", source: "trusted_upstream"
    });
  });

  it("does not promote a raw MIME header that impersonates Cloudflare", async () => {
    const { env, store } = createWorkerTestHarness();
    const raw = "From: sender@example.test\r\nSubject: Notice\r\nAuthentication-Results: mx.cloudflare.net; spf=pass; dkim=pass; dmarc=pass\r\n\r\nHello";
    const message = await processInboundEmail(env, store, { to: "unmatched@example.com", raw: new Blob([raw]).stream() });
    expect(JSON.parse(message.extractionJson).authSummary).toMatchObject({ spf: "pass", source: "unverified_header" });
  });

  it("persists the trusted platform verdict instead of a forged raw MIME pass", async () => {
    const { env, store } = createWorkerTestHarness();
    const raw = "From: sender@example.test\r\nSubject: Notice\r\nAuthentication-Results: attacker.test; spf=pass; dkim=pass; dmarc=pass\r\n\r\nHello";
    const message = await processInboundEmail(env, store, {
      to: "unmatched@example.com", raw: new Blob([raw]).stream(),
      headers: new Headers({ "authentication-results": "mx.cloudflare.net; spf=fail; dkim=none; dmarc=fail" })
    });
    expect(JSON.parse(message.extractionJson).authSummary).toMatchObject({ spf: "fail", dmarc: "fail", source: "trusted_upstream" });
  });
});
