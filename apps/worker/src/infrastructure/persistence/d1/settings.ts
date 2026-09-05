import type { D1Database } from "@cloudflare/workers-types";
import {
  applyDictionaryItemUpdate,
  type MailDomainSummary,
  buildDictionaryCatalog,
  findDefaultDictionaryGroup,
  findDefaultDictionaryItem
} from "@wemail/shared";
import type { AppStore, QuotaRecord, RuntimeSettingsRecord } from "../../../core/bindings";
import { toDictionaryGroup, toDictionaryItem } from "./row-mappers";
import { nowIso, parseAllowedRoles, parseJson, toBool } from "./shared";

type SettingsAggregate = Pick<
  AppStore,
  "settings" | "runtimeSettings" | "mailDomains" | "dictionaries" | "accountSettings" | "mailSettings" | "quotas"
>;

export function createSettingsAggregate(db: D1Database): SettingsAggregate {
  return {
    settings: {
      async getFeatureToggles(defaults) {
        const result = await db
          .prepare("SELECT key, value FROM system_settings WHERE key IN (?, ?, ?, ?)")
          .bind("aiEnabled", "telegramEnabled", "outboundEnabled", "mailboxCreationEnabled")
          .all();
        const map = new Map((result.results ?? []).map((row: any) => [row.key, parseJson<boolean>(row.value, false)]));
        return {
          aiEnabled: map.get("aiEnabled") ?? defaults.aiEnabled,
          telegramEnabled: map.get("telegramEnabled") ?? defaults.telegramEnabled,
          outboundEnabled: map.get("outboundEnabled") ?? defaults.outboundEnabled,
          mailboxCreationEnabled: map.get("mailboxCreationEnabled") ?? defaults.mailboxCreationEnabled
        };
      },
      async saveFeatureToggles(toggles) {
        for (const [key, value] of Object.entries(toggles)) {
          await db
            .prepare("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)")
            .bind(key, JSON.stringify(value), nowIso())
            .run();
        }
        return toggles;
      }
    },
    runtimeSettings: {
      async get() {
        const result = await db
          .prepare(
            "SELECT key, value, updated_at FROM system_settings WHERE key IN (?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(
            "runtime.mailbox.limit",
            "runtime.message.retentionDays",
            "runtime.outbound.dailyLimit",
            "runtime.api.dailyLimit",
            "runtime.attachments.maxBytes",
            "runtime.attachments.maxTotalBytes",
            "runtime.ai.fallbackLimit"
          )
          .all();

        const rows = result.results ?? [];
        if (rows.length === 0) return null;
        const map = new Map(rows.map((row: any) => [row.key, row.value as string]));
        const updatedAt = rows
          .map((row: any) => row.updated_at as string | null | undefined)
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1) ?? nowIso();

        return {
          mailboxLimit: map.get("runtime.mailbox.limit") ?? "",
          messageRetentionDays: map.get("runtime.message.retentionDays") ?? "",
          outboundDailyLimit: map.get("runtime.outbound.dailyLimit") ?? "",
          apiDailyLimit: map.get("runtime.api.dailyLimit") ?? "",
          maxAttachmentBytes: map.get("runtime.attachments.maxBytes") ?? "",
          maxTotalAttachmentBytes: map.get("runtime.attachments.maxTotalBytes") ?? "",
          aiFallbackLimit: map.get("runtime.ai.fallbackLimit") ?? "",
          updatedAt
        } satisfies RuntimeSettingsRecord;
      },
      async save(record) {
        const updatedAt = nowIso();
        const entries = [
          ["runtime.mailbox.limit", record.mailboxLimit],
          ["runtime.message.retentionDays", record.messageRetentionDays],
          ["runtime.outbound.dailyLimit", record.outboundDailyLimit],
          ["runtime.api.dailyLimit", record.apiDailyLimit],
          ["runtime.attachments.maxBytes", record.maxAttachmentBytes],
          ["runtime.attachments.maxTotalBytes", record.maxTotalAttachmentBytes],
          ["runtime.ai.fallbackLimit", record.aiFallbackLimit]
        ] as const;

        for (const [key, value] of entries) {
          await db
            .prepare("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)")
            .bind(key, value, updatedAt)
            .run();
        }

        return {
          ...record,
          updatedAt
        };
      }
    },
    mailDomains: {
      async list(defaults) {
        const result = await db
          .prepare("SELECT domain, allowed_roles_json FROM mail_domains ORDER BY sort_order ASC, created_at ASC")
          .all();
        const rows = result.results ?? [];
        if (rows.length === 0) return defaults;
        return rows.map((row: any): MailDomainSummary => ({
          domain: row.domain,
          allowedRoles: parseAllowedRoles(row.allowed_roles_json)
        }));
      },
      async saveAll(domains) {
        await db.prepare("DELETE FROM mail_domains").run();
        const now = nowIso();
        for (const [index, domain] of domains.entries()) {
          await db
            .prepare(
              "INSERT INTO mail_domains (id, domain, allowed_roles_json, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
            )
            .bind(crypto.randomUUID(), domain.domain, JSON.stringify(domain.allowedRoles), index, now, now)
            .run();
        }
        return domains;
      }
    },
    dictionaries: {
      async listGroups(groupKeys, options) {
        const [groupResult, itemResult] = await Promise.all([
          db.prepare("SELECT * FROM dictionary_groups").all(),
          db.prepare("SELECT * FROM dictionary_items").all()
        ]);

        return buildDictionaryCatalog({
          groupKeys,
          groups: (groupResult.results ?? []).map(toDictionaryGroup),
          includeDisabled: options?.includeDisabled,
          items: (itemResult.results ?? []).map(toDictionaryItem)
        });
      },
      async updateItem(groupKey, value, input) {
        const existingRow = await db
          .prepare("SELECT * FROM dictionary_items WHERE group_key = ? AND value = ?")
          .bind(groupKey, value)
          .first<any>();
        const existing = existingRow ? toDictionaryItem(existingRow) : findDefaultDictionaryItem(groupKey, value);
        if (!existing) return null;

        const group = findDefaultDictionaryGroup(groupKey);
        if (group) {
          await db
            .prepare(
              "INSERT OR IGNORE INTO dictionary_groups (group_key, label, description, is_system, version, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
            )
            .bind(group.groupKey, group.label, group.description, group.isSystem ? 1 : 0, group.version, nowIso())
            .run();
        }

        const next = applyDictionaryItemUpdate(existing, input);
        const updatedAt = nowIso();
        await db
          .prepare(
            "INSERT OR REPLACE INTO dictionary_items (id, group_key, value, label, description, sort_order, enabled, metadata_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(
            existingRow?.id ?? crypto.randomUUID(),
            groupKey,
            value,
            next.label,
            next.description,
            next.sortOrder,
            next.enabled ? 1 : 0,
            JSON.stringify(next.metadata),
            updatedAt
          )
          .run();
        return { ...next, updatedAt };
      }
    },
    accountSettings: {
      async get() {
        const row = await db.prepare("SELECT * FROM account_settings WHERE id = ?").bind("account_settings").first<any>();
        return row
          ? {
              id: row.id,
              creationJson: row.creation_json,
              lifecycleJson: row.lifecycle_json,
              protectionJson: row.protection_json,
              updatedAt: row.updated_at
            }
          : null;
      },
      async save(record) {
        const updatedAt = nowIso();
        await db
          .prepare(
            "INSERT OR REPLACE INTO account_settings (id, creation_json, lifecycle_json, protection_json, updated_at) VALUES (?, ?, ?, ?, ?)"
          )
          .bind("account_settings", record.creationJson, record.lifecycleJson, record.protectionJson, updatedAt)
          .run();
        return { id: "account_settings", updatedAt, ...record };
      }
    },
    mailSettings: {
      async get() {
        const row = await db.prepare("SELECT * FROM mail_settings WHERE id = ?").bind("mail_settings").first<any>();
        return row
          ? {
              id: row.id,
              senderRulesJson: row.sender_rules_json,
              routingJson: row.routing_json,
              workspaceDefaultsJson: row.workspace_defaults_json,
              updatedAt: row.updated_at
            }
          : null;
      },
      async save(record) {
        const updatedAt = nowIso();
        await db
          .prepare(
            "INSERT OR REPLACE INTO mail_settings (id, sender_rules_json, routing_json, workspace_defaults_json, updated_at) VALUES (?, ?, ?, ?, ?)"
          )
          .bind("mail_settings", record.senderRulesJson, record.routingJson, record.workspaceDefaultsJson, updatedAt)
          .run();
        return { id: "mail_settings", updatedAt, ...record };
      }
    },
    quotas: {
      async getByUserId(userId, fallbackLimit, fallbackApiDailyLimit) {
        const row = await db.prepare("SELECT * FROM user_send_quotas WHERE user_id = ?").bind(userId).first<any>();
        if (!row) {
          const next: QuotaRecord = {
            userId,
            apiDailyLimit: fallbackApiDailyLimit,
            apiCallsToday: 0,
            dailyLimit: fallbackLimit,
            sendsToday: 0,
            disabled: false,
            updatedAt: nowIso()
          };
          await db
            .prepare(
              "INSERT INTO user_send_quotas (user_id, daily_limit, sends_today, api_daily_limit, api_calls_today, disabled, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(userId, next.dailyLimit, next.sendsToday, next.apiDailyLimit, next.apiCallsToday, 0, next.updatedAt)
            .run();
          return next;
        }
        return {
          userId: row.user_id,
          apiDailyLimit: Number(row.api_daily_limit ?? fallbackApiDailyLimit),
          apiCallsToday: Number(row.api_calls_today ?? 0),
          dailyLimit: Number(row.daily_limit),
          sendsToday: Number(row.sends_today),
          disabled: toBool(row.disabled),
          updatedAt: row.updated_at
        };
      },
      async consumeApiCall(userId, fallbackLimit, fallbackApiDailyLimit) {
        const now = nowIso();
        const today = now.slice(0, 10);
        await db
          .prepare(
            "INSERT OR IGNORE INTO user_send_quotas (user_id, daily_limit, sends_today, api_daily_limit, api_calls_today, disabled, updated_at) VALUES (?, ?, 0, ?, 0, 0, ?)"
          )
          .bind(userId, fallbackLimit, fallbackApiDailyLimit, now)
          .run();

        const result = await db
          .prepare(
            `
            UPDATE user_send_quotas
            SET
              sends_today = CASE WHEN substr(updated_at, 1, 10) != ? THEN 0 ELSE sends_today END,
              api_calls_today = CASE WHEN substr(updated_at, 1, 10) != ? THEN 1 ELSE api_calls_today + 1 END,
              updated_at = ?
            WHERE user_id = ?
              AND (CASE WHEN substr(updated_at, 1, 10) != ? THEN 0 ELSE api_calls_today END) < api_daily_limit
          `
          )
          .bind(today, today, now, userId, today)
          .run();

        if (Number(result.meta.changes ?? 0) === 0) return null;
        return this.getByUserId(userId, fallbackLimit, fallbackApiDailyLimit);
      },
      async consumeOutboundSend(userId, fallbackLimit, fallbackApiDailyLimit) {
        const now = nowIso();
        const today = now.slice(0, 10);
        await db
          .prepare(
            "INSERT OR IGNORE INTO user_send_quotas (user_id, daily_limit, sends_today, api_daily_limit, api_calls_today, disabled, updated_at) VALUES (?, ?, 0, ?, 0, 0, ?)"
          )
          .bind(userId, fallbackLimit, fallbackApiDailyLimit, now)
          .run();

        const result = await db
          .prepare(
            `
            UPDATE user_send_quotas
            SET
              sends_today = CASE WHEN substr(updated_at, 1, 10) != ? THEN 1 ELSE sends_today + 1 END,
              api_calls_today = CASE WHEN substr(updated_at, 1, 10) != ? THEN 0 ELSE api_calls_today END,
              updated_at = ?
            WHERE user_id = ?
              AND disabled = 0
              AND (CASE WHEN substr(updated_at, 1, 10) != ? THEN 0 ELSE sends_today END) < daily_limit
          `
          )
          .bind(today, today, now, userId, today)
          .run();

        if (Number(result.meta.changes ?? 0) === 0) return null;
        return this.getByUserId(userId, fallbackLimit, fallbackApiDailyLimit);
      },
      async save(quota) {
        await db
          .prepare(
            "INSERT OR REPLACE INTO user_send_quotas (user_id, daily_limit, sends_today, api_daily_limit, api_calls_today, disabled, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(
            quota.userId,
            quota.dailyLimit,
            quota.sendsToday,
            quota.apiDailyLimit,
            quota.apiCallsToday,
            quota.disabled ? 1 : 0,
            quota.updatedAt
          )
          .run();
      }
    }
  };
}
