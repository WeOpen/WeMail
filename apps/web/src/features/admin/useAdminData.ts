import { FormEvent, useCallback, useRef, useState } from "react";

import type { FeatureToggles, SessionSummary, UserRole, UserStatus } from "@wemail/shared";

import { useAppStore } from "../../app/appStore";
import type { WemailToastInput } from "../../shared/toast";
import {
  createAdminUserAction,
  createInviteAction,
  deleteAdminUserAction,
  disableInviteAction,
  resetAdminUserPasswordAction,
  updateAdminUserRoleAction,
  updateAdminUserAction,
  updateAdminUserStatusAction,
  updateFeatureTogglesAction,
  updateQuotaAction
} from "./actions";
import {
  ADMIN_SETTINGS_PAGE_SIZE,
  queryAdminDashboard,
  queryAdminInvites,
  queryAdminMailboxes,
  queryAdminUserSettingsSummary,
  queryAdminUsers,
  queryQuota
} from "./queries";
import type { AdminSettingsListQuery, AdminUsersQuery } from "./types";

const DEFAULT_ADMIN_USERS_QUERY: AdminUsersQuery = {
  page: 1,
  pageSize: 10,
  search: "",
  role: "all",
  status: "all"
};

const USERS_LOAD_ERROR = "用户列表加载失败，请稍后重试。";
const DEFAULT_ADMIN_SETTINGS_QUERY: AdminSettingsListQuery = {
  page: 1,
  pageSize: ADMIN_SETTINGS_PAGE_SIZE
};

type UseAdminDataOptions = {
  session: SessionSummary | null;
  onToast: (toast: WemailToastInput) => void;
};

export function useAdminData({ session, onToast }: UseAdminDataOptions) {
  const adminUsers = useAppStore((state) => state.adminUsers);
  const adminUsersTotal = useAppStore((state) => state.adminUsersTotal);
  const adminSettingsUsers = useAppStore((state) => state.adminSettingsUsers);
  const adminUserStats = useAppStore((state) => state.adminUserStats);
  const adminInvites = useAppStore((state) => state.adminInvites);
  const adminInvitesAvailable = useAppStore((state) => state.adminInvitesAvailable);
  const adminInvitesPage = useAppStore((state) => state.adminInvitesPage);
  const adminInvitesPageSize = useAppStore((state) => state.adminInvitesPageSize);
  const adminInvitesTotal = useAppStore((state) => state.adminInvitesTotal);
  const adminFeatures = useAppStore((state) => state.adminFeatures);
  const adminQuota = useAppStore((state) => state.adminQuota);
  const adminMailboxes = useAppStore((state) => state.adminMailboxes);
  const adminLatestMailbox = useAppStore((state) => state.adminLatestMailbox);
  const adminMailboxesPage = useAppStore((state) => state.adminMailboxesPage);
  const adminMailboxesPageSize = useAppStore((state) => state.adminMailboxesPageSize);
  const adminMailboxesTotal = useAppStore((state) => state.adminMailboxesTotal);
  const setAdminDashboard = useAppStore((state) => state.setAdminDashboard);
  const setAdminUsers = useAppStore((state) => state.setAdminUsers);
  const setAdminUserSettingsSummary = useAppStore((state) => state.setAdminUserSettingsSummary);
  const setAdminInvites = useAppStore((state) => state.setAdminInvites);
  const setAdminMailboxes = useAppStore((state) => state.setAdminMailboxes);
  const setAdminQuota = useAppStore((state) => state.setAdminQuota);
  const setAdminFeatures = useAppStore((state) => state.setAdminFeatures);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const lastUsersQuery = useRef<AdminUsersQuery>(DEFAULT_ADMIN_USERS_QUERY);
  const lastInvitesQuery = useRef<AdminSettingsListQuery>(DEFAULT_ADMIN_SETTINGS_QUERY);
  const lastMailboxesQuery = useRef<AdminSettingsListQuery>(DEFAULT_ADMIN_SETTINGS_QUERY);

  const refreshAdminUsers = useCallback(
    async (query: AdminUsersQuery = lastUsersQuery.current) => {
      if (session?.user.role !== "admin") return;
      lastUsersQuery.current = query;
      setIsLoadingUsers(true);
      setUsersError(null);
      try {
        const payload = await queryAdminUsers(query);
        setAdminUsers(payload.users, payload.total);
      } catch {
        setUsersError(USERS_LOAD_ERROR);
      } finally {
        setIsLoadingUsers(false);
      }
    },
    [session, setAdminUsers]
  );

  const refreshAdminData = useCallback(async () => {
    if (session?.user.role !== "admin") return;
    setIsLoadingUsers(true);
    setUsersError(null);
    try {
      const dashboard = await queryAdminDashboard();
      setAdminDashboard(dashboard);
    } catch {
      setUsersError(USERS_LOAD_ERROR);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [session, setAdminDashboard]);

  const refreshAdminSettingsSummary = useCallback(async () => {
    if (session?.user.role !== "admin") return;
    setAdminUserSettingsSummary(await queryAdminUserSettingsSummary());
  }, [session, setAdminUserSettingsSummary]);

  const refreshAdminInvites = useCallback(
    async (query: AdminSettingsListQuery = lastInvitesQuery.current) => {
      if (session?.user.role !== "admin") return;
      lastInvitesQuery.current = query;
      setAdminInvites(await queryAdminInvites(query));
    },
    [session, setAdminInvites]
  );

  const refreshAdminMailboxes = useCallback(
    async (query: AdminSettingsListQuery = lastMailboxesQuery.current) => {
      if (session?.user.role !== "admin") return;
      lastMailboxesQuery.current = query;
      setAdminMailboxes(await queryAdminMailboxes(query));
    },
    [session, setAdminMailboxes]
  );

  const createInvite = useCallback(async () => {
    await createInviteAction();
    onToast({ message: "邀请码已创建。", tone: "success" });
    await refreshAdminInvites(DEFAULT_ADMIN_SETTINGS_QUERY);
  }, [onToast, refreshAdminInvites]);

  const createUser = useCallback(
    async (payload: { email: string; name: string; password: string; role: UserRole }) => {
      await createAdminUserAction(payload);
      onToast({ message: "用户已创建。", tone: "success" });
      await Promise.all([refreshAdminUsers(), refreshAdminSettingsSummary()]);
    },
    [onToast, refreshAdminSettingsSummary, refreshAdminUsers]
  );

  const changeUserRoles = useCallback(
    async (userIds: string[], role: UserRole) => {
      await Promise.all(userIds.map((userId) => updateAdminUserRoleAction(userId, role)));
      onToast({ message: "用户角色已更新。", tone: "success" });
      await refreshAdminUsers();
    },
    [onToast, refreshAdminUsers]
  );

  const updateUser = useCallback(
    async (userId: string, payload: { name: string }) => {
      await updateAdminUserAction(userId, payload);
      onToast({ message: "用户资料已更新。", tone: "success" });
      await Promise.all([refreshAdminUsers(), refreshAdminSettingsSummary()]);
    },
    [onToast, refreshAdminSettingsSummary, refreshAdminUsers]
  );

  const resetUserPassword = useCallback(
    async (userId: string, password: string) => {
      await resetAdminUserPasswordAction(userId, password);
      onToast({ message: "用户密码已重置。", tone: "success" });
      await refreshAdminUsers();
    },
    [onToast, refreshAdminUsers]
  );

  const updateUserStatus = useCallback(
    async (userId: string, status: UserStatus) => {
      await updateAdminUserStatusAction(userId, status);
      onToast({ message: status === "disabled" ? "用户已停用。" : "用户已启用。", tone: "success" });
      await Promise.all([refreshAdminUsers(), refreshAdminSettingsSummary()]);
    },
    [onToast, refreshAdminSettingsSummary, refreshAdminUsers]
  );

  const deleteUser = useCallback(
    async (userId: string) => {
      await deleteAdminUserAction(userId);
      onToast({ message: "用户已删除。", tone: "success" });
      await Promise.all([refreshAdminUsers(), refreshAdminSettingsSummary()]);
    },
    [onToast, refreshAdminSettingsSummary, refreshAdminUsers]
  );

  const suspendUsersOutbound = useCallback(
    async (userIds: string[]) => {
      await Promise.all(
        userIds.map(async (userId) => {
          const quota = await queryQuota(userId);
          await updateQuotaAction(userId, {
            dailyLimit: quota.dailyLimit,
            disabled: true
          });
        })
      );
      onToast({ message: "已暂停所选用户的外发能力。", tone: "success" });
      await refreshAdminData();
    },
    [onToast, refreshAdminData]
  );

  const disableInvite = useCallback(
    async (inviteId: string) => {
      await disableInviteAction(inviteId);
      onToast({ message: "邀请码已停用。", tone: "info" });
      await refreshAdminInvites();
    },
    [onToast, refreshAdminInvites]
  );

  const selectQuotaUser = useCallback(async (userId: string) => {
    setAdminQuota(await queryQuota(userId));
  }, [setAdminQuota]);

  const submitQuota = useCallback(
    async (event: FormEvent<HTMLFormElement>, userId: string) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const payload = await updateQuotaAction(userId, {
        dailyLimit: Number(form.get("dailyLimit")),
        disabled: form.get("disabled") === "on"
      });
      onToast({ message: "用户配额已更新。", tone: "success" });
      await refreshAdminData();
      setAdminQuota(payload.quota);
    },
    [onToast, refreshAdminData, setAdminQuota]
  );

  const toggleFeatures = useCallback(
    async (nextFeatureToggles: FeatureToggles) => {
      const payload = await updateFeatureTogglesAction(nextFeatureToggles);
      setAdminFeatures(payload.featureToggles);
      onToast({ message: "功能开关已更新。", tone: "success" });
    },
    [onToast, setAdminFeatures]
  );

  return {
    adminUsers,
    adminUsersTotal,
    adminSettingsUsers,
    adminUserStats,
    adminInvites,
    adminInvitesAvailable,
    adminInvitesPage,
    adminInvitesPageSize,
    adminInvitesTotal,
    adminFeatures,
    adminQuota,
    adminMailboxes,
    adminLatestMailbox,
    adminMailboxesPage,
    adminMailboxesPageSize,
    adminMailboxesTotal,
    refreshAdminData,
    refreshAdminUsers,
    refreshAdminInvites,
    refreshAdminMailboxes,
    isLoadingUsers,
    usersError,
    createUser,
    changeUserRoles,
    updateUser,
    resetUserPassword,
    updateUserStatus,
    deleteUser,
    suspendUsersOutbound,
    createInvite,
    disableInvite,
    selectQuotaUser,
    submitQuota,
    toggleFeatures
  };
}
