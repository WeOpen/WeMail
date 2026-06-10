import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FeatureToggles, SessionSummary, UserSummary } from "@wemail/shared";

import { resetAppStore, useAppStore } from "../app/appStore";
import { useAdminData } from "../features/admin/useAdminData";
import { queryAdminDashboard } from "../features/admin/queries";
import { jsonResponse } from "./helpers/mock-api";

const adminSession: SessionSummary = {
  user: {
    id: "admin-1",
    email: "admin@example.com",
    name: "Admin User",
    role: "admin",
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
};

const quotaUsers: UserSummary[] = Array.from({ length: 12 }, (_, index) => {
  const userNumber = index + 1;
  return {
    id: userNumber === 1 ? "admin-1" : `member-${userNumber}`,
    email: userNumber === 1 ? "admin@example.com" : `member-${userNumber}@example.com`,
    name: userNumber === 1 ? "Admin User" : `Member ${userNumber}`,
    role: userNumber === 1 ? "admin" : "member",
    status: userNumber === 12 ? "disabled" : "active",
    createdAt: "2026-04-08T00:00:00.000Z",
    updatedAt: "2026-04-08T00:00:00.000Z"
  };
});

function getUrl(input: Parameters<typeof fetch>[0]) {
  return typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
}

describe("admin data", () => {
  afterEach(() => {
    cleanup();
    resetAppStore();
    vi.restoreAllMocks();
  });

  it("loads settings dashboard data from user summary and paginated invite/mailbox endpoints", async () => {
    const calls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = getUrl(input);
      calls.push(url);

      if (url.endsWith("/api/users/summary")) {
        return jsonResponse({
          quotaUsers,
          stats: { active: 11, total: 12 }
        });
      }

      if (url.includes("/api/users/invites?")) {
        return jsonResponse({
          available: 6,
          invites: [{ id: "invite-1", code: "INVITE-001", createdAt: "2026-04-08T00:00:00.000Z", redeemedAt: null, disabledAt: null }],
          page: 1,
          pageSize: 5,
          total: 7
        });
      }

      if (url.includes("/api/users/accounts?")) {
        return jsonResponse({
          latestMailbox: { id: "box-1", address: "box1@example.com", label: "Box 1", createdAt: "2026-04-08T00:00:00.000Z" },
          mailboxes: [{ id: "box-1", address: "box1@example.com", label: "Box 1", createdAt: "2026-04-08T00:00:00.000Z" }],
          page: 1,
          pageSize: 5,
          total: 6
        });
      }

      if (url.endsWith("/api/system/features")) {
        return jsonResponse({
          featureToggles: {
            aiEnabled: true,
            telegramEnabled: true,
            outboundEnabled: true,
            mailboxCreationEnabled: true
          }
        });
      }

      if (/\/api\/users\/admin-1\/quota$/.test(url)) {
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

      if (url.includes("/api/users")) {
        return jsonResponse({
          page: 1,
          pageSize: 10,
          total: 12,
          users: quotaUsers.slice(0, 10)
        });
      }

      return jsonResponse({});
    });

    const dashboard = await queryAdminDashboard();

    expect(dashboard.userStats).toEqual({ active: 11, total: 12 });
    expect(dashboard.settingsUsers).toHaveLength(12);
    expect(dashboard.invitesTotal).toBe(7);
    expect(dashboard.invitesAvailable).toBe(6);
    expect(dashboard.mailboxesTotal).toBe(6);
    expect(calls.some((url) => url.endsWith("/api/users/summary"))).toBe(true);
    expect(calls.some((url) => url.includes("/api/users/invites?page=1&pageSize=5"))).toBe(true);
    expect(calls.some((url) => url.includes("/api/users/accounts?page=1&pageSize=5"))).toBe(true);
  });

  it("stores the feature toggles returned by the backend after an update", async () => {
    const requestedToggles: FeatureToggles = {
      aiEnabled: true,
      telegramEnabled: true,
      outboundEnabled: true,
      mailboxCreationEnabled: true
    };
    const returnedToggles: FeatureToggles = {
      aiEnabled: false,
      telegramEnabled: true,
      outboundEnabled: true,
      mailboxCreationEnabled: true
    };
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = getUrl(input);
      if (url.endsWith("/api/system/features") && init?.method === "PATCH") {
        return jsonResponse({ featureToggles: returnedToggles });
      }
      return jsonResponse({});
    });

    function AdminDataHarness() {
      const admin = useAdminData({ session: adminSession, onToast: vi.fn() });
      return (
        <button onClick={() => void admin.toggleFeatures(requestedToggles)} type="button">
          更新功能开关
        </button>
      );
    }

    render(<AdminDataHarness />);
    fireEvent.click(screen.getByRole("button", { name: "更新功能开关" }));

    await waitFor(() => {
      expect(useAppStore.getState().adminFeatures).toEqual(returnedToggles);
    });
  });
});
