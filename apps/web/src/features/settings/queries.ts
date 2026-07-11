import type {
  ApiKeySummary,
  DataReliabilitySummary,
  DictionaryCatalogGroup,
  FeatureToggles,
  ProductMaturitySummary,
  RuntimeSettings,
  SystemDiagnosticsSummary,
  TelegramDeliverySummary,
  TelegramOverviewSummary
} from "@wemail/shared";

import {
  fetchApiKeys,
  fetchDictionaries,
  fetchRuntimeSettings,
  fetchSystemDiagnostics,
  fetchSystemFeatures,
  fetchSystemMaturity,
  fetchSystemReliability,
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
  includeSystemDiagnostics?: boolean;
  includeSystemFeatures?: boolean;
  includeSystemMaturity?: boolean;
  includeSystemReliability?: boolean;
  includeTelegram?: boolean;
};

async function settleOptionalRequest<T>(request: Promise<T> | null): Promise<T | null> {
  if (!request) return null;
  try {
    return await request;
  } catch {
    return null;
  }
}

export async function querySettingsData(options?: SettingsDataQueryOptions) {
  const shouldFetchApiKeys = options?.includeApiKeys ?? true;
  const shouldFetchDictionaries = options?.includeDictionaries ?? true;
  const shouldFetchRuntimeSettings = options?.includeRuntimeSettings ?? false;
  const shouldFetchSystemDiagnostics = options?.includeSystemDiagnostics ?? false;
  const shouldFetchSystemFeatures = options?.includeSystemFeatures ?? false;
  const shouldFetchSystemMaturity = options?.includeSystemMaturity ?? false;
  const shouldFetchSystemReliability = options?.includeSystemReliability ?? false;
  const shouldFetchTelegram = options?.includeTelegram ?? true;

  const [
    keyPayload,
    telegramPayload,
    deliveryPayload,
    dictionaryPayload,
    runtimeSettingsPayload,
    systemFeaturesPayload,
    systemDiagnosticsPayload,
    systemMaturityPayload,
    systemReliabilityPayload
  ] = await Promise.all([
    settleOptionalRequest(shouldFetchApiKeys ? fetchApiKeys() : null),
    settleOptionalRequest(shouldFetchTelegram ? fetchTelegramOverview() : null),
    settleOptionalRequest(shouldFetchTelegram ? fetchTelegramDeliveries() : null),
    settleOptionalRequest(shouldFetchDictionaries ? fetchDictionaries() : null),
    settleOptionalRequest(shouldFetchRuntimeSettings ? fetchRuntimeSettings() : null),
    settleOptionalRequest(shouldFetchSystemFeatures ? fetchSystemFeatures() : null),
    settleOptionalRequest(shouldFetchSystemDiagnostics ? fetchSystemDiagnostics() : null),
    settleOptionalRequest(shouldFetchSystemMaturity ? fetchSystemMaturity() : null),
    settleOptionalRequest(shouldFetchSystemReliability ? fetchSystemReliability() : null)
  ]);

  return {
    apiKeys: keyPayload ? (keyPayload.keys as ApiKeySummary[]) : undefined,
    dictionaries: dictionaryPayload ? ((dictionaryPayload.dictionaries ?? []) as DictionaryCatalogGroup[]) : undefined,
    runtimeSettings: runtimeSettingsPayload ? ((runtimeSettingsPayload.settings ?? null) as RuntimeSettings | null) : undefined,
    systemFeatures: systemFeaturesPayload
      ? ((systemFeaturesPayload.featureToggles ?? null) as FeatureToggles | null)
      : undefined,
    systemDiagnostics: systemDiagnosticsPayload
      ? ((systemDiagnosticsPayload.diagnostics ?? null) as SystemDiagnosticsSummary | null)
      : undefined,
    systemMaturity: systemMaturityPayload
      ? ((systemMaturityPayload.maturity ?? null) as ProductMaturitySummary | null)
      : undefined,
    systemReliability: systemReliabilityPayload
      ? ((systemReliabilityPayload.reliability ?? null) as DataReliabilitySummary | null)
      : undefined,
    telegramOverview: telegramPayload ? ((telegramPayload.overview ?? emptyTelegramOverview) as TelegramOverviewSummary) : undefined,
    telegramDeliveries: deliveryPayload ? ((deliveryPayload.deliveries ?? []) as TelegramDeliverySummary[]) : undefined
  };
}
