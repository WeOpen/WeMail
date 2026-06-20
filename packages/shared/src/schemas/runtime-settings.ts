import type { RuntimeSettings, RuntimeSettingsUpdateInput } from "../types";
import { APP_LIMITS } from "../constants";
import { toRecordLike } from "../validators";

type RuntimeSettingsRecordLike = {
  mailboxLimit?: string | null;
  messageRetentionDays?: string | null;
  outboundDailyLimit?: string | null;
  apiDailyLimit?: string | null;
  maxAttachmentBytes?: string | null;
  maxTotalAttachmentBytes?: string | null;
  aiFallbackLimit?: string | null;
  updatedAt?: string | null;
};

export const defaultRuntimeSettings: RuntimeSettings = {
  mailbox: {
    limit: APP_LIMITS.mailboxLimit
  },
  message: {
    retentionDays: APP_LIMITS.messageRetentionDays
  },
  outbound: {
    dailyLimit: APP_LIMITS.outboundDailyLimit
  },
  api: {
    dailyLimit: APP_LIMITS.apiDailyLimit
  },
  attachments: {
    maxBytes: APP_LIMITS.maxAttachmentBytes,
    maxTotalBytes: APP_LIMITS.maxTotalAttachmentBytes
  },
  ai: {
    fallbackLimit: APP_LIMITS.aiFallbackLimit
  },
  lastUpdatedLabel: "尚未更新"
};

function readPositiveInteger(value: unknown, field: string, fallback: number) {
  if (typeof value === "undefined") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) throw new Error(`${field} must be a positive integer`);
  return Math.trunc(parsed);
}

function parseStoredPositiveInteger(value: string | null | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

function validateAttachmentLimits(attachments: RuntimeSettings["attachments"]) {
  if (attachments.maxTotalBytes < attachments.maxBytes) {
    throw new Error("attachments.maxTotalBytes must be greater than or equal to attachments.maxBytes");
  }
}

export function parseRuntimeSettingsRecord(record: RuntimeSettingsRecordLike | null | undefined): RuntimeSettings {
  if (!record) return defaultRuntimeSettings;

  return {
    mailbox: {
      limit: parseStoredPositiveInteger(record.mailboxLimit, defaultRuntimeSettings.mailbox.limit)
    },
    message: {
      retentionDays: parseStoredPositiveInteger(record.messageRetentionDays, defaultRuntimeSettings.message.retentionDays)
    },
    outbound: {
      dailyLimit: parseStoredPositiveInteger(record.outboundDailyLimit, defaultRuntimeSettings.outbound.dailyLimit)
    },
    api: {
      dailyLimit: parseStoredPositiveInteger(record.apiDailyLimit, defaultRuntimeSettings.api.dailyLimit)
    },
    attachments: {
      maxBytes: parseStoredPositiveInteger(record.maxAttachmentBytes, defaultRuntimeSettings.attachments.maxBytes),
      maxTotalBytes: parseStoredPositiveInteger(
        record.maxTotalAttachmentBytes,
        defaultRuntimeSettings.attachments.maxTotalBytes
      )
    },
    ai: {
      fallbackLimit: parseStoredPositiveInteger(record.aiFallbackLimit, defaultRuntimeSettings.ai.fallbackLimit)
    },
    lastUpdatedLabel: record.updatedAt || defaultRuntimeSettings.lastUpdatedLabel
  };
}

export function parseRuntimeSettingsUpdatePayload(
  input: unknown,
  current: RuntimeSettings
): RuntimeSettingsUpdateInput {
  const payload = toRecordLike(input);
  const next: RuntimeSettingsUpdateInput = {};

  if (typeof payload.mailbox !== "undefined") {
    const mailbox = toRecordLike(payload.mailbox);
    next.mailbox = {
      limit: readPositiveInteger(mailbox.limit, "mailbox.limit", current.mailbox.limit)
    };
  }

  if (typeof payload.message !== "undefined") {
    const message = toRecordLike(payload.message);
    next.message = {
      retentionDays: readPositiveInteger(
        message.retentionDays,
        "message.retentionDays",
        current.message.retentionDays
      )
    };
  }

  if (typeof payload.outbound !== "undefined") {
    const outbound = toRecordLike(payload.outbound);
    next.outbound = {
      dailyLimit: readPositiveInteger(
        outbound.dailyLimit,
        "outbound.dailyLimit",
        current.outbound.dailyLimit
      )
    };
  }

  if (typeof payload.api !== "undefined") {
    const api = toRecordLike(payload.api);
    next.api = {
      dailyLimit: readPositiveInteger(api.dailyLimit, "api.dailyLimit", current.api.dailyLimit)
    };
  }

  if (typeof payload.attachments !== "undefined") {
    const attachments = toRecordLike(payload.attachments);
    next.attachments = {
      maxBytes: readPositiveInteger(
        attachments.maxBytes,
        "attachments.maxBytes",
        current.attachments.maxBytes
      ),
      maxTotalBytes: readPositiveInteger(
        attachments.maxTotalBytes,
        "attachments.maxTotalBytes",
        current.attachments.maxTotalBytes
      )
    };
  }

  if (typeof payload.ai !== "undefined") {
    const ai = toRecordLike(payload.ai);
    next.ai = {
      fallbackLimit: readPositiveInteger(
        ai.fallbackLimit,
        "ai.fallbackLimit",
        current.ai.fallbackLimit
      )
    };
  }

  if (!next.mailbox && !next.message && !next.outbound && !next.api && !next.attachments && !next.ai) {
    throw new Error("At least one runtime settings section is required");
  }

  if (next.attachments) {
    validateAttachmentLimits({
      ...current.attachments,
      ...next.attachments
    });
  }

  return next;
}

export function toPersistableRuntimeSettings(
  settings: RuntimeSettingsUpdateInput,
  current = defaultRuntimeSettings
): Omit<RuntimeSettings, "lastUpdatedLabel"> {
  return {
    mailbox: {
      ...current.mailbox,
      ...settings.mailbox
    },
    message: {
      ...current.message,
      ...settings.message
    },
    outbound: {
      ...current.outbound,
      ...settings.outbound
    },
    api: {
      ...current.api,
      ...settings.api
    },
    attachments: {
      ...current.attachments,
      ...settings.attachments
    },
    ai: {
      ...current.ai,
      ...settings.ai
    }
  };
}
