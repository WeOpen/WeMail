import type {
  AccountBulkDeleteInput,
  AccountBulkDeleteMode,
  AccountCreationPolicy,
  AccountCreationStatus,
  AccountInactiveAction,
  AccountLifecyclePolicy,
  AccountPolicy,
  AccountPolicyUpdateInput,
  AccountProtectionPolicy
} from "../types";
import { requireString, toRecordLike } from "../validators";

type AccountSettingsRecordLike = {
  creationJson: string;
  lifecycleJson: string;
  protectionJson: string;
  updatedAt: string;
};

const creationStatuses: AccountCreationStatus[] = ["enabled", "disabled", "archived"];
const inactiveActions: AccountInactiveAction[] = ["mark", "disable", "archive"];
const bulkDeleteModes: AccountBulkDeleteMode[] = ["soft", "hard"];

const legacyCreationStatusMap: Record<string, AccountCreationStatus> = {
  "启用": "enabled",
  "停用": "disabled",
  "待审核": "disabled",
  "已归档": "archived"
};

const legacyInactiveActionMap: Record<string, AccountInactiveAction> = {
  "仅标记": "mark",
  "自动停用": "disable",
  "自动归档": "archive"
};

export const defaultAccountPolicy: AccountPolicy = {
  creation: {
    defaultTagsEnabled: true,
    defaultTags: "运营, 高优先级",
    allowCreationOverride: true,
    defaultStatus: "enabled",
    requireCreatorNote: false
  },
  lifecycle: {
    inactiveDays: 30,
    inactiveAction: "archive",
    softDeleteRetentionDays: 30,
    allowHardDelete: false,
    requireSoftDeleteBeforeHardDelete: true
  },
  protection: {
    confirmStandardBulkActions: true,
    standardBulkLimit: 100,
    requireDangerPhrase: true,
    hardDeleteLimit: 20,
    auditLoggingEnabled: true
  },
  lastUpdatedLabel: "尚未更新"
};

function parseJsonObject(value: string, fallback: Record<string, unknown>) {
  try {
    const parsed = JSON.parse(value);
    return toRecordLike(parsed);
  } catch {
    return fallback;
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

function readPositiveInteger(payload: Record<string, unknown>, field: string, fallback: number) {
  if (typeof payload[field] === "undefined") return fallback;
  const value = Number(payload[field]);
  if (!Number.isFinite(value) || value < 1) throw new Error(`${field} must be a positive integer`);
  return Math.trunc(value);
}

function readCreationStatus(payload: Record<string, unknown>, field: string, fallback: AccountCreationStatus) {
  if (typeof payload[field] === "undefined") return fallback;
  const rawValue = payload[field];
  if (typeof rawValue !== "string") throw new Error(`${field} must be a valid account status`);
  const normalized = legacyCreationStatusMap[rawValue] ?? rawValue;
  if (!creationStatuses.includes(normalized as AccountCreationStatus)) {
    throw new Error(`${field} must be enabled, disabled, or archived`);
  }
  return normalized as AccountCreationStatus;
}

function readInactiveAction(payload: Record<string, unknown>, field: string, fallback: AccountInactiveAction) {
  if (typeof payload[field] === "undefined") return fallback;
  const rawValue = payload[field];
  if (typeof rawValue !== "string") throw new Error(`${field} must be a valid inactive action`);
  const normalized = legacyInactiveActionMap[rawValue] ?? rawValue;
  if (!inactiveActions.includes(normalized as AccountInactiveAction)) {
    throw new Error(`${field} must be mark, disable, or archive`);
  }
  return normalized as AccountInactiveAction;
}

function parseCreationPolicy(input: unknown, fallback: AccountCreationPolicy): AccountCreationPolicy {
  const payload = toRecordLike(input);
  return {
    defaultTagsEnabled: readBoolean(payload, "defaultTagsEnabled", fallback.defaultTagsEnabled),
    defaultTags: readString(payload, "defaultTags", fallback.defaultTags),
    allowCreationOverride: readBoolean(payload, "allowCreationOverride", fallback.allowCreationOverride),
    defaultStatus: readCreationStatus(payload, "defaultStatus", fallback.defaultStatus),
    requireCreatorNote: readBoolean(payload, "requireCreatorNote", fallback.requireCreatorNote)
  };
}

function parseLifecyclePolicy(input: unknown, fallback: AccountLifecyclePolicy): AccountLifecyclePolicy {
  const payload = toRecordLike(input);
  return {
    inactiveDays: readPositiveInteger(payload, "inactiveDays", fallback.inactiveDays),
    inactiveAction: readInactiveAction(payload, "inactiveAction", fallback.inactiveAction),
    softDeleteRetentionDays: readPositiveInteger(payload, "softDeleteRetentionDays", fallback.softDeleteRetentionDays),
    allowHardDelete: readBoolean(payload, "allowHardDelete", fallback.allowHardDelete),
    requireSoftDeleteBeforeHardDelete: readBoolean(
      payload,
      "requireSoftDeleteBeforeHardDelete",
      fallback.requireSoftDeleteBeforeHardDelete
    )
  };
}

function parseProtectionPolicy(input: unknown, fallback: AccountProtectionPolicy): AccountProtectionPolicy {
  const payload = toRecordLike(input);
  return {
    confirmStandardBulkActions: readBoolean(
      payload,
      "confirmStandardBulkActions",
      fallback.confirmStandardBulkActions
    ),
    standardBulkLimit: readPositiveInteger(payload, "standardBulkLimit", fallback.standardBulkLimit),
    requireDangerPhrase: readBoolean(payload, "requireDangerPhrase", fallback.requireDangerPhrase),
    hardDeleteLimit: readPositiveInteger(payload, "hardDeleteLimit", fallback.hardDeleteLimit),
    auditLoggingEnabled: readBoolean(payload, "auditLoggingEnabled", fallback.auditLoggingEnabled)
  };
}

export function parseAccountPolicyRecord(record: AccountSettingsRecordLike | null | undefined): AccountPolicy {
  if (!record) return defaultAccountPolicy;

  return {
    creation: parseCreationPolicy(
      parseJsonObject(record.creationJson, defaultAccountPolicy.creation),
      defaultAccountPolicy.creation
    ),
    lifecycle: parseLifecyclePolicy(
      parseJsonObject(record.lifecycleJson, defaultAccountPolicy.lifecycle),
      defaultAccountPolicy.lifecycle
    ),
    protection: parseProtectionPolicy(
      parseJsonObject(record.protectionJson, defaultAccountPolicy.protection),
      defaultAccountPolicy.protection
    ),
    lastUpdatedLabel: record.updatedAt
  };
}

export function parseAccountPolicyUpdatePayload(input: unknown, current: AccountPolicy): AccountPolicyUpdateInput {
  const payload = toRecordLike(input);

  return {
    creation:
      typeof payload.creation === "undefined"
        ? undefined
        : parseCreationPolicy(payload.creation, current.creation),
    lifecycle:
      typeof payload.lifecycle === "undefined"
        ? undefined
        : parseLifecyclePolicy(payload.lifecycle, current.lifecycle),
    protection:
      typeof payload.protection === "undefined"
        ? undefined
        : parseProtectionPolicy(payload.protection, current.protection)
  };
}

export function toPersistableAccountPolicy(policy: AccountPolicy | AccountPolicyUpdateInput, current = defaultAccountPolicy) {
  return {
    creation: { ...current.creation, ...policy.creation },
    lifecycle: { ...current.lifecycle, ...policy.lifecycle },
    protection: { ...current.protection, ...policy.protection }
  };
}

export function parseAccountBulkDeletePayload(input: unknown): AccountBulkDeleteInput {
  const payload = toRecordLike(input);
  const rawIds = payload.accountIds;
  if (!Array.isArray(rawIds)) throw new Error("accountIds is required");

  const accountIds = Array.from(
    new Set(
      rawIds.map((id) => {
        if (typeof id !== "string" || id.trim().length === 0) {
          throw new Error("accountIds must contain account ids");
        }
        return id.trim();
      })
    )
  );
  if (accountIds.length === 0) throw new Error("accountIds is required");

  const mode = requireString(payload.mode, "mode") as AccountBulkDeleteMode;
  if (!bulkDeleteModes.includes(mode)) throw new Error("mode must be soft or hard");

  const confirmationPhrase =
    typeof payload.confirmationPhrase === "undefined"
      ? undefined
      : requireString(payload.confirmationPhrase, "confirmationPhrase");

  return {
    accountIds,
    mode,
    ...(confirmationPhrase ? { confirmationPhrase } : {})
  };
}
