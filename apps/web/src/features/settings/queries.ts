import type {
  ApiKeySummary,
  DictionaryCatalogGroup,
  RuntimeSettings,
  TelegramDeliverySummary,
  TelegramOverviewSummary
} from "@wemail/shared";

import {
  fetchApiKeys,
  fetchDictionaries,
  fetchRuntimeSettings,
  fetchTelegramDeliveries,
  fetchTelegramOverview
} from "./api";

const emptyTelegramOverview: TelegramOverviewSummary = {
  botConfigured: false,
  canSendTest: false,
  featureEnabled: false,
  subscription: null,
  supportedEvents: []
};

export type SettingsDataQueryOptions = {
  includeApiKeys?: boolean;
  includeDictionaries?: boolean;
  includeRuntimeSettings?: boolean;
  includeTelegram?: boolean;
};

export async function querySettingsData(options?: SettingsDataQueryOptions) {
  const shouldFetchApiKeys = options?.includeApiKeys ?? true;
  const shouldFetchDictionaries = options?.includeDictionaries ?? true;
  const shouldFetchRuntimeSettings = options?.includeRuntimeSettings ?? false;
  const shouldFetchTelegram = options?.includeTelegram ?? true;

  const [keyPayload, telegramPayload, deliveryPayload, dictionaryPayload, runtimeSettingsPayload] = await Promise.all([
    shouldFetchApiKeys ? fetchApiKeys() : Promise.resolve(null),
    shouldFetchTelegram ? fetchTelegramOverview() : Promise.resolve(null),
    shouldFetchTelegram ? fetchTelegramDeliveries() : Promise.resolve(null),
    shouldFetchDictionaries ? fetchDictionaries() : Promise.resolve(null),
    shouldFetchRuntimeSettings ? fetchRuntimeSettings() : Promise.resolve(null)
  ]);

  return {
    apiKeys: keyPayload ? (keyPayload.keys as ApiKeySummary[]) : undefined,
    dictionaries: dictionaryPayload ? ((dictionaryPayload.dictionaries ?? []) as DictionaryCatalogGroup[]) : undefined,
    runtimeSettings: runtimeSettingsPayload ? ((runtimeSettingsPayload.settings ?? null) as RuntimeSettings | null) : undefined,
    telegramOverview: telegramPayload ? ((telegramPayload.overview ?? emptyTelegramOverview) as TelegramOverviewSummary) : undefined,
    telegramDeliveries: deliveryPayload ? ((deliveryPayload.deliveries ?? []) as TelegramDeliverySummary[]) : undefined
  };
}
