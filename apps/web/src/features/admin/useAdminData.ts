import { FormEvent, useCallback, useState } from "react";

import type { FeatureToggles, MailboxSummary, QuotaSummary, SessionSummary, UserSummary } from "@wemail/shared";

import type { WemailToastInput } from "../../shared/toast";
import { createInviteAction, disableInviteAction, updateFeatureTogglesAction, updateQuotaAction } from "./actions";
import { queryAdminDashboard, queryQuota } from "./queries";
import type { InviteSummary } from "./types";

type UseAdminDataOptions = {
  session: SessionSummary | null;
  onToast: (toast: WemailToastInput) => void;
};

export function useAdminData({ session, onToast }: UseAdminDataOptions) {
  const [adminUsers, setAdminUsers] = useState<UserSummary[]>([]);
  const [adminInvites, setAdminInvites] = useState<InviteSummary[]>([]);
  const [adminFeatures, setAdminFeatures] = useState<FeatureToggles | null>(null);
  const [adminQuota, setAdminQuota] = useState<QuotaSummary | null>(null);
  const [adminMailboxes, setAdminMailboxes] = useState<MailboxSummary[]>([]);

  const refreshAdminData = useCallback(async () => {
    if (session?.user.role !== "admin") return;
    const dashboard = await queryAdminDashboard();
    setAdminUsers(dashboard.users);
    setAdminInvites(dashboard.invites);
    setAdminFeatures(dashboard.features);
    setAdminMailboxes(dashboard.mailboxes);
    setAdminQuota(dashboard.quota);
  }, [session]);

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
  }, []);

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
    [onToast]
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