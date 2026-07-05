import { describe, expect, it } from "vitest";

import { formatDisplayEmail, formatDisplayEmailsInText } from "../shared/display";

const longRelayEmail = "5dcn5bfvq26x9a3mceg7t3mbhy00swdpn3hxaxj213f4h110bk@privaterelay.linux.do";

describe("display formatters", () => {
  it("shortens long user emails through the middle of the local part", () => {
    expect(formatDisplayEmail(longRelayEmail)).toBe("5dcn5bfv...4h110bk@privaterelay.linux.do");
    expect(formatDisplayEmail("member@example.com")).toBe("member@example.com");
  });

  it("shortens emails embedded in audit text", () => {
    expect(formatDisplayEmailsInText(`Admin User / ${longRelayEmail}`)).toBe(
      "Admin User / 5dcn5bfv...4h110bk@privaterelay.linux.do"
    );
  });
});
