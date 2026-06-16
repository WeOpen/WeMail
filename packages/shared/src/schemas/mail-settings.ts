import type {
  MailSettings,
  MailSettingsRouting,
  MailSettingsSenderRules,
  MailSettingsUpdateInput,
  MailSettingsWorkspaceDefaults
} from "../types";
import { toRecordLike } from "../validators";

type MailSettingsRecordLike = {
  senderRulesJson: string;
  routingJson: string;
  workspaceDefaultsJson: string;
  updatedAt: string;
};

const retryAttempts = ["1 次", "2 次", "3 次"] as const;
const retryDelays = ["立即重试", "5 分钟", "15 分钟"] as const;
const failureRetentions = ["7 天", "14 天", "30 天"] as const;
const legacyExceptionStrategy = "异常 / 无匹配邮件进入发件箱异常视图";
const legacyOutboundExceptionFilter = "异常 / 无匹配";
const exceptionStrategies = [
  "异常 / 无匹配邮件进入失败告警队列",
  "仅发送失败告警，不自动入队",
  "自动转交到值班邮箱"
] as const;
const defaultMailRoutes = [
  { value: "/mail/list", label: "邮件列表" },
  { value: "/mail/outbound", label: "发件箱" },
  { value: "/mail/settings", label: "邮件设置" }
] as const;
const outboundDefaultFilters = ["全部", "已发送", "失败"] as const;
const listDensities = ["紧凑", "舒适", "宽松"] as const;

export const mailSettingsOptions = {
  retryAttempts,
  retryDelays,
  failureRetentions,
  exceptionStrategies,
  defaultMailRoutes,
  outboundDefaultFilters,
  listDensities
};

export const defaultMailSettings: MailSettings = {
  senderRules: {
    defaultIdentity: "",
    signature: "",
    retryEnabled: false,
    retryAttempts: "2 次",
    retryDelay: "5 分钟",
    failureRetention: "30 天",
    allowManualOverride: true
  },
  routing: {
    webhookEnabled: false,
    webhookEndpoint: "",
    telegramEnabled: false,
    telegramTarget: "",
    failureAlerts: true,
    exceptionAlerts: true,
    exceptionStrategy: "异常 / 无匹配邮件进入失败告警队列",
    fallbackOwner: ""
  },
  workspaceDefaults: {
    defaultMailRoute: "/mail/list",
    outboundDefaultFilter: "全部",
    expandExceptionsByDefault: false,
    listDensity: "舒适",
    openLatestFailureFirst: false
  },
  lastUpdatedLabel: "尚未更新"
};

function parseJsonObject(value: string, fallback: unknown) {
  try {
    return toRecordLike(JSON.parse(value));
  } catch {
    return toRecordLike(fallback);
  }
}

function readBoolean(payload: Record<string, unknown>, field: string, fallback: boolean) {
  if (typeof payload[field] === "undefined") return fallback;
  if (typeof payload[field] !== "boolean") throw new Error(`${field} must be a boolean`);
  return payload[field];
}

function readString(payload: Record<string, unknown>, field: string, fallback: string) {
  if (typeof payload[field] === "undefined") return fallback;
  if (typeof payload[field] !== "string") throw new Error(`${field} must be a string`);
  return payload[field].trim();
}

function readOption(payload: Record<string, unknown>, field: string, fallback: string, options: readonly string[]) {
  const value = readString(payload, field, fallback);
  if (!options.includes(value)) throw new Error(`${field} must be one of: ${options.join(", ")}`);
  return value;
}

function readMigratedOption(
  payload: Record<string, unknown>,
  field: string,
  fallback: string,
  options: readonly string[],
  migrations: Record<string, string>
) {
  const value = readString(payload, field, fallback);
  const migratedValue = migrations[value] ?? value;
  if (!options.includes(migratedValue)) throw new Error(`${field} must be one of: ${options.join(", ")}`);
  return migratedValue;
}

function readRouteOption(payload: Record<string, unknown>, field: string, fallback: string) {
  const value = readString(payload, field, fallback);
  if (!defaultMailRoutes.some((route) => route.value === value)) {
    throw new Error(`${field} must be a valid mail route`);
  }
  return value;
}

function isValidEmailAddress(value: string) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value.trim());
}

function isValidSenderIdentity(value: string) {
  const normalized = value.trim();
  if (!normalized) return true;

  const displayAddress = normalized.match(/^.+\s<([^<>]+)>$/);
  if (displayAddress) return isValidEmailAddress(displayAddress[1]);
  return isValidEmailAddress(normalized);
}

function validateSenderRules(senderRules: MailSettingsSenderRules) {
  if (!isValidSenderIdentity(senderRules.defaultIdentity)) {
    throw new Error("defaultIdentity must be a valid email address or display identity");
  }
}

function validateRouting(routing: MailSettingsRouting) {
  if (routing.webhookEnabled) {
    if (!routing.webhookEndpoint) {
      throw new Error("webhookEndpoint is required when webhook notifications are enabled");
    }
  }

  if (routing.telegramEnabled && !routing.telegramTarget) {
    throw new Error("telegramTarget is required when Telegram notifications are enabled");
  }
}

function mergeSettingsSection<T extends Record<string, unknown>>(current: T, next: Partial<T> | undefined): T {
  const merged: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(next ?? {})) {
    if (typeof value !== "undefined") merged[key] = value;
  }
  return merged as T;
}

function parseSenderRules(input: unknown, fallback: MailSettingsSenderRules): MailSettingsSenderRules {
  const payload = toRecordLike(input);
  return {
    defaultIdentity: readString(payload, "defaultIdentity", fallback.defaultIdentity),
    signature: readString(payload, "signature", fallback.signature),
    retryEnabled: readBoolean(payload, "retryEnabled", fallback.retryEnabled),
    retryAttempts: readOption(payload, "retryAttempts", fallback.retryAttempts, retryAttempts),
    retryDelay: readOption(payload, "retryDelay", fallback.retryDelay, retryDelays),
    failureRetention: readOption(payload, "failureRetention", fallback.failureRetention, failureRetentions),
    allowManualOverride: readBoolean(payload, "allowManualOverride", fallback.allowManualOverride)
  };
}

function parseRouting(input: unknown, fallback: MailSettingsRouting): MailSettingsRouting {
  const payload = toRecordLike(input);
  return {
    webhookEnabled: readBoolean(payload, "webhookEnabled", fallback.webhookEnabled),
    webhookEndpoint: readString(payload, "webhookEndpoint", fallback.webhookEndpoint),
    telegramEnabled: readBoolean(payload, "telegramEnabled", fallback.telegramEnabled),
    telegramTarget: readString(payload, "telegramTarget", fallback.telegramTarget),
    failureAlerts: readBoolean(payload, "failureAlerts", fallback.failureAlerts),
    exceptionAlerts: readBoolean(payload, "exceptionAlerts", fallback.exceptionAlerts),
    exceptionStrategy: readMigratedOption(payload, "exceptionStrategy", fallback.exceptionStrategy, exceptionStrategies, {
      [legacyExceptionStrategy]: "异常 / 无匹配邮件进入失败告警队列"
    }),
    fallbackOwner: readString(payload, "fallbackOwner", fallback.fallbackOwner)
  };
}

function parseWorkspaceDefaults(input: unknown, fallback: MailSettingsWorkspaceDefaults): MailSettingsWorkspaceDefaults {
  const payload = toRecordLike(input);
  return {
    defaultMailRoute: readRouteOption(payload, "defaultMailRoute", fallback.defaultMailRoute),
    outboundDefaultFilter: readMigratedOption(payload, "outboundDefaultFilter", fallback.outboundDefaultFilter, outboundDefaultFilters, {
      [legacyOutboundExceptionFilter]: "失败"
    }),
    expandExceptionsByDefault: readBoolean(payload, "expandExceptionsByDefault", fallback.expandExceptionsByDefault),
    listDensity: readOption(payload, "listDensity", fallback.listDensity, listDensities),
    openLatestFailureFirst: readBoolean(payload, "openLatestFailureFirst", fallback.openLatestFailureFirst)
  };
}

export function parseMailSettingsRecord(record: MailSettingsRecordLike | null | undefined): MailSettings {
  if (!record) return defaultMailSettings;

  return {
    senderRules: parseSenderRules(
      parseJsonObject(record.senderRulesJson, defaultMailSettings.senderRules),
      defaultMailSettings.senderRules
    ),
    routing: parseRouting(
      parseJsonObject(record.routingJson, defaultMailSettings.routing),
      defaultMailSettings.routing
    ),
    workspaceDefaults: parseWorkspaceDefaults(
      parseJsonObject(record.workspaceDefaultsJson, defaultMailSettings.workspaceDefaults),
      defaultMailSettings.workspaceDefaults
    ),
    lastUpdatedLabel: record.updatedAt
  };
}

export function parseMailSettingsUpdatePayload(input: unknown, current: MailSettings): MailSettingsUpdateInput {
  const payload = toRecordLike(input);
  const result: MailSettingsUpdateInput = {};

  if (typeof payload.senderRules !== "undefined") {
    const senderRules = parseSenderRules(payload.senderRules, current.senderRules);
    validateSenderRules(senderRules);
    result.senderRules = senderRules;
  }
  if (typeof payload.routing !== "undefined") {
    const routing = parseRouting(payload.routing, current.routing);
    validateRouting(routing);
    result.routing = routing;
  }
  if (typeof payload.workspaceDefaults !== "undefined") {
    result.workspaceDefaults = parseWorkspaceDefaults(payload.workspaceDefaults, current.workspaceDefaults);
  }

  if (!result.senderRules && !result.routing && !result.workspaceDefaults) {
    throw new Error("At least one mail settings section is required");
  }

  return result;
}

export function toPersistableMailSettings(
  settings: MailSettingsUpdateInput,
  current = defaultMailSettings
): Pick<MailSettings, "senderRules" | "routing" | "workspaceDefaults"> {
  return {
    senderRules: mergeSettingsSection(current.senderRules, settings.senderRules),
    routing: mergeSettingsSection(current.routing, settings.routing),
    workspaceDefaults: mergeSettingsSection(current.workspaceDefaults, settings.workspaceDefaults)
  };
}
