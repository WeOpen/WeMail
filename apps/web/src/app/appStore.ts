import { create } from "zustand";

import type {
  ApiKeySummary,
  DictionaryCatalogGroup,
  FeatureToggles,
  MailboxSummary,
  MessageSummary,
  QuotaSummary,
  SessionSummary,
  TelegramDeliverySummary,
  TelegramOverviewSummary,
  TelegramSubscriptionSummary,
  UserSummary
} from "@wemail/shared";

import type { AdminUserStats, InviteSummary } from "../features/admin/types";
import type { OutboundHistoryItem } from "../features/inbox/types";
import { createToast, type WemailToastInput, type WemailToastRecord } from "../shared/toast";

export type WorkspaceTheme = "dark" | "light";
export type WorkspaceThemePreference = WorkspaceTheme | "system";

export const WORKSPACE_THEME_STORAGE_KEY = "wemail-workspace-theme";

export const emptyTelegramOverview: TelegramOverviewSummary = {
  botConfigured: false,
  canSendTest: false,
  featureEnabled: false,
  subscription: null,
  supportedEvents: []
};

type SessionScopedState = {
  session: SessionSummary | null;
  mailboxes: MailboxSummary[];
  selectedMailboxId: string | null;
  messages: MessageSummary[];
  selectedMessageId: string | null;
  outboundHistory: OutboundHistoryItem[];
  apiKeys: ApiKeySummary[];
  telegram: TelegramSubscriptionSummary | null;
  telegramOverview: TelegramOverviewSummary;
  telegramDeliveries: TelegramDeliverySummary[];
  adminUsers: UserSummary[];
  adminUsersTotal: number;
  adminSettingsUsers: UserSummary[];
  adminUserStats: AdminUserStats;
  adminInvites: InviteSummary[];
  adminInvitesAvailable: number;
  adminInvitesPage: number;
  adminInvitesPageSize: number;
  adminInvitesTotal: number;
  adminFeatures: FeatureToggles | null;
  adminQuota: QuotaSummary | null;
  adminMailboxes: MailboxSummary[];
  adminLatestMailbox: MailboxSummary | null;
  adminMailboxesPage: number;
  adminMailboxesPageSize: number;
  adminMailboxesTotal: number;
  dictionaries: DictionaryCatalogGroup[];
  dictionaryByGroup: Record<string, DictionaryCatalogGroup>;
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
  usersTotal: number;
  usersPage: number;
  usersPageSize: number;
  settingsUsers: UserSummary[];
  userStats: AdminUserStats;
  invites: InviteSummary[];
  invitesAvailable: number;
  invitesPage: number;
  invitesPageSize: number;
  invitesTotal: number;
  features: FeatureToggles;
  latestMailbox: MailboxSummary | null;
  mailboxes: MailboxSummary[];
  mailboxesPage: number;
  mailboxesPageSize: number;
  mailboxesTotal: number;
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
  setSettingsData: (
    apiKeys: ApiKeySummary[],
    telegramOverview: TelegramOverviewSummary,
    telegramDeliveries?: TelegramDeliverySummary[]
  ) => void;
  setAdminDashboard: (dashboard: AdminDashboardState) => void;
  setAdminUsers: (users: UserSummary[], total: number) => void;
  setAdminUserSettingsSummary: (payload: { settingsUsers: UserSummary[]; userStats: AdminUserStats }) => void;
  setAdminInvites: (payload: {
    invites: InviteSummary[];
    invitesAvailable: number;
    invitesPage: number;
    invitesPageSize: number;
    invitesTotal: number;
  }) => void;
  setAdminMailboxes: (payload: {
    latestMailbox: MailboxSummary | null;
    mailboxes: MailboxSummary[];
    mailboxesPage: number;
    mailboxesPageSize: number;
    mailboxesTotal: number;
  }) => void;
  setAdminQuota: (adminQuota: QuotaSummary | null) => void;
  setAdminFeatures: (adminFeatures: FeatureToggles) => void;
  setDictionaries: (dictionaries: DictionaryCatalogGroup[]) => void;
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
    telegramOverview: emptyTelegramOverview,
    telegramDeliveries: [],
    adminUsers: [],
    adminUsersTotal: 0,
    adminSettingsUsers: [],
    adminUserStats: { active: 0, total: 0 },
    adminInvites: [],
    adminInvitesAvailable: 0,
    adminInvitesPage: 1,
    adminInvitesPageSize: 5,
    adminInvitesTotal: 0,
    adminFeatures: null,
    adminQuota: null,
    adminMailboxes: [],
    adminLatestMailbox: null,
    adminMailboxesPage: 1,
    adminMailboxesPageSize: 5,
    adminMailboxesTotal: 0,
    dictionaries: [],
    dictionaryByGroup: {}
  };
}

function indexDictionaries(dictionaries: DictionaryCatalogGroup[]) {
  return dictionaries.reduce<Record<string, DictionaryCatalogGroup>>((indexed, dictionary) => {
    indexed[dictionary.groupKey] = dictionary;
    return indexed;
  }, {});
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

function pickNextMailboxId(preferredMailboxId?: string | null) {
  if (typeof preferredMailboxId !== "undefined") return preferredMailboxId;
  return null;
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
      selectedMailboxId: pickNextMailboxId(preferredMailboxId)
    }),
  setSelectedMailboxId: (selectedMailboxId) => set({ selectedMailboxId }),
  setMessages: (messages) =>
    set({
      messages,
      selectedMessageId: messages[0]?.id ?? null
    }),
  setSelectedMessageId: (selectedMessageId) => set({ selectedMessageId }),
  setOutboundHistory: (outboundHistory) => set({ outboundHistory }),
  setSettingsData: (apiKeys, telegramOverview, telegramDeliveries = []) => {
    const nextTelegramOverview = telegramOverview ?? emptyTelegramOverview;
    return set({
      apiKeys,
      telegram: nextTelegramOverview.subscription
        ? { chatId: nextTelegramOverview.subscription.chatId, enabled: nextTelegramOverview.subscription.enabled }
        : null,
      telegramOverview: nextTelegramOverview,
      telegramDeliveries
    });
  },
  setAdminDashboard: (dashboard) =>
    set({
      adminUsers: dashboard.users,
      adminUsersTotal: dashboard.usersTotal,
      adminSettingsUsers: dashboard.settingsUsers,
      adminUserStats: dashboard.userStats,
      adminInvites: dashboard.invites,
      adminInvitesAvailable: dashboard.invitesAvailable,
      adminInvitesPage: dashboard.invitesPage,
      adminInvitesPageSize: dashboard.invitesPageSize,
      adminInvitesTotal: dashboard.invitesTotal,
      adminFeatures: dashboard.features,
      adminMailboxes: dashboard.mailboxes,
      adminLatestMailbox: dashboard.latestMailbox,
      adminMailboxesPage: dashboard.mailboxesPage,
      adminMailboxesPageSize: dashboard.mailboxesPageSize,
      adminMailboxesTotal: dashboard.mailboxesTotal,
      adminQuota: dashboard.quota
    }),
  setAdminUsers: (adminUsers, adminUsersTotal) => set({ adminUsers, adminUsersTotal }),
  setAdminUserSettingsSummary: (payload) =>
    set({
      adminSettingsUsers: payload.settingsUsers,
      adminUserStats: payload.userStats
    }),
  setAdminInvites: (payload) =>
    set({
      adminInvites: payload.invites,
      adminInvitesAvailable: payload.invitesAvailable,
      adminInvitesPage: payload.invitesPage,
      adminInvitesPageSize: payload.invitesPageSize,
      adminInvitesTotal: payload.invitesTotal
    }),
  setAdminMailboxes: (payload) =>
    set({
      adminLatestMailbox: payload.latestMailbox,
      adminMailboxes: payload.mailboxes,
      adminMailboxesPage: payload.mailboxesPage,
      adminMailboxesPageSize: payload.mailboxesPageSize,
      adminMailboxesTotal: payload.mailboxesTotal
    }),
  setAdminQuota: (adminQuota) => set({ adminQuota }),
  setAdminFeatures: (adminFeatures) => set({ adminFeatures }),
  setDictionaries: (dictionaries) =>
    set({
      dictionaries,
      dictionaryByGroup: indexDictionaries(dictionaries)
    })
}));

export function resetAppStore() {
  useAppStore.setState(createInitialState("system"));
}
