import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../app/App";
import { jsonResponse } from "../helpers/mock-api";

function profilePayload(overrides?: { name?: string; bio?: string; landingPage?: string; density?: string }) {
  return {
    profile: {
      user: {
        id: "member-1",
        email: "member@example.com",
        name: overrides?.name ?? "Backend Profile",
        role: "member",
        status: "active",
        createdAt: "2026-04-08T00:00:00.000Z",
        updatedAt: "2026-04-09T00:00:00.000Z"
      },
      preferences: {
        bio: overrides?.bio ?? "Loaded from backend",
        locale: "en-US",
        timezone: "Asia/Tokyo",
        dateFormat: "dd-mm-yyyy",
        landingPage: overrides?.landingPage ?? "/mail/list",
        density: overrides?.density ?? "compact",
        updatedAt: "2026-04-09T00:00:00.000Z"
      }
    }
  };
}

describe("system profile route integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.pushState({}, "", "/system/profile");
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
  });

  it("loads the personal settings page from the profile API and saves changes back", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

      if (url.endsWith("/api/auth/session")) {
        return jsonResponse({
          user: {
            id: "member-1",
            email: "member@example.com",
            name: "Session Name",
            role: "member",
            status: "active",
            createdAt: "2026-04-08T00:00:00.000Z",
            updatedAt: "2026-04-08T00:00:00.000Z"
          },
          featureToggles: {
            aiEnabled: true,
            telegramEnabled: true,
            outboundEnabled: true,
            mailboxCreationEnabled: true
          }
        });
      }

      if (url.endsWith("/api/profile") && init?.method === "PATCH") {
        return jsonResponse(profilePayload({ name: "Route Renamed", bio: "Saved to backend" }));
      }

      if (url.endsWith("/api/profile")) return jsonResponse(profilePayload());
      if (url.endsWith("/api/accounts")) return jsonResponse({ mailboxes: [] });
      if (url.endsWith("/api/api-keys")) return jsonResponse({ keys: [] });
      if (url.endsWith("/api/telegram/subscription")) return jsonResponse({ subscription: null });
      return jsonResponse({});
    });

    render(<App />);

    expect(await screen.findByDisplayValue("Backend Profile")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Loaded from backend")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Edge mail operations owner")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("显示名"), { target: { value: "Route Renamed" } });
    fireEvent.change(screen.getByLabelText("个人简介"), { target: { value: "Saved to backend" } });
    fireEvent.click(screen.getByRole("button", { name: "保存资料" }));

    await waitFor(() => {
      const profilePatch = fetchMock.mock.calls.find(([url, init]) => {
        const requestUrl = typeof url === "string" ? url : url instanceof Request ? url.url : String(url);
        return requestUrl.endsWith("/api/profile") && init?.method === "PATCH";
      });
      expect(profilePatch).toBeDefined();
      expect(JSON.parse(String(profilePatch?.[1]?.body))).toEqual({
        name: "Route Renamed",
        preferences: {
          bio: "Saved to backend"
        }
      });
    });
  });

  it("shows a retryable profile loading error when the profile API fails", async () => {
    let profileRequests = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

      if (url.endsWith("/api/auth/session")) {
        return jsonResponse({
          user: {
            id: "member-1",
            email: "member@example.com",
            name: "Session Name",
            role: "member",
            status: "active",
            createdAt: "2026-04-08T00:00:00.000Z",
            updatedAt: "2026-04-08T00:00:00.000Z"
          },
          featureToggles: {
            aiEnabled: true,
            telegramEnabled: true,
            outboundEnabled: true,
            mailboxCreationEnabled: true
          }
        });
      }

      if (url.endsWith("/api/profile")) {
        profileRequests += 1;
        if (profileRequests === 1) return jsonResponse({ error: "Profile unavailable" }, 500);
        return jsonResponse(profilePayload());
      }

      if (url.endsWith("/api/accounts")) return jsonResponse({ mailboxes: [] });
      if (url.endsWith("/api/api-keys")) return jsonResponse({ keys: [] });
      if (url.endsWith("/api/telegram/subscription")) return jsonResponse({ subscription: null });
      return jsonResponse({});
    });

    render(<App />);

    expect(await screen.findByRole("alert", { name: "个人设置加载失败" })).toHaveTextContent("Profile unavailable");

    fireEvent.click(screen.getByRole("button", { name: "重试同步" }));

    expect(await screen.findByDisplayValue("Backend Profile")).toBeInTheDocument();
    expect(profileRequests).toBe(2);
  });

  it("uses the backend profile landing page and density after sign-in", async () => {
    window.history.pushState({}, "", "/login");
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

      if (url.endsWith("/api/auth/session")) {
        return jsonResponse({
          user: {
            id: "member-1",
            email: "member@example.com",
            name: "Session Name",
            role: "member",
            status: "active",
            createdAt: "2026-04-08T00:00:00.000Z",
            updatedAt: "2026-04-08T00:00:00.000Z"
          },
          featureToggles: {
            aiEnabled: true,
            telegramEnabled: true,
            outboundEnabled: true,
            mailboxCreationEnabled: true
          }
        });
      }

      if (url.endsWith("/api/profile")) return jsonResponse(profilePayload({ landingPage: "/mail/list", density: "compact" }));
      if (url.endsWith("/api/accounts")) return jsonResponse({ mailboxes: [] });
      if (url.endsWith("/api/api-keys")) return jsonResponse({ keys: [] });
      if (url.endsWith("/api/telegram/subscription")) return jsonResponse({ subscription: null });
      return jsonResponse({});
    });

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/mail/list");
    });
    await waitFor(() => {
      expect(document.querySelector(".workspace-shell")).toHaveAttribute("data-density", "compact");
    });
  });
});
