import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { AppBindings } from "../src/core/bindings";
import { resolveAppConfig } from "../src/core/config";
import { workerTestEnv } from "./helpers/test-env";

const wranglerConfig = readFileSync("wrangler.toml", "utf8");

describe("worker config", () => {
  it("parses bindings into a typed app config", () => {
    const config = resolveAppConfig({
      ...workerTestEnv,
      ENVIRONMENT: "staging",
      COOKIE_DOMAIN: ".Example.COM",
      COOKIE_SECURE: "true",
      SESSION_TTL_HOURS: "24",
      CORS_ALLOWED_ORIGINS: "https://mail.example.com, https://admin.example.com ",
      ADMIN_EMAILS: "admin@example.com, ops@example.com "
    });

    expect(config.environment).toBe("staging");
    expect(config.appName).toBe("WeMail");
    expect(config.cookie.name).toBe("wemail_session");
    expect(config.cookie.domain).toBe(".example.com");
    expect(config.cookie.secure).toBe(true);
    expect(config.cors.allowedOrigins).toEqual(["https://mail.example.com", "https://admin.example.com"]);
    expect(config.session.ttlHours).toBe(24);
    expect(config.mailbox.domain).toBe("example.com");
    expect(config.mailbox.limit).toBe(5);
    expect(config.message.retentionDays).toBe(7);
    expect(config.api.dailyLimit).toBe(20000);
    expect(config.attachments.maxBytes).toBe(10485760);
    expect(config.attachments.maxTotalBytes).toBe(15728640);
    expect(config.ai.fallbackLimit).toBe(20);
    expect(config.features).toEqual({
      aiEnabled: true,
      telegramEnabled: true,
      outboundEnabled: true,
      mailboxCreationEnabled: true
    });
    expect(config.adminEmails).toEqual(["admin@example.com", "ops@example.com"]);
  });

  it("falls back to safe defaults when optional values are missing or invalid", () => {
    const env: AppBindings = {
      ...workerTestEnv,
      ENVIRONMENT: undefined,
      COOKIE_DOMAIN: "https://mail.example.com",
      COOKIE_SECURE: undefined,
      CORS_ALLOWED_ORIGINS: undefined,
      SESSION_TTL_HOURS: "invalid",
      MAILBOX_LIMIT: "invalid",
      OUTBOUND_DAILY_LIMIT: "invalid",
      API_DAILY_LIMIT: "invalid",
      MESSAGE_RETENTION_DAYS: "invalid",
      MAX_ATTACHMENT_BYTES: "invalid",
      MAX_TOTAL_ATTACHMENT_BYTES: "invalid",
      AI_FALLBACK_LIMIT: "invalid",
      ENABLE_AI: "0",
      ENABLE_OUTBOUND: "false",
      ENABLE_MAILBOX_CREATION: "1",
      ADMIN_EMAILS: ""
    };

    const config = resolveAppConfig(env);

    expect(config.environment).toBe("local");
    expect(config.cookie.domain).toBeUndefined();
    expect(config.cookie.secure).toBe(false);
    expect(config.cors.allowedOrigins).toEqual([]);
    expect(config.session.ttlHours).toBe(72);
    expect(config.mailbox.limit).toBe(5);
    expect(config.outbound.dailyLimit).toBe(20);
    expect(config.api.dailyLimit).toBe(20000);
    expect(config.message.retentionDays).toBe(7);
    expect(config.attachments.maxBytes).toBe(10485760);
    expect(config.attachments.maxTotalBytes).toBe(15728640);
    expect(config.ai.fallbackLimit).toBe(20);
    expect(config.features).toEqual({
      aiEnabled: false,
      telegramEnabled: true,
      outboundEnabled: false,
      mailboxCreationEnabled: true
    });
    expect(config.adminEmails).toEqual([]);
  });

  it("keeps backend-managed defaults and secrets out of committed wrangler vars", () => {
    const backendManagedVars = [
      "DEFAULT_MAIL_DOMAIN",
      "MAILBOX_LIMIT",
      "MESSAGE_RETENTION_DAYS",
      "OUTBOUND_DAILY_LIMIT",
      "API_DAILY_LIMIT",
      "AI_FALLBACK_LIMIT",
      "MAX_ATTACHMENT_BYTES",
      "MAX_TOTAL_ATTACHMENT_BYTES",
      "ENABLE_AI",
      "ENABLE_TELEGRAM",
      "ENABLE_OUTBOUND",
      "ENABLE_MAILBOX_CREATION"
    ];
    const secretVars = [
      "RESEND_API_KEY",
      "TELEGRAM_BOT_TOKEN",
      "TELEGRAM_WEBHOOK_SECRET"
    ];

    for (const key of [...backendManagedVars, ...secretVars]) {
      expect(wranglerConfig).not.toContain(`${key} =`);
    }
  });
});
