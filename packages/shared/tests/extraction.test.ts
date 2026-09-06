import { describe, expect, it } from "vitest";

import {
  buildMessageExtraction,
  extractImportantInfo,
  mergeAiItems,
  parseAuthenticationResults,
  parseMessageExtraction
} from "../src/index";

const noneResult = { method: "none", type: "none", value: "", label: "", source: null };

describe("extractImportantInfo (legacy single-result API)", () => {
  it("prefers a verification code over links", () => {
    const result = extractImportantInfo({
      subject: "Your verification code",
      text: "Use code 123456 to sign in. Or click https://example.com/login"
    });

    expect(result).toEqual({
      method: "regex",
      type: "auth_code",
      value: "123456",
      label: "Verification code",
      source: "body"
    });
  });

  it("returns a verification link when no code is present", () => {
    const result = extractImportantInfo({
      subject: "Verify your email",
      text: "Open https://example.com/verify?token=abc to continue."
    });

    expect(result.type).toBe("auth_link");
    expect(result.value).toContain("verify");
  });

  it("does not treat prose after verification code wording as an auth code", () => {
    const result = extractImportantInfo({
      subject: "NVIDIA email verification",
      text: "Your verification code will expire shortly."
    });

    expect(result).toEqual(noneResult);
  });

  it("keeps extracting alphanumeric codes that contain digits", () => {
    const result = extractImportantInfo({
      subject: "Your security code",
      text: "Security code: A7B2C9"
    });

    expect(result).toEqual({
      method: "regex",
      type: "auth_code",
      value: "A7B2C9",
      label: "Verification code",
      source: "body"
    });
  });

  it("returns none when nothing useful is found", () => {
    const result = extractImportantInfo({ subject: "Hello", text: "Just a friendly note." });
    expect(result).toEqual(noneResult);
  });
});

describe("buildMessageExtraction (multi-value envelope)", () => {
  it("collects a code and classified links from the same email", () => {
    const envelope = buildMessageExtraction({
      subject: "Your login code",
      text: "验证码 482914，10 分钟内有效。管理面板 https://app.example.com/verify?token=x 退订 https://example.com/unsubscribe"
    });

    expect(envelope.primary.type).toBe("auth_code");
    expect(envelope.primary.value).toBe("482914");
    expect(envelope.expiresHint).toBe("10 分钟内有效");
    expect(envelope.items.map((item) => item.type)).toEqual(
      expect.arrayContaining(["auth_code", "auth_link", "subscription_link"])
    );
  });

  it("extracts Chinese verification codes with full-width punctuation", () => {
    const envelope = buildMessageExtraction({
      subject: "【某某服务】登录验证",
      text: "您的动态码为：836-592，请勿泄露。"
    });

    expect(envelope.primary).toEqual({
      method: "regex",
      type: "auth_code",
      value: "836592",
      label: "Verification code",
      source: "body"
    });
  });

  it("rejects bare digits that sit outside a code-keyword context window", () => {
    const envelope = buildMessageExtraction({
      subject: "Your monthly invoice",
      text: "Total due: 49.00 USD. Order 3021546 shipped on 2026-09-05. Track via the app."
    });

    expect(envelope.primary.type).toBe("none");
    expect(envelope.items.filter((item) => item.type === "auth_code")).toHaveLength(0);
  });

  it("keeps a bare digit run that sits inside a code-keyword window", () => {
    const envelope = buildMessageExtraction({
      subject: "Sign-in attempt",
      text: "Someone tried signing in. Your one-time code is below.\n\n582014\n\nDidn't request it?"
    });

    expect(envelope.primary.type).toBe("auth_code");
    expect(envelope.primary.value).toBe("582014");
  });

  it("captures a code written before the keyword", () => {
    const envelope = buildMessageExtraction({
      subject: "Acme login",
      text: "483920 为您的验证码，请在 5 分钟内输入。"
    });

    expect(envelope.primary.type).toBe("auth_code");
    expect(envelope.primary.value).toBe("483920");
  });

  it("prefers the List-Unsubscribe header over body-guessed subscription links", () => {
    const envelope = buildMessageExtraction({
      subject: "Weekly digest",
      text: "Read more at https://news.example.com/digest",
      listUnsubscribe: "<https://news.example.com/u/abc>, <mailto:leave@example.com>"
    });

    const subscription = envelope.items.find((item) => item.type === "subscription_link");
    expect(subscription?.source).toBe("header");
    expect(subscription?.value).toBe("https://news.example.com/u/abc");
    expect(envelope.primary.type).toBe("subscription_link");
    expect(envelope.primary.source).toBe("header");
  });

  it("parses SPF, DKIM, and DMARC verdicts from Authentication-Results", () => {
    const envelope = buildMessageExtraction({
      subject: "Bank notice",
      text: "Your statement is ready.",
      authenticationResults:
        "spf=pass (sender IP is 192.0.2.1) smtp.mailfrom=bank.example; dkim=pass (2048-bit key) header.d=bank.example; dmarc=pass action=none header.from=bank.example"
    });

    expect(envelope.authSummary).toMatchObject({ spf: "pass", dkim: "pass", dmarc: "pass" });
  });

  it("marks failed verdicts and maps DMARC quarantine to fail", () => {
    const summary = parseAuthenticationResults("spf=fail; dkim=none; dmarc=quarantine");
    expect(summary).toMatchObject({ spf: "fail", dkim: "none", dmarc: "fail" });
  });
});

describe("parseMessageExtraction (stored JSON compatibility)", () => {
  it("reads legacy single-result rows", () => {
    const envelope = parseMessageExtraction(
      JSON.stringify({ method: "regex", type: "auth_code", value: "998877", label: "Verification code" })
    );

    expect(envelope.primary.value).toBe("998877");
    expect(envelope.items).toHaveLength(1);
    expect(envelope.expiresHint).toBeNull();
  });

  it("reads the new envelope and tolerates malformed JSON", () => {
    const stored = JSON.stringify(
      buildMessageExtraction({ subject: "验证码 112233", text: "https://example.com/verify" })
    );
    const envelope = parseMessageExtraction(stored);
    expect(envelope.primary.value).toBe("112233");
    expect(envelope.items.length).toBeGreaterThanOrEqual(2);

    expect(parseMessageExtraction("not json").primary.type).toBe("none");
    expect(parseMessageExtraction(null).primary.type).toBe("none");
  });
});

describe("mergeAiItems", () => {
  it("merges AI findings and re-picks the primary", () => {
    const base = buildMessageExtraction({ subject: "Notice", text: "No links here." });
    expect(base.primary.type).toBe("none");

    const merged = mergeAiItems(base, [
      { method: "regex", type: "auth_link", value: "https://ai.example.com/verify", label: "AI link" }
    ]);

    expect(merged.primary).toMatchObject({ method: "ai", type: "auth_link", value: "https://ai.example.com/verify" });
  });
});
