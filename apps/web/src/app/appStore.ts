import { create } from "zustand";

import type {
  ApiKeySummary,
  FeatureToggles,
  MailboxSummary,
  MessageSummary,
  QuotaSummary,
  SessionSummary,
  TelegramSubscriptionSummary,
  UserSummary
} from "@wemail/shared";

import type { InviteSummary } from "../features/admin/types";
import type { OutboundHistoryItem } from "../features/inbox/types";
import { createToast, type WemailToastInput, type WemailToastRecord } from "../shared/toast";

export type WorkspaceTheme = "dark" | "light";
export type WorkspaceThemePreference = WorkspaceTheme | "system";

export const WORKSPACE_THEME_STORAGE_KEY = "wemail-workspace-theme";

type SessionScopedState = {
  session: SessionSummary | null;
  mailboxes: MailboxSummary[];
  selectedMailboxId: string | null;
  messages: MessageSummary[];
  selectedMessageId: string | null;
  outboundHistory: OutboundHistoryItem[];
  apiKeys: ApiKeySummary[];
  telegram: TelegramSubscriptionSummary | null;
  adminUsers: UserSummary[];
  adminInvites: InviteSummary[];
  adminFeatures: FeatureToggles | null;
  adminQuota: QuotaSummary | null;
  adminMailboxes: MailboxSummary[];
};

type AppState = SessionScopedState & {
  authError: string | null;
  loadingSession: boolean;
  toasts: WemailToastRecord[];
  themePreference: WorkspaceThemePreference;
  systemTheme: WorkspaceTheme;
  mailboxComposerOpen: boolean;
};

type AdminDashboardState = {
  users: UserSummary[];
  invites: InviteSummary[];
  features: FeatureToggles;
  mailboxes: MailboxSummary[];
  quota: QuotaSummary | null;
};

type AppActions = {
  setSession: (session: SessionSummary) => void;
  clearSession: () => void;
  setAuthError: (authError: string | null) => void;
  setLoadingSession: (loadingSession: boolean) => void;
  pushToast: (input: WemailToastInput) => void;
  dismissToast: (id: string) => void;
  setThemePreference: (themePreference: WorkspaceThemePreference) => void;
  setSystemTheme: (systemTheme: WorkspaceTheme) => void;
  setMailboxComposerOpen: (mailboxComposerOpen: boolean) => void;
  setMailboxes: (mailboxes: MailboxSummary[], preferredMailboxId?: string | null) => void;
  setSelectedMailboxId: (selectedMailboxId: string | null) => void;
  setMessages: (messages: MessageSummary[]) => void;
  setSelectedMessageId: (selectedMessageId: string | null) => void;
  setOutboundHistory: (outboundHistory: OutboundHistoryItem[]) => void;
  setSettingsData: (apiKeys: ApiKeySummary[], telegram: TelegramSubscriptionSummary | null) => void;
  setAdminDashboard: (dashboard: AdminDashboardState) => void;
  setAdminQuota: (adminQuota: QuotaSummary | null) => void;
  setAdminFeatures: (adminFeatures: FeatureToggles) => void;
};

type AppStore = AppState & AppActions;

function resolveSystemTheme(): WorkspaceTheme {
  if (typeof window === "undefined") return "dark";

  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return "dark";
}

function resolveInitialThemePreference(): WorkspaceThemePreference {
  if (typeof window === "undefined") return "system";

  const storedTheme = window.localStorage.getItem(WORKSPACE_THEME_STORAGE_KEY);
  if (storedTheme === "dark" || storedTheme === "light" || storedTheme === "system") return storedTheme;

  return "system";
}

function createSessionScopedState(): SessionScopedState {
  return {
    session: null,
    mailboxes: [],
    selectedMailboxId: null,
    messages: [],
    selectedMessageId: null,
    outboundHistory: [],
    apiKeys: [],
    telegram: null,
    adminUsers: [],
    adminInvites: [],
    adminFeatures: null,
    adminQuota: null,
    adminMailboxes: []
  };
}

function createInitialState(themePreference: WorkspaceThemePreference): AppState {
  return {
    ...createSessionScopedState(),
    authError: null,
    loadingSession: true,
    toasts: [],
    themePreference,
    systemTheme: resolveSystemTheme(),
    mailboxComposerOpen: false
  };
}

function pickNextMailboxId(mailboxes: MailboxSummary[], preferredMailboxId?: string | null) {
  return preferredMailboxId ?? mailboxes[0]?.id ?? null;
}

export const useAppStore = create<AppStore>()((set) => ({
  ...createInitialState(resolveInitialThemePreference()),
  setSession: (session) => set({ session }),
  clearSession: () => set(createSessionScopedState()),
  setAuthError: (authError) => set({ authError }),
  setLoadingSession: (loadingSession) => set({ loadingSession }),
  pushToast: (input) => set((state) => ({ toasts: [createToast(input), ...state.toasts] })),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  setThemePreference: (themePreference) => set({ themePreference }),
  setSystemTheme: (systemTheme) => set({ systemTheme }),
  setMailboxComposerOpen: (mailboxComposerOpen) => set({ mailboxComposerOpen }),
  setMailboxes: (mailboxes, preferredMailboxId) =>
    set({
      mailboxes,
      selectedMailboxId: pickNextMailboxId(mailboxes, preferredMailboxId)
    }),
  setSelectedMailboxId: (selectedMailboxId) => set({ selectedMailboxId }),
  setMessages: (messages) =>
    set({
      messages,
      selectedMessageId: messages[0]?.id ?? null
    }),
  setSelectedMessageId: (selectedMessageId) => set({ selectedMessageId }),
  setOutboundHistory: (outboundHistory) => set({ outboundHistory }),
  setSettingsData: (apiKeys, telegram) => set({ apiKeys, telegram }),
  setAdminDashboard: (dashboard) =>
    set({
      adminUsers: dashboard.users,
      adminInvites: dashboard.invites,
      adminFeatures: dashboard.features,
      adminMailboxes: dashboard.mailboxes,
      adminQuota: dashboard.quota
    }),
  setAdminQuota: (adminQuota) => set({ adminQuota }),
  setAdminFeatures: (adminFeatures) => set({ adminFeatures })
}));

export function resetAppStore() {
  useAppStore.setState(createInitialState("system"));
}
