import { afterEach, describe, expect, it, vi } from "vitest";

import { checkOutboundDomain } from "../src/app/use-cases/outbound-domain-use-cases";
import { registerUserAndGetCookie } from "./helpers/test-env";

describe("outbound domain diagnostics", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("compares exact DNS record types, quoted TXT chunks, MX priority and normalized target names", async () => {
    const fixture = await registerUserAndGetCookie();
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/domains") return Response.json({ data: [{ id: "domain-1", name: "example.net" }], has_more: false });
      if (url.pathname === "/domains/domain-1") return Response.json({ status: "verified", records: [
        { name: "send", type: "MX", value: "feedback.mail.example.net", priority: 10, record: "SPF" },
        { name: "send", type: "TXT", value: "v=spf1 include:example.net ~all", record: "SPF" },
        { name: "key._domainkey.example.net.", type: "CNAME", value: "key.example.org", record: "DKIM" }
      ] });
      const name = url.searchParams.get("name");
      const type = url.searchParams.get("type");
      if (name === "send.example.net" && type === "MX") return Response.json({ Status: 0, Answer: [{ type: 15, data: "10 FEEDBACK.MAIL.EXAMPLE.NET." }] });
      if (name === "send.example.net" && type === "TXT") return Response.json({ Status: 0, Answer: [{ type: 16, data: '"v=spf1 " "include:example.net ~all"' }] });
      if (name === "key._domainkey.example.net" && type === "CNAME") return Response.json({ Status: 0, Answer: [{ type: 5, data: "KEY.EXAMPLE.ORG." }] });
      return Response.json({ Status: 0, Answer: [{ type: 16, data: '"v=DMARC1; p=none"' }] });
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await checkOutboundDomain(fixture.store, { ...fixture.env, RESEND_FROM: "WeMail <mail@example.net>", RESEND_API_KEY: "test-key" });
    expect(result).toMatchObject({ domain: "example.net", checkedAt: expect.any(String) });
    expect(result.checks).toHaveLength(5);
    expect(result.checks.every((check) => check.status === "ok")).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("does not accept a DNS answer with the wrong type or a suffix-only MX match", async () => {
    const fixture = await registerUserAndGetCookie();
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/domains") return Response.json({ data: [{ id: "domain-1", name: "example.net" }] });
      if (url.pathname === "/domains/domain-1") return Response.json({ status: "verified", records: [{ name: "send", type: "MX", value: "example.net", priority: 10 }] });
      if (url.searchParams.get("type") === "MX") return Response.json({ Status: 0, Answer: [{ type: 15, data: "10 attacker-example.net." }] });
      return Response.json({ Status: 0, Answer: [{ type: 5, data: '"v=DMARC1; p=none"' }] });
    }));
    const result = await checkOutboundDomain(fixture.store, { ...fixture.env, RESEND_FROM: "mail@example.net", RESEND_API_KEY: "test-key" });
    expect(result.checks.filter((check) => check.source === "dns").every((check) => check.status === "warning")).toBe(true);
  });

  it("keeps supplier response failures explicit and never sends credentials to DNS", async () => {
    const fixture = await registerUserAndGetCookie();
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
      const url = new URL(String(input));
      if (url.hostname === "api.resend.com") return Response.json({ data: [null] });
      expect(new Headers(init?.headers).get("authorization")).toBeNull();
      return Response.json({ Status: 3 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await checkOutboundDomain(fixture.store, { ...fixture.env, RESEND_FROM: "mail@example.net", RESEND_API_KEY: "test-key" });
    expect(result.checks).toMatchObject([{ source: "resend", status: "error" }, { source: "dns", status: "warning" }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
