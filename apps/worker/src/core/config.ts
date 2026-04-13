import { APP_LIMITS, type FeatureToggles } from "@wemail/shared";

import type { AppBindings } from "./bindings";

export type AppConfig = {
  environment: string;
  appName: string;
  cookie: {
    name: string;
    secure: boolean;
  };
  session: {
    ttlHours: number;
  };
  mailbox: {
    domain: string;
    limit: number;
  };
  message: {
    retentionDays: number;
  };
  outbound: {
    dailyLimit: number;
    resendFrom?: string;
  };
  attachments: {
    maxBytes: number;
    maxTotalBytes: number;
  };
  ai: {
    fallbackLimit: number;
  };
  features: FeatureToggles;
  adminEmails: string[];
  integrations: {
    resendApiKey?: string;
    telegramBotToken?: string;
  };
};

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseList(value: string | undefined) {
  if (!value) return [];
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

export function resolveAppConfig(env: AppBindings): AppConfig {
  // Centralize all Worker configuration parsing here so route handlers and
  // use-cases can read typed values instead of repeating string parsing.
  // Cloudflare bindings arrive as strings, so this module is the boundary
  // where raw runtime input becomes stable application config.
  return {
    // Keep the environment label explicit so health checks and logs can report
    // the effective runtime mode even when Cloudflare omits the variable.
    environment: env.ENVIRONMENT ?? "local",

    // APP_NAME is used in health responses and as the default outbound sender
    // display name, so callers should not rebuild this string themselves.
    appName: env.APP_NAME,

    cookie: {
      // COOKIE_NAME defines the shared session cookie key used for auth.
      name: env.COOKIE_NAME,

      // COOKIE_SECURE stays configurable because local HTTP development needs
      // a non-secure cookie while staging/production should prefer Secure.
      secure: parseBoolean(env.COOKIE_SECURE, false)
    },

    session: {
      // Session TTL is stored as hours to keep wrangler.toml readable.
      // Defaulting here keeps auth helpers free from fallback literals.
      ttlHours: parseNumber(env.SESSION_TTL_HOURS, 72)
    },

    mailbox: {
      // Mailbox addresses are generated from this domain, so keeping the value
      // in typed config makes address creation and validation consistent.
      domain: env.DEFAULT_MAIL_DOMAIN,
      limit: parseNumber(env.MAILBOX_LIMIT, APP_LIMITS.mailboxLimit)
    },

    message: {
      // Retention controls automatic cleanup and must always resolve to a
      // finite number even when local configuration is incomplete.
      retentionDays: parseNumber(env.MESSAGE_RETENTION_DAYS, APP_LIMITS.messageRetentionDays)
    },

    outbound: {
      // Daily quota is reused during registration and send-time enforcement,
      // so parsing it once avoids duplicated numeric coercion rules.
      dailyLimit: parseNumber(env.OUTBOUND_DAILY_LIMIT, APP_LIMITS.outboundDailyLimit),

      // RESEND_FROM remains optional because the app can derive a sensible
      // default sender address from APP_NAME and DEFAULT_MAIL_DOMAIN.
      resendFrom: env.RESEND_FROM
    },

    attachments: {
      // Attachment limits protect both storage cost and runtime memory usage.
      maxBytes: parseNumber(env.MAX_ATTACHMENT_BYTES, APP_LIMITS.maxAttachmentBytes),
      maxTotalBytes: parseNumber(env.MAX_TOTAL_ATTACHMENT_BYTES, APP_LIMITS.maxTotalAttachmentBytes)
    },

    ai: {
      // AI fallback is intentionally capped per day so extraction remains
      // predictable in cost-sensitive environments.
      fallbackLimit: parseNumber(env.AI_FALLBACK_LIMIT, APP_LIMITS.aiFallbackLimit)
    },

    features: {
      // Feature flags stay close to config parsing so both defaults and stored
      // overrides start from the same boolean interpretation rules.
      aiEnabled: parseBoolean(env.ENABLE_AI, true),
      telegramEnabled: parseBoolean(env.ENABLE_TELEGRAM, true),
      outboundEnabled: parseBoolean(env.ENABLE_OUTBOUND, true),
      mailboxCreationEnabled: parseBoolean(env.ENABLE_MAILBOX_CREATION, true)
    },

    // Admin bootstrap email list is stored as CSV in Wrangler vars because it
    // is easy to edit in local and remote environments.
    adminEmails: parseList(env.ADMIN_EMAILS),

    integrations: {
      // Secrets stay optional so local development can run without every third-
      // party integration configured.
      resendApiKey: env.RESEND_API_KEY,
      telegramBotToken: env.TELEGRAM_BOT_TOKEN
    }
  };
}
