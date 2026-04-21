import { FormEvent, useCallback } from "react";

import type { FeatureToggles, SessionSummary } from "@wemail/shared";

import { useAppStore } from "../../app/appStore";
import type { WemailToastInput } from "../../shared/toast";
import { createInviteAction, disableInviteAction, updateFeatureTogglesAction, updateQuotaAction } from "./actions";
import { queryAdminDashboard, queryQuota } from "./queries";

type UseAdminDataOptions = {
  session: SessionSummary | null;
  onToast: (toast: WemailToastInput) => void;
};

export function useAdminData({ session, onToast }: UseAdminDataOptions) {
  const adminUsers = useAppStore((state) => state.adminUsers);
  const adminInvites = useAppStore((state) => state.adminInvites);
  const adminFeatures = useAppStore((state) => state.adminFeatures);
  const adminQuota = useAppStore((state) => state.adminQuota);
  const adminMailboxes = useAppStore((state) => state.adminMailboxes);
  const setAdminDashboard = useAppStore((state) => state.setAdminDashboard);
  const setAdminQuota = useAppStore((state) => state.setAdminQuota);
  const setAdminFeatures = useAppStore((state) => state.setAdminFeatures);

  const refreshAdminData = useCallback(async () => {
    if (session?.user.role !== "admin") return;
    const dashboard = await queryAdminDashboard();
    setAdminDashboard(dashboard);
  }, [session, setAdminDashboard]);

  const createInvite = useCallback(async () => {
    await createInviteAction();
    onToast({ message: "邀请码已创建。", tone: "success" });
    await refreshAdminData();
  }, [onToast, refreshAdminData]);

  const disableInvite = useCallback(
    async (inviteId: string) => {
      await disableInviteAction(inviteId);
      onToast({ message: "邀请码已停用。", tone: "info" });
      await refreshAdminData();
    },
    [onToast, refreshAdminData]
  );

  const selectQuotaUser = useCallback(async (userId: string) => {
    setAdminQuota(await queryQuota(userId));
  }, [setAdminQuota]);

  const submitQuota = useCallback(
    async (event: FormEvent<HTMLFormElement>, userId: string) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      await updateQuotaAction(userId, {
        dailyLimit: Number(form.get("dailyLimit")),
        disabled: form.get("disabled") === "on"
      });
      onToast({ message: "用户配额已更新。", tone: "success" });
      await refreshAdminData();
    },
    [onToast, refreshAdminData]
  );

  const toggleFeatures = useCallback(
    async (nextFeatureToggles: FeatureToggles) => {
      await updateFeatureTogglesAction(nextFeatureToggles);
      setAdminFeatures(nextFeatureToggles);
      onToast({ message: "功能开关已更新。", tone: "success" });
    },
    [onToast, setAdminFeatures]
  );

  return {
    adminUsers,
    adminInvites,
    adminFeatures,
    adminQuota,
    adminMailboxes,
    refreshAdminData,
    createInvite,
    disableInvite,
    selectQuotaUser,
    submitQuota,
    toggleFeatures
  };
}
