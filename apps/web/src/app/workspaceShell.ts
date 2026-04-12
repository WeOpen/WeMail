import type {
  ApiKeySummary,
  FeatureToggles,
  MailboxSummary,
  QuotaSummary,
  SessionSummary,
  TelegramSubscriptionSummary,
  UserSummary
} from "@wemail/shared";

import type { InviteSummary } from "../features/admin/types";
import type { OutboundHistoryItem } from "../features/inbox/types";

type RouteKey = "inbox" | "settings" | "admin";

type WorkspaceAction = {
  kind: "button" | "link";
  label: string;
  tone: "primary" | "secondary" | "ghost";
  onClick?: () => void;
  to?: string;
};

type WorkspaceHeroStat = {
  label: string;
  value: string;
  detail: string;
};

type WorkspaceHero = {
  eyebrow: string;
  title: string;
  description: string;
  stats: WorkspaceHeroStat[];
  actions: WorkspaceAction[];
};

type WorkspacePrimaryNavItem = {
  to: string;
  label: string;
  badge?: string;
};

type WorkspaceRailItem =
  | {
      kind: "link";
      label: string;
      to: string;
      badge?: string;
      hint?: string;
    }
  | {
      kind: "stat";
      label: string;
      value: string;
      hint?: string;
    };

type WorkspaceRailSection = {
  title: string;
  items: WorkspaceRailItem[];
};

export type WorkspaceShellState = {
  routeKey: RouteKey;
  routeLabel: string;
  searchPlaceholder: string;
  primaryNav: WorkspacePrimaryNavItem[];
  railSections: WorkspaceRailSection[];
  hero: WorkspaceHero;
};

type WorkspaceShellInput = {
  pathname: string;
  session: SessionSummary;
  inbox: {
    mailboxes: MailboxSummary[];
    messages: Array<{ id: string }>;
    outboundHistory: OutboundHistoryItem[];
    selectedMailboxId: string | null;
  };
  settings: {
    apiKeys: ApiKeySummary[];
    telegram: TelegramSubscriptionSummary | null;
  };
  admin: {
    adminUsers: UserSummary[];
    adminInvites: InviteSummary[];
    adminQuota: QuotaSummary | null;
    adminMailboxes: MailboxSummary[];
  };
  onOpenMailboxComposer: () => void;
};

function formatToggleState(featureToggles: FeatureToggles) {
  return [
    featureToggles.aiEnabled ? "AI live" : "AI muted",
    featureToggles.telegramEnabled ? "Telegram live" : "Telegram muted",
    featureToggles.outboundEnabled ? "Outbound live" : "Outbound paused"
  ];
}

function determineRouteKey(pathname: string): RouteKey {
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/admin")) return "admin";
  return "inbox";
}

function buildPrimaryNav(session: SessionSummary): WorkspacePrimaryNavItem[] {
  const nav: WorkspacePrimaryNavItem[] = [
    { to: "/", label: "Inbox" },
    { to: "/settings", label: "Access" }
  ];

  if (session.user.role === "admin") {
    nav.push({ to: "/admin", label: "Control" });
  }

  return nav;
}

export function buildWorkspaceShellState({
  pathname,
  session,
  inbox,
  settings,
  admin,
  onOpenMailboxComposer
}: WorkspaceShellInput): WorkspaceShellState {
  const routeKey = determineRouteKey(pathname);
  const primaryNav = buildPrimaryNav(session);
  const runtimeSignals = formatToggleState(session.featureToggles);
  const selectedMailbox = inbox.mailboxes.find((mailbox) => mailbox.id === inbox.selectedMailboxId) ?? null;

  const workspaceLinks: WorkspaceRailSection = {
    title: "Workspace",
    items: primaryNav.map((item) => ({
      kind: "link" as const,
      label: item.label,
      to: item.to,
      badge: item.to === "/admin" ? String(admin.adminUsers.length || 0) : undefined,
      hint: item.to === pathname ? "Active" : undefined
    }))
  };

  const runtimeSection: WorkspaceRailSection = {
    title: "Runtime",
    items: runtimeSignals.map((signal) => ({
      kind: "stat" as const,
      label: signal,
      value: session.user.role === "admin" ? "System" : "Session",
      hint: `Signed in as ${session.user.email}`
    }))
  };

  if (routeKey === "settings") {
    return {
      routeKey,
      routeLabel: "Access",
      searchPlaceholder: 'Search "keys"',
      primaryNav,
      railSections: [
        workspaceLinks,
        {
          title: "Access",
          items: [
            {
              kind: "stat",
              label: "API keys",
              value: String(settings.apiKeys.length),
              hint: settings.apiKeys.length > 0 ? "Automation tokens live" : "No automation tokens yet"
            },
            {
              kind: "stat",
              label: "Telegram",
              value: settings.telegram?.enabled ? "Live" : "Muted",
              hint: settings.telegram?.chatId ? `Chat ${settings.telegram.chatId}` : "No chat bound"
            },
            {
              kind: "stat",
              label: "Role",
              value: session.user.role === "admin" ? "Admin" : "Member",
              hint: session.user.email
            }
          ]
        },
        runtimeSection
      ],
      hero: {
        eyebrow: "Access layer",
        title: "Keys, alerts, every integration",
        description:
          "Manage automation credentials, notification routing, and operator-level access from the same rounded control surface.",
        stats: [
          {
            label: "API keys",
            value: String(settings.apiKeys.length),
            detail: settings.apiKeys.length > 0 ? "Active automation credentials" : "Generate the first key"
          },
          {
            label: "Telegram",
            value: settings.telegram?.enabled ? "Live" : "Muted",
            detail: settings.telegram?.chatId ? `Chat ${settings.telegram.chatId}` : "No chat connected"
          },
          {
            label: "Role",
            value: session.user.role === "admin" ? "Admin" : "Member",
            detail: "Permissions inherited from the current session"
          }
        ],
        actions: [
          { kind: "link", label: "Review inbox", to: "/", tone: "secondary" },
          session.user.role === "admin"
            ? { kind: "link", label: "Open control", to: "/admin", tone: "ghost" }
            : { kind: "button", label: "Session locked", tone: "ghost" }
        ]
      }
    };
  }

  if (routeKey === "admin") {
    const adminDisabled = session.user.role !== "admin";

    return {
      routeKey,
      routeLabel: "Control",
      searchPlaceholder: 'Search "quota"',
      primaryNav,
      railSections: [
        workspaceLinks,
        {
          title: "Control",
          items: adminDisabled
            ? [
                {
                  kind: "stat",
                  label: "Access",
                  value: "Restricted",
                  hint: "Admin role required"
                }
              ]
            : [
                {
                  kind: "stat",
                  label: "Users",
                  value: String(admin.adminUsers.length),
                  hint: "Managed identities"
                },
                {
                  kind: "stat",
                  label: "Invites",
                  value: String(admin.adminInvites.length),
                  hint: "Open and redeemed access codes"
                },
                {
                  kind: "stat",
                  label: "Mailboxes",
                  value: String(admin.adminMailboxes.length),
                  hint: "Tracked workspace endpoints"
                }
              ]
        },
        runtimeSection
      ],
      hero: {
        eyebrow: adminDisabled ? "Restricted zone" : "Control room",
        title: adminDisabled ? "Control surface is restricted" : "Control access, quotas, every switch",
        description: adminDisabled
          ? "The workspace shell remains visible, but this route only unlocks for administrative operators."
          : "High-fidelity control cards keep invites, quotas, feature toggles, and mailbox oversight within one operator dashboard.",
        stats: adminDisabled
          ? [
              {
                label: "Role",
                value: "Member",
                detail: "Promote the session to unlock admin controls"
              }
            ]
          : [
              {
                label: "Users",
                value: String(admin.adminUsers.length),
                detail: "Visible identities in the control room"
              },
              {
                label: "Daily limit",
                value: admin.adminQuota ? String(admin.adminQuota.dailyLimit) : "—",
                detail: admin.adminQuota ? `Current sends today ${admin.adminQuota.sendsToday}` : "Quota loads per selected user"
              },
              {
                label: "Feature live",
                value: session.featureToggles.aiEnabled ? "AI on" : "AI off",
                detail: session.featureToggles.outboundEnabled ? "Outbound enabled" : "Outbound paused"
              }
            ],
        actions: adminDisabled
          ? [{ kind: "link", label: "Back to inbox", to: "/", tone: "secondary" }]
          : [
              { kind: "link", label: "Review inbox", to: "/", tone: "secondary" },
              { kind: "link", label: "Adjust access", to: "/settings", tone: "ghost" }
            ]
      }
    };
  }

  return {
    routeKey,
    routeLabel: "Inbox",
    searchPlaceholder: 'Search "messages"',
    primaryNav,
    railSections: [
      workspaceLinks,
      {
        title: "Inbox",
        items: [
          {
            kind: "stat",
            label: "Mailboxes",
            value: String(inbox.mailboxes.length),
            hint: selectedMailbox ? `${selectedMailbox.label} active` : "Select a mailbox to focus traffic"
          },
          {
            kind: "stat",
            label: "Messages",
            value: String(inbox.messages.length),
            hint: inbox.messages.length > 0 ? "Recent message stream loaded" : "No messages in the stream"
          },
          {
            kind: "stat",
            label: "Outbound",
            value: String(inbox.outboundHistory.length),
            hint: inbox.outboundHistory.length > 0 ? "Recent sent history visible" : "No outbound activity yet"
          }
        ]
      },
      runtimeSection
    ],
    hero: {
      eyebrow: "Inbox workspace",
      title: "One workspace, every mailbox",
      description:
        "Route inbound traffic, inspect message detail, and send outbound follow-ups from a thesvg-style shell tuned for dense operator workflows.",
      stats: [
        {
          label: "Mailboxes",
          value: String(inbox.mailboxes.length),
          detail: selectedMailbox ? `${selectedMailbox.label} is active` : "Create the first mailbox to start routing"
        },
        {
          label: "Messages",
          value: String(inbox.messages.length),
          detail: inbox.messages.length > 0 ? "Live stream attached to the selected mailbox" : "The stream is ready for new mail"
        },
        {
          label: "Outbound",
          value: String(inbox.outboundHistory.length),
          detail: session.featureToggles.outboundEnabled ? "Outbound follow-ups are enabled" : "Outbound capability is paused"
        }
      ],
      actions: [
        { kind: "button", label: "Create mailbox", tone: "primary", onClick: onOpenMailboxComposer },
        { kind: "link", label: "Open access", to: "/settings", tone: "secondary" },
        session.user.role === "admin"
          ? { kind: "link", label: "View control", to: "/admin", tone: "ghost" }
          : { kind: "button", label: "Member session", tone: "ghost" }
      ]
    }
  };
}
