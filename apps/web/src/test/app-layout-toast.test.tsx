import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SessionSummary } from "@wemail/shared";

import { AppLayout } from "../app/AppLayout";
import type { WorkspaceShellState } from "../app/workspaceShell";

const session: SessionSummary = {
  user: {
    id: "member-1",
    email: "member@example.com",
    role: "member",
    createdAt: "2026-04-08T00:00:00.000Z"
  },
  featureToggles: {
    aiEnabled: true,
    telegramEnabled: true,
    outboundEnabled: true,
    mailboxCreationEnabled: true
  }
};

const shell: WorkspaceShellState = {
  routeKey: "dashboard",
  routeLabel: "仪表盘",
  activePrimaryId: "dashboard",
  activePrimaryLabel: "仪表盘",
  secondaryNav: [],
  railSections: [
    {
      title: "工作台",
      items: [{ id: "dashboard", icon: "dashboard", label: "仪表盘", to: "/dashboard" }]
    }
  ],
  hero: {
    eyebrow: "仪表盘",
    title: "平台总览",
    description: "dashboard hero",
    stats: [],
    actions: []
  }
};

describe("AppLayout notice removal", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not render the old workspace notice banner anymore", () => {
    const { container } = render(
      <MemoryRouter>
        <AppLayout
          session={session}
          onLogout={vi.fn()}
          onToggleTheme={vi.fn()}
          shell={shell}
          theme="light"
        >
          <div>dashboard body</div>
        </AppLayout>
      </MemoryRouter>
    );

    expect(screen.getByText("dashboard body")).toBeInTheDocument();
    expect(container.querySelector(".workspace-notice-banner")).toBeNull();
  });
});
