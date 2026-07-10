import { useCallback } from "react";

import type { ApiKeyScope, SessionSummary } from "@wemail/shared";

import { useAppStore } from "../../app/appStore";
import type { WemailToastInput } from "../../shared/toast";
import {
  createApiKeyAction,
  configureTelegramBotMenuAction,
  configureTelegramWebhookAction,
  createTelegramLinkCodeAction,
  revokeApiKeyAction,
  saveRuntimeSettingsAction,
  saveTelegramAction,
  sendTelegramTestAction
} from "./actions";
import { querySettingsData, type SettingsDataQueryOptions } from "./queries";

type UseSettingsDataOptions = {
  session: SessionSummary | null;
  onToast: (toast: WemailToastInput) => void;
};

const apiKeysOnlyQuery: SettingsDataQueryOptions = {
  includeApiKeys: true,
  includeDictionaries: false,
  includeRuntimeSettings: false,
  includeTelegram: false
};

const telegramOnlyQuery: SettingsDataQueryOptions = {
  includeApiKeys: false,
  includeDictionaries: false,
  includeRuntimeSettings: false,
  includeTelegram: true
};

const runtimeSettingsOnlyQuery: SettingsDataQueryOptions = {
  includeApiKeys: false,
  includeDictionaries: false,
  includeRuntimeSettings: true,
  includeSystemFeatures: true,
  includeSystemDiagnostics: true,
  includeSystemMaturity: true,
  includeSystemOperations: true,
  includeSystemReliability: true,
  includeTelegram: false
};

export function useSettingsData({ session, onToast }: UseSettingsDataOptions) {
  const apiKeys = useAppStore((state) => state.apiKeys);
  const telegram = useAppStore((state) => state.telegram);
  const telegramOverview = useAppStore((state) => state.telegramOverview);
  const telegramDeliveries = useAppStore((state) => state.telegramDeliveries);
  const runtimeSettings = useAppStore((state) => state.runtimeSettings);
  const systemDiagnostics = useAppStore((state) => state.systemDiagnostics);
  const systemMaturity = useAppStore((state) => state.systemMaturity);
  const systemOperations = useAppStore((state) => state.systemOperations);
  const systemReliability = useAppStore((state) => state.systemReliability);
  const dictionaries = useAppStore((state) => state.dictionaries);
  const dictionaryByGroup = useAppStore((state) => state.dictionaryByGroup);
  const setSettingsData = useAppStore((state) => state.setSettingsData);
  const setDictionaries = useAppStore((state) => state.setDictionaries);
  const setAdminFeatures = useAppStore((state) => state.setAdminFeatures);

  const refreshSettingsData = useCallback(async (options?: SettingsDataQueryOptions) => {
    if (!session) return;
    const data = await querySettingsData({
      ...options,
      includeRuntimeSettings: options?.includeRuntimeSettings ?? session.user.role === "admin",
      includeSystemFeatures: options?.includeSystemFeatures ?? session.user.role === "admin",
      includeSystemDiagnostics: options?.includeSystemDiagnostics ?? session.user.role === "admin",
      includeSystemMaturity: options?.includeSystemMaturity ?? session.user.role === "admin",
      includeSystemOperations: options?.includeSystemOperations ?? session.user.role === "admin",
      includeSystemReliability: options?.includeSystemReliability ?? session.user.role === "admin"
    });
    setSettingsData(
      data.apiKeys,
      data.telegramOverview,
      data.telegramDeliveries,
      data.runtimeSettings,
      data.systemDiagnostics,
      data.systemMaturity,
      data.systemOperations,
      data.systemReliability
    );
    if (data.systemFeatures) setAdminFeatures(data.systemFeatures);
    if (data.dictionaries) setDictionaries(data.dictionaries);
  }, [session, setAdminFeatures, setDictionaries, setSettingsData]);

  const createApiKey = useCallback(
    async (label: string, scopes: ApiKeyScope[]) => {
      const payload = await createApiKeyAction(label, scopes);
      onToast({ message: "API Key 已创建，请在页面中立即复制并保存。", tone: "success" });
      await refreshSettingsData(apiKeysOnlyQuery);
      return payload;
    },
    [onToast, refreshSettingsData]
  );

  const revokeApiKey = useCallback(
    async (keyId: string) => {
      await revokeApiKeyAction(keyId);
      onToast({ message: "API Key 已吊销。", tone: "success" });
      await refreshSettingsData(apiKeysOnlyQuery);
    },
    [onToast, refreshSettingsData]
  );

  const saveTelegram = useCallback(
    async (payload: { chatId: string; enabled: boolean }) => {
      await saveTelegramAction(payload);
      onToast({ message: "Telegram 设置已保存。", tone: "success" });
      await refreshSettingsData(telegramOnlyQuery);
    },
    [onToast, refreshSettingsData]
  );

  const createTelegramLinkCode = useCallback(async () => {
    const payload = await createTelegramLinkCodeAction();
    onToast({ message: "Telegram 绑定码已生成。", tone: "success" });
    return payload.link;
  }, [onToast]);

  const configureTelegramBotMenu = useCallback(async () => {
    const payload = await configureTelegramBotMenuAction();
    onToast({ message: "Telegram Bot 菜单已配置。", tone: "success" });
    return payload.result;
  }, [onToast]);

  const configureTelegramWebhook = useCallback(async () => {
    const payload = await configureTelegramWebhookAction();
    onToast({ message: "Telegram Webhook 已配置。", tone: "success" });
    return payload.result;
  }, [onToast]);

  const sendTelegramTest = useCallback(async () => {
    const payload = await sendTelegramTestAction();
    onToast({
      message: payload.result.delivered ? "Telegram 测试通知已发送。" : "Telegram 测试通知发送失败。",
      tone: payload.result.delivered ? "success" : "error"
    });
    await refreshSettingsData(telegramOnlyQuery);
    return payload.result;
  }, [onToast, refreshSettingsData]);

  const saveRuntimeSettings = useCallback(
    async (payload: Parameters<typeof saveRuntimeSettingsAction>[0]) => {
      await saveRuntimeSettingsAction(payload);
      onToast({ message: "系统运行策略已保存。", tone: "success" });
      await refreshSettingsData(runtimeSettingsOnlyQuery);
    },
    [onToast, refreshSettingsData]
  );

  return {
    apiKeys,
    dictionaries,
    dictionaryByGroup,
    runtimeSettings,
    systemDiagnostics,
    systemMaturity,
    systemOperations,
    systemReliability,
    telegram,
    telegramOverview,
    telegramDeliveries,
    refreshSettingsData,
    createApiKey,
    revokeApiKey,
    saveTelegram,
    saveRuntimeSettings,
    createTelegramLinkCode,
    configureTelegramBotMenu,
    configureTelegramWebhook,
    sendTelegramTest
  };
}
