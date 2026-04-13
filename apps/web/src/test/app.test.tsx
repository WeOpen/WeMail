import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../app/App";
import { jsonResponse } from "./helpers/mock-api";

describe("App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse({}));
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
  });

  it(
    "renders the hero copy for signed-out users",
    async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("not authenticated"));
      render(<App />);

      expect(
        await screen.findByRole("heading", {
          name: /自托管临时邮箱，给团队一套可控的收信与管理工作台/i
        })
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /登录/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /注册/i })).toBeInTheDocument();
    },
    10000
  );

  it(
    "navigates from the landing page to the login form",
    async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("not authenticated"));
      render(<App />);

      fireEvent.click(await screen.findByRole("link", { name: /登录/i }));

      expect(await screen.findByRole("button", { name: /^立即登录$/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/邮箱/i)).toBeInTheDocument();
    },
    10000
  );

  it(
    "shows mailbox oversight inside the redesigned admin shell for admins",
    async () => {
      window.history.pushState({}, "", "/admin");
      vi.restoreAllMocks();
      vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

        if (url.endsWith("/auth/session")) {
          return jsonResponse({
            user: {
              id: "admin-1",
              email: "admin@example.com",
              role: "admin",
              createdAt: "2026-04-08T00:00:00.000Z"
            },
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: true
            }
          });
        }

        if (url.endsWith("/api/mailboxes")) return jsonResponse({ mailboxes: [] });
        if (url.endsWith("/api/keys")) return jsonResponse({ keys: [] });
        if (url.endsWith("/api/telegram")) return jsonResponse({ subscription: null });
        if (url.endsWith("/admin/users")) {
          return jsonResponse({
            users: [
              {
                id: "admin-1",
                email: "admin@example.com",
                role: "admin",
                createdAt: "2026-04-08T00:00:00.000Z"
              }
            ]
          });
        }
        if (url.endsWith("/admin/invites")) return jsonResponse({ invites: [] });
        if (url.endsWith("/admin/features")) {
          return jsonResponse({
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: true
            }
          });
        }
        if (url.includes("/admin/quotas/")) {
          return jsonResponse({
            quota: {
              userId: "admin-1",
              dailyLimit: 20,
              sendsToday: 0,
              disabled: false,
              updatedAt: "2026-04-08T00:00:00.000Z"
            }
          });
        }
        if (url.endsWith("/admin/mailboxes")) {
          return jsonResponse({
            mailboxes: [
              {
                id: "box-1",
                userId: "admin-1",
                address: "ops@example.com",
                label: "Ops",
                createdAt: "2026-04-08T00:00:00.000Z"
              }
            ]
          });
        }

        return jsonResponse({});
      });

      render(<App />);

      expect(await screen.findByRole("heading", { name: /访问、配额与系统开关/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /邮箱总览/i })).toBeInTheDocument();
      expect(await screen.findByText(/ops@example.com/i)).toBeInTheDocument();
    },
    10000
  );

  it(
    "does not keep refetching session and admin data after admin login",
    async () => {
      window.history.pushState({}, "", "/admin");
      const calls = new Map<string, number>();
      vi.restoreAllMocks();
      vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
        calls.set(url, (calls.get(url) ?? 0) + 1);

        if (url.endsWith("/auth/session")) {
          return jsonResponse({
            user: {
              id: "admin-1",
              email: "admin@example.com",
              role: "admin",
              createdAt: "2026-04-08T00:00:00.000Z"
            },
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: true
            }
          });
        }

        if (url.endsWith("/api/mailboxes")) return jsonResponse({ mailboxes: [] });
        if (url.endsWith("/api/keys")) return jsonResponse({ keys: [] });
        if (url.endsWith("/api/telegram")) return jsonResponse({ subscription: null });
        if (url.endsWith("/admin/users")) {
          return jsonResponse({
            users: [{ id: "admin-1", email: "admin@example.com", role: "admin", createdAt: "2026-04-08T00:00:00.000Z" }]
          });
        }
        if (url.endsWith("/admin/invites")) return jsonResponse({ invites: [] });
        if (url.endsWith("/admin/features")) {
          return jsonResponse({
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: true
            }
          });
        }
        if (url.includes("/admin/quotas/")) {
          return jsonResponse({
            quota: {
              userId: "admin-1",
              dailyLimit: 20,
              sendsToday: 0,
              disabled: false,
              updatedAt: "2026-04-08T00:00:00.000Z"
            }
          });
        }
        if (url.endsWith("/admin/mailboxes")) return jsonResponse({ mailboxes: [] });
        return jsonResponse({});
      });

      render(<App />);
      expect(await screen.findByRole("heading", { name: /访问、配额与系统开关/i })).toBeInTheDocument();

      await waitFor(() => {
        expect(calls.get("http://127.0.0.1:8787/auth/session") ?? 0).toBe(1);
        expect(calls.get("http://127.0.0.1:8787/admin/users") ?? 0).toBe(1);
      });
    },
    10000
  );
});
