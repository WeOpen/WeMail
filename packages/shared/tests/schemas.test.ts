import { describe, expect, it } from "vitest";

import {
  parseLoginPayload,
  parseMailboxCreatePayload,
  parseOutboundPayload,
  parseQuotaPayload,
  parseRegisterPayload,
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

  it("parses telegram payload", () => {
    expect(parseTelegramPayload({ chatId: "123", enabled: true })).toEqual({
      chatId: "123",
      enabled: true
    });
  });

  it("parses quota payload with fallback", () => {
    expect(parseQuotaPayload({}, { dailyLimit: 20, disabled: false })).toEqual({
      dailyLimit: 20,
      disabled: false
    });
    expect(parseQuotaPayload({ dailyLimit: 5, disabled: true }, { dailyLimit: 20, disabled: false })).toEqual({
      dailyLimit: 5,
      disabled: true
    });
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
