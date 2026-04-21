import { useCallback } from "react";

import type { SessionSummary } from "@wemail/shared";

import { useAppStore } from "../../app/appStore";
import type { WemailToastInput } from "../../shared/toast";
import { createApiKeyAction, revokeApiKeyAction, saveTelegramAction } from "./actions";
import { querySettingsData } from "./queries";

type UseSettingsDataOptions = {
  session: SessionSummary | null;
  onToast: (toast: WemailToastInput) => void;
};

export function useSettingsData({ session, onToast }: UseSettingsDataOptions) {
  const apiKeys = useAppStore((state) => state.apiKeys);
  const telegram = useAppStore((state) => state.telegram);
  const setSettingsData = useAppStore((state) => state.setSettingsData);

  const refreshSettingsData = useCallback(async () => {
    if (!session) return;
    const data = await querySettingsData();
    setSettingsData(data.apiKeys, data.telegram);
  }, [session, setSettingsData]);

  const createApiKey = useCallback(
    async (label: string) => {
      const payload = await createApiKeyAction(label);
      onToast({ message: "API Key 已创建，请在页面中立即复制并保存。", tone: "success" });
      await refreshSettingsData();
      return payload;
    },
    [onToast, refreshSettingsData]
  );

  const revokeApiKey = useCallback(
    async (keyId: string) => {
      await revokeApiKeyAction(keyId);
      onToast({ message: "API Key 已吊销。", tone: "success" });
      await refreshSettingsData();
    },
    [onToast, refreshSettingsData]
  );

  const saveTelegram = useCallback(
    async (payload: { chatId: string; enabled: boolean }) => {
      await saveTelegramAction(payload);
      onToast({ message: "Telegram 设置已保存。", tone: "success" });
      await refreshSettingsData();
    },
    [onToast, refreshSettingsData]
  );

  return {
    apiKeys,
    telegram,
    refreshSettingsData,
    createApiKey,
    revokeApiKey,
    saveTelegram
  };
}
