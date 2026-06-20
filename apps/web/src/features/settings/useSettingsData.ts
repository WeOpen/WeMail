import { useCallback } from "react";

import type { SessionSummary } from "@wemail/shared";

import { useAppStore } from "../../app/appStore";
import type { WemailToastInput } from "../../shared/toast";
import {
  createApiKeyAction,
  createTelegramLinkCodeAction,
  revokeApiKeyAction,
  saveRuntimeSettingsAction,
  saveTelegramAction,
  sendTelegramTestAction
} from "./actions";
import { querySettingsData } from "./queries";

type UseSettingsDataOptions = {
  session: SessionSummary | null;
  onToast: (toast: WemailToastInput) => void;
};

export function useSettingsData({ session, onToast }: UseSettingsDataOptions) {
  const apiKeys = useAppStore((state) => state.apiKeys);
  const telegram = useAppStore((state) => state.telegram);
  const telegramOverview = useAppStore((state) => state.telegramOverview);
  const telegramDeliveries = useAppStore((state) => state.telegramDeliveries);
  const runtimeSettings = useAppStore((state) => state.runtimeSettings);
  const dictionaries = useAppStore((state) => state.dictionaries);
  const dictionaryByGroup = useAppStore((state) => state.dictionaryByGroup);
  const setSettingsData = useAppStore((state) => state.setSettingsData);
  const setDictionaries = useAppStore((state) => state.setDictionaries);

  const refreshSettingsData = useCallback(async () => {
    if (!session) return;
    const data = await querySettingsData({ includeRuntimeSettings: session.user.role === "admin" });
    setSettingsData(data.apiKeys, data.telegramOverview, data.telegramDeliveries, data.runtimeSettings);
    setDictionaries(data.dictionaries);
  }, [session, setDictionaries, setSettingsData]);

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

  const createTelegramLinkCode = useCallback(async () => {
    const payload = await createTelegramLinkCodeAction();
    onToast({ message: "Telegram 绑定码已生成。", tone: "success" });
    return payload.link;
  }, [onToast]);

  const sendTelegramTest = useCallback(async () => {
    const payload = await sendTelegramTestAction();
    onToast({
      message: payload.result.delivered ? "Telegram 测试通知已发送。" : "Telegram 测试通知发送失败。",
      tone: payload.result.delivered ? "success" : "error"
    });
    await refreshSettingsData();
    return payload.result;
  }, [onToast, refreshSettingsData]);

  const saveRuntimeSettings = useCallback(
    async (payload: Parameters<typeof saveRuntimeSettingsAction>[0]) => {
      await saveRuntimeSettingsAction(payload);
      onToast({ message: "系统运行策略已保存。", tone: "success" });
      await refreshSettingsData();
    },
    [onToast, refreshSettingsData]
  );

  return {
    apiKeys,
    dictionaries,
    dictionaryByGroup,
    runtimeSettings,
    telegram,
    telegramOverview,
    telegramDeliveries,
    refreshSettingsData,
    createApiKey,
    revokeApiKey,
    saveTelegram,
    saveRuntimeSettings,
    createTelegramLinkCode,
    sendTelegramTest
  };
}
