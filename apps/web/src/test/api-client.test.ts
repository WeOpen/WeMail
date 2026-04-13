import { afterEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "../shared/api/client";
import { jsonResponse } from "./helpers/mock-api";

describe("api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the worker origin for auth requests during local development", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse({ ok: true }));

    await apiFetch("/auth/register", { method: "POST", body: JSON.stringify({}) });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/auth/register",
      expect.objectContaining({
        credentials: "include",
        method: "POST"
      })
    );
  });
});
