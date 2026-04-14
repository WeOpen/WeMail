import { describe, expect, it, vi } from "vitest";

import { buildWorkspaceShellState } from "../app/workspaceShell";

describe("buildWorkspaceShellState", () => {
  it("does not show a current-page hint on the active rail link", () => {
    const shell = buildWorkspaceShellState({
      pathname: "/",
      session: {
        user: {
          id: "member-1",
          email: "member@example.com",
          role: "member",
          createdAt: "2026-04-14T00:00:00.000Z"
        },
        featureToggles: {
          aiEnabled: true,
          telegramEnabled: true,
          outboundEnabled: true,
          mailboxCreationEnabled: true
        }
      },
      inbox: {
        mailboxes: [],
        messages: [],
        outboundHistory: [],
        selectedMailboxId: null
      },
      settings: {
        apiKeys: [],
        telegram: null
      },
      admin: {
        adminUsers: [],
        adminInvites: [],
        adminQuota: null,
        adminMailboxes: []
      },
      onOpenMailboxComposer: vi.fn()
    });

    const workspaceSection = shell.railSections[0];
    const activeInboxLink = workspaceSection.items.find(
      (item) => item.kind === "link" && item.to === "/"
    );

    expect(activeInboxLink).toEqual({
      kind: "link",
      icon: "inbox",
      label: "收件箱",
      to: "/",
      badge: undefined
    });
  });
});
