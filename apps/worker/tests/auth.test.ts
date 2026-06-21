import { afterEach, describe, expect, it, vi } from "vitest";

import { hashPassword, verifyPassword } from "../src/shared/auth";

describe("auth password hashing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses a Worker-compatible PBKDF2 iteration count", async () => {
    const deriveBitsSpy = vi.spyOn(crypto.subtle, "deriveBits");

    const stored = await hashPassword("password123");

    const params = deriveBitsSpy.mock.calls.at(-1)?.[0] as Pbkdf2Params | undefined;
    expect(params?.iterations).toBeLessThanOrEqual(100_000);
    expect(stored).toMatch(/^pbkdf2-sha256:100000:[^:]+:[a-f0-9]+$/);
    expect(await verifyPassword("password123", stored)).toBe(true);
    expect(await verifyPassword("not-password123", stored)).toBe(false);
  });

  it("continues to verify legacy unversioned hashes generated with the Worker-compatible default", async () => {
    const stored = await hashPassword("password123");
    const [, , salt, digest] = stored.split(":");
    const legacyStored = `${salt}:${digest}`;

    expect(await verifyPassword("password123", legacyStored)).toBe(true);
    expect(await verifyPassword("not-password123", legacyStored)).toBe(false);
  });

  it("rejects versioned hashes above the Worker PBKDF2 ceiling without calling WebCrypto", async () => {
    const deriveBitsSpy = vi.spyOn(crypto.subtle, "deriveBits");

    await expect(verifyPassword("password123", "pbkdf2-sha256:120000:salt:digest")).resolves.toBe(false);
    expect(deriveBitsSpy).not.toHaveBeenCalled();
  });
});
