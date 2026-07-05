import { describe, expect, it } from "vitest";

import {
  defaultMailSettings,
  defaultRuntimeSettings,
  parseLoginPayload,
  parseMailSettingsUpdatePayload,
  parseMailboxCreatePayload,
  parseInviteCreatePayload,
  parseOutboundPayload,
  parseQuotaPayload,
  parseRegisterPayload,
  parseRuntimeSettingsUpdatePayload,
  parseTelegramPayload,
  parseUserCreatePayload,
  parseUserPasswordResetPayload,
  parseUserRoleUpdatePayload,
  parseUserStatusUpdatePayload,
  parseUserUpdatePayload
} from "../src";

describe("shared schemas", () => {
  it("parses register payload", () => {
    expect(
      parseRegisterPayload({
        email: "demo@example.com",
        name: "Demo User",
        password: "password123",
        inviteCode: "INV-001"
      })
    ).toEqual({
      email: "demo@example.com",
      name: "Demo User",
      password: "password123",
      inviteCode: "INV-001"
    });
  });

  it("allows the initial register payload to omit an invite code", () => {
    expect(
      parseRegisterPayload({
        email: "first-admin@example.com",
        name: "First Admin",
        password: "password123"
      })
    ).toEqual({
      email: "first-admin@example.com",
      name: "First Admin",
      password: "password123",
      inviteCode: null
    });
  });

  it("parses login payload", () => {
    expect(
      parseLoginPayload({
        email: "demo@example.com",
        password: "password123"
      })
    ).toEqual({
      email: "demo@example.com",
      password: "password123"
    });
  });

  it("parses mailbox payload with fallback label", () => {
    expect(parseMailboxCreatePayload({ label: "Ops Box" })).toEqual({
      label: "Ops Box"
    });
  });

  it("parses outbound payload", () => {
    expect(
      parseOutboundPayload({
        mailboxId: "box-1",
        toAddress: "user@example.com",
        subject: "Hello",
        bodyText: "World"
      })
    ).toEqual({
      mailboxId: "box-1",
      toAddress: "user@example.com",
      subject: "Hello",
      bodyText: "World"
    });
  });

  it("migrates legacy outbound exception settings to supported failed-view settings", () => {
    expect(
      parseMailSettingsUpdatePayload(
        {
          routing: {
            exceptionStrategy: "异常 / 无匹配邮件进入发件箱异常视图"
          },
          workspaceDefaults: {
            outboundDefaultFilter: "异常 / 无匹配"
          }
        },
        defaultMailSettings
      )
    ).toEqual({
      routing: {
        ...defaultMailSettings.routing,
        exceptionStrategy: "异常 / 无匹配邮件进入失败告警队列"
      },
      workspaceDefaults: {
        ...defaultMailSettings.workspaceDefaults,
        outboundDefaultFilter: "失败"
      }
    });
  });

  it("parses telegram payload", () => {
    expect(parseTelegramPayload({ chatId: "123", enabled: true })).toEqual({
      chatId: "123",
      enabled: true
    });
  });

  it("parses quota payload with fallback", () => {
    expect(parseQuotaPayload({}, { apiDailyLimit: 20000, dailyLimit: 20, disabled: false })).toEqual({
      apiDailyLimit: 20000,
      dailyLimit: 20,
      disabled: false
    });
    expect(parseQuotaPayload({ apiDailyLimit: 5000, dailyLimit: 5, disabled: true }, { apiDailyLimit: 20000, dailyLimit: 20, disabled: false })).toEqual({
      apiDailyLimit: 5000,
      dailyLimit: 5,
      disabled: true
    });
  });

  it("parses invite creation payload with reusable redemption limit", () => {
    expect(
      parseInviteCreatePayload({
        count: 5,
        targetRole: "member",
        expiresInDays: 30,
        maxRedemptions: 3
      })
    ).toEqual({
      count: 5,
      targetRole: "member",
      expiresInDays: 30,
      maxRedemptions: 3
    });

    expect(parseInviteCreatePayload({})).toMatchObject({
      count: 1,
      targetRole: "member",
      expiresInDays: null,
      maxRedemptions: 1
    });
  });

  it("rejects runtime attachment totals below the single attachment limit", () => {
    expect(() =>
      parseRuntimeSettingsUpdatePayload(
        {
          attachments: {
            maxBytes: 20 * 1024 * 1024,
            maxTotalBytes: 10 * 1024 * 1024
          }
        },
        defaultRuntimeSettings
      )
    ).toThrow("attachments.maxTotalBytes must be greater than or equal to attachments.maxBytes");
  });

  it("parses admin user create payload", () => {
    expect(
      parseUserCreatePayload({
        email: " New.User@Example.COM ",
        name: "New User",
        password: "password123",
        role: "member"
      })
    ).toEqual({
      email: "new.user@example.com",
      name: "New User",
      password: "password123",
      role: "member"
    });
  });

  it("parses admin user update payloads", () => {
    expect(parseUserUpdatePayload({ name: " Renamed User " })).toEqual({
      name: "Renamed User"
    });
    expect(parseUserUpdatePayload({ role: "admin" })).toEqual({
      role: "admin"
    });
    expect(parseUserStatusUpdatePayload({ status: "disabled" })).toEqual({
      status: "disabled"
    });
    expect(parseUserPasswordResetPayload({ password: "newpassword123" })).toEqual({
      password: "newpassword123"
    });
  });

  it("rejects invalid admin user roles", () => {
    expect(() => parseUserCreatePayload({ email: "demo@example.com", password: "password123", role: "owner" })).toThrow(
      "role must be admin or member"
    );
    expect(() => parseUserCreatePayload({ email: "demo@example.com", password: "short", role: "member" })).toThrow(
      "password must be at least 8 characters"
    );
    expect(() => parseUserRoleUpdatePayload({ role: "owner" })).toThrow("role must be admin or member");
    expect(() => parseUserStatusUpdatePayload({ status: "outbound_disabled" })).toThrow("status must be active or disabled");
    expect(() => parseUserPasswordResetPayload({ password: "short" })).toThrow("password must be at least 8 characters");
  });
});
