import {
  parseRuntimeSettingsUpdatePayload,
  parseRuntimeSettingsRecord,
  toPersistableRuntimeSettings,
  type RuntimeSettings,
} from "@wemail/shared";

import type { AppBindings, AppStore, RuntimeSettingsRecord } from "../../core/bindings";
import { resolveAppConfig } from "../../core/config";

function envRuntimeSettings(env: AppBindings): RuntimeSettings {
  const config = resolveAppConfig(env);
  return {
    mailbox: {
      limit: config.mailbox.limit
    },
    message: {
      retentionDays: config.message.retentionDays
    },
    outbound: {
      dailyLimit: config.outbound.dailyLimit
    },
    api: {
      dailyLimit: config.api.dailyLimit
    },
    attachments: {
      maxBytes: config.attachments.maxBytes,
      maxTotalBytes: config.attachments.maxTotalBytes
    },
    ai: {
      fallbackLimit: config.ai.fallbackLimit
    },
    lastUpdatedLabel: "环境默认值"
  };
}

function toRecord(settings: Omit<RuntimeSettings, "lastUpdatedLabel">): Omit<RuntimeSettingsRecord, "updatedAt"> {
  return {
    mailboxLimit: String(settings.mailbox.limit),
    messageRetentionDays: String(settings.message.retentionDays),
    outboundDailyLimit: String(settings.outbound.dailyLimit),
    apiDailyLimit: String(settings.api.dailyLimit),
    maxAttachmentBytes: String(settings.attachments.maxBytes),
    maxTotalAttachmentBytes: String(settings.attachments.maxTotalBytes),
    aiFallbackLimit: String(settings.ai.fallbackLimit)
  };
}

export async function getRuntimeSettings(store: AppStore, env: AppBindings) {
  const defaults = envRuntimeSettings(env);
  const record = await store.runtimeSettings.get();
  if (!record) return defaults;

  return parseRuntimeSettingsRecord({
    mailboxLimit: record.mailboxLimit || String(defaults.mailbox.limit),
    messageRetentionDays: record.messageRetentionDays || String(defaults.message.retentionDays),
    outboundDailyLimit: record.outboundDailyLimit || String(defaults.outbound.dailyLimit),
    apiDailyLimit: record.apiDailyLimit || String(defaults.api.dailyLimit),
    maxAttachmentBytes: record.maxAttachmentBytes || String(defaults.attachments.maxBytes),
    maxTotalAttachmentBytes: record.maxTotalAttachmentBytes || String(defaults.attachments.maxTotalBytes),
    aiFallbackLimit: record.aiFallbackLimit || String(defaults.ai.fallbackLimit),
    updatedAt: record.updatedAt
  });
}

export async function updateRuntimeSettings(
  store: AppStore,
  env: AppBindings,
  payload: unknown
) {
  const current = await getRuntimeSettings(store, env);
  const update = parseRuntimeSettingsUpdatePayload(payload, current);
  const next = toPersistableRuntimeSettings(update, current);
  const record = await store.runtimeSettings.save(toRecord(next));
  return parseRuntimeSettingsRecord(record);
}
