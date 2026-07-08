import { describe, expect, it } from "vitest";

import { extractImportantInfo } from "../src/index";

describe("extractImportantInfo", () => {
  it("prefers a verification code over links", () => {
    const result = extractImportantInfo({
      subject: "Your verification code",
      text: "Use code 123456 to sign in. Or click https://example.com/login"
    });

    expect(result).toEqual({
      method: "regex",
      type: "auth_code",
      value: "123456",
      label: "Verification code"
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

    expect(result).toEqual({
      method: "none",
      type: "none",
      value: "",
      label: ""
    });
  });

  it("keeps extracting alphanumeric codes that contain digits", () => {
    const result = extractImportantInfo({
      subject: "Your verification code",
      text: "Use verification code A1B2C3 to continue."
    });

    expect(result).toEqual({
      method: "regex",
      type: "auth_code",
      value: "A1B2C3",
      label: "Verification code"
    });
  });

  it("returns none when nothing useful is found", () => {
    const result = extractImportantInfo({
      subject: "Newsletter",
      text: "Welcome to our monthly update."
    });

    expect(result).toEqual({
      method: "none",
      type: "none",
      value: "",
      label: ""
    });
  });
});
