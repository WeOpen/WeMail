import type { D1Database } from "@cloudflare/workers-types";
import type { AppStore, NotificationRuleRecord } from "../../../core/bindings";
import { toNotificationRuleRecord } from "./row-mappers";
import { getSafePageSize, nowIso, toBool } from "./shared";

type OpsAggregate = Pick<AppStore, "audit" | "cleanupRuns" | "telegram" | "webhookEndpoints" | "webhookDeliveries" | "notificationRules">;

export function createOpsAggregate(db: D1Database): OpsAggregate {
  return {
    audit: {
      async record(event) {
        await db
          .prepare(
            "INSERT INTO system_audit_events (id, actor_type, actor_id, event_type, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)"
          )
          .bind(crypto.randomUUID(), event.actorType, event.actorId, event.eventType, event.payloadJson, nowIso())
          .run();
      },
      async countByActorSince(actorId, eventType, sinceIso) {
        const result = await db
          .prepare(
            "SELECT count(*) AS count FROM system_audit_events WHERE actor_id = ? AND event_type = ? AND created_at >= ?"
          )
          .bind(actorId, eventType, sinceIso)
          .first<{ count: number }>();
        return result?.count ?? 0;
      },
      async listByActorAndTypes(actorId, eventTypes, limit) {
        if (eventTypes.length === 0) return [];
        const placeholders = eventTypes.map(() => "?").join(", ");
        const result = await db
          .prepare(
            `SELECT * FROM system_audit_events WHERE actor_id = ? AND event_type IN (${placeholders}) ORDER BY created_at DESC LIMIT ?`
          )
          .bind(actorId, ...eventTypes, limit)
          .all<any>();
        return (result.results ?? []).map((row) => ({
          id: row.id,
          actorType: row.actor_type,
          actorId: row.actor_id,
          eventType: row.event_type,
          payloadJson: row.payload_json,
          createdAt: row.created_at
        }));
      },
      async listRecent(options) {
        const eventTypes = options?.eventTypes ?? [];
        const limit = Math.min(Math.max(Math.trunc(options?.limit ?? 30), 1), 500);
        const whereClause = eventTypes.length > 0 ? `WHERE event_type IN (${eventTypes.map(() => "?").join(", ")})` : "";
        const result = await db
          .prepare(`SELECT * FROM system_audit_events ${whereClause} ORDER BY created_at DESC LIMIT ?`)
          .bind(...eventTypes, limit)
          .all<any>();
        return (result.results ?? []).map((row) => ({
          id: row.id,
          actorType: row.actor_type,
          actorId: row.actor_id,
          eventType: row.event_type,
          payloadJson: row.payload_json,
          createdAt: row.created_at
        }));
      }
    },
    cleanupRuns: {
      async record(input) {
        const id = crypto.randomUUID();
        await db
          .prepare(
            "INSERT INTO system_cleanup_runs (id, status, started_at, finished_at, deleted_messages, deleted_attachments, deleted_accounts, error_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(
            id,
            input.status,
            input.startedAt,
            input.finishedAt,
            input.deletedMessages,
            input.deletedAttachments,
            input.deletedAccounts,
            input.errorText
          )
          .run();
        return { id, ...input };
      },
      async listRecent(limit) {
        const result = await db
          .prepare("SELECT * FROM system_cleanup_runs ORDER BY started_at DESC LIMIT ?")
          .bind(getSafePageSize(limit))
          .all<any>();
        return (result.results ?? []).map((row) => ({
          id: row.id,
          status: row.status === "failed" ? "failed" : "success",
          startedAt: row.started_at,
          finishedAt: row.finished_at,
          deletedMessages: Number(row.deleted_messages ?? 0),
          deletedAttachments: Number(row.deleted_attachments ?? 0),
          deletedAccounts: Number(row.deleted_accounts ?? 0),
          errorText: row.error_text ?? null
        }));
      }
    },
    telegram: {
      async upsert(input) {
        const existing = await db
          .prepare("SELECT * FROM telegram_subscriptions WHERE user_id = ?")
          .bind(input.userId)
          .first<any>();
        const createdAt = existing?.created_at ?? nowIso();
        const id = existing?.id ?? crypto.randomUUID();
        const updatedAt = nowIso();
        await db
          .prepare("DELETE FROM telegram_subscriptions WHERE chat_id = ? AND user_id <> ?")
          .bind(input.chatId, input.userId)
          .run();
        await db
          .prepare(
            "INSERT OR REPLACE INTO telegram_subscriptions (id, user_id, chat_id, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
          )
          .bind(id, input.userId, input.chatId, input.enabled ? 1 : 0, createdAt, updatedAt)
          .run();
        return { id, userId: input.userId, chatId: input.chatId, enabled: input.enabled, createdAt, updatedAt };
      },
      async findByUserId(userId) {
        const row = await db
          .prepare("SELECT * FROM telegram_subscriptions WHERE user_id = ?")
          .bind(userId)
          .first<any>();
        return row
          ? {
              id: row.id,
              userId: row.user_id,
              chatId: row.chat_id,
              enabled: toBool(row.enabled),
              createdAt: row.created_at,
              updatedAt: row.updated_at
            }
          : null;
      },
      async findByChatId(chatId) {
        const row = await db
          .prepare("SELECT * FROM telegram_subscriptions WHERE chat_id = ? ORDER BY updated_at DESC LIMIT 1")
          .bind(chatId)
          .first<any>();
        return row
          ? {
              id: row.id,
              userId: row.user_id,
              chatId: row.chat_id,
              enabled: toBool(row.enabled),
              createdAt: row.created_at,
              updatedAt: row.updated_at
            }
          : null;
      }
    },
    webhookEndpoints: {
      async listByUser(userId) {
        const result = await db
          .prepare("SELECT * FROM webhook_endpoints WHERE user_id = ? ORDER BY created_at DESC")
          .bind(userId)
          .all();
        return (result.results ?? []).map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          name: row.name,
          url: row.url,
          eventsJson: row.events_json,
          signingSecret: row.signing_secret,
          enabled: toBool(row.enabled),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }));
      },
      async listByUserPage(userId, options) {
        const totalRow = await db
          .prepare("SELECT count(*) AS count FROM webhook_endpoints WHERE user_id = ?")
          .bind(userId)
          .first<{ count: number }>();
        const result = await db
          .prepare("SELECT * FROM webhook_endpoints WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?")
          .bind(userId, options.pageSize, (options.page - 1) * options.pageSize)
          .all();
        return {
          endpoints: (result.results ?? []).map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            url: row.url,
            eventsJson: row.events_json,
            signingSecret: row.signing_secret,
            enabled: toBool(row.enabled),
            createdAt: row.created_at,
            updatedAt: row.updated_at
          })),
          total: Number(totalRow?.count ?? 0),
          page: options.page,
          pageSize: options.pageSize
        };
      },
      async create(input) {
        const now = nowIso();
        const record = {
          id: crypto.randomUUID(),
          userId: input.userId,
          name: input.name,
          url: input.url,
          eventsJson: input.eventsJson,
          signingSecret: crypto.randomUUID().replaceAll("-", ""),
          enabled: input.enabled,
          createdAt: now,
          updatedAt: now
        };
        await db
          .prepare(
            "INSERT INTO webhook_endpoints (id, user_id, name, url, events_json, signing_secret, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(
            record.id,
            record.userId,
            record.name,
            record.url,
            record.eventsJson,
            record.signingSecret,
            record.enabled ? 1 : 0,
            record.createdAt,
            record.updatedAt
          )
          .run();
        return record;
      },
      async update(id, userId, input) {
        const updatedAt = nowIso();
        await db
          .prepare(
            "UPDATE webhook_endpoints SET name = ?, url = ?, events_json = ?, enabled = ?, updated_at = ? WHERE id = ? AND user_id = ?"
          )
          .bind(input.name, input.url, input.eventsJson, input.enabled ? 1 : 0, updatedAt, id, userId)
          .run();
        return (await this.listByUser(userId)).find((endpoint) => endpoint.id === id) ?? null;
      },
      async rotateSecret(id, userId) {
        const updatedAt = nowIso();
        const signingSecret = crypto.randomUUID().replaceAll("-", "");
        await db
          .prepare("UPDATE webhook_endpoints SET signing_secret = ?, updated_at = ? WHERE id = ? AND user_id = ?")
          .bind(signingSecret, updatedAt, id, userId)
          .run();
        return (await this.listByUser(userId)).find((endpoint) => endpoint.id === id) ?? null;
      },
      async delete(id, userId) {
        const existing = (await this.listByUser(userId)).find((endpoint) => endpoint.id === id);
        if (!existing) return;
        await db.prepare("DELETE FROM webhook_deliveries WHERE endpoint_id = ?").bind(id).run();
        await db.prepare("DELETE FROM webhook_endpoints WHERE id = ? AND user_id = ?").bind(id, userId).run();
      }
    },
    webhookDeliveries: {
      async listByUser(userId) {
        const result = await db
          .prepare(
            "SELECT d.* FROM webhook_deliveries d INNER JOIN webhook_endpoints e ON e.id = d.endpoint_id WHERE e.user_id = ? ORDER BY d.created_at DESC"
          )
          .bind(userId)
          .all();
        return (result.results ?? []).map((row: any) => ({
          id: row.id,
          endpointId: row.endpoint_id,
          eventType: row.event_type,
          status: row.status,
          statusCode: row.status_code === null ? null : Number(row.status_code),
          durationMs: row.duration_ms === null ? null : Number(row.duration_ms),
          errorText: row.error_text,
          payloadJson: row.payload_json,
          responseText: row.response_text ?? null,
          createdAt: row.created_at
        }));
      },
      async listByUserPage(userId, query) {
        const filters = ["e.user_id = ?"];
        const bindings: Array<number | string> = [userId];
        if (query.endpointId) {
          filters.push("d.endpoint_id = ?");
          bindings.push(query.endpointId);
        }
        if (query.status && query.status !== "all") {
          filters.push("d.status = ?");
          bindings.push(query.status);
        }
        const whereClause = filters.join(" AND ");
        const totalRow = await db
          .prepare(`SELECT count(*) AS count FROM webhook_deliveries d INNER JOIN webhook_endpoints e ON e.id = d.endpoint_id WHERE ${whereClause}`)
          .bind(...bindings)
          .first<{ count: number }>();
        const result = await db
          .prepare(
            `SELECT d.* FROM webhook_deliveries d INNER JOIN webhook_endpoints e ON e.id = d.endpoint_id WHERE ${whereClause} ORDER BY d.created_at DESC LIMIT ? OFFSET ?`
          )
          .bind(...bindings, query.pageSize, (query.page - 1) * query.pageSize)
          .all();
        return {
          deliveries: (result.results ?? []).map((row: any) => ({
            id: row.id,
            endpointId: row.endpoint_id,
            eventType: row.event_type,
            status: row.status,
            statusCode: row.status_code === null ? null : Number(row.status_code),
            durationMs: row.duration_ms === null ? null : Number(row.duration_ms),
            errorText: row.error_text,
            payloadJson: row.payload_json,
            responseText: row.response_text ?? null,
            createdAt: row.created_at
          })),
          total: Number(totalRow?.count ?? 0),
          page: query.page,
          pageSize: query.pageSize
        };
      },
      async findByUser(id, userId) {
        const row = await db
          .prepare(
            "SELECT d.* FROM webhook_deliveries d INNER JOIN webhook_endpoints e ON e.id = d.endpoint_id WHERE d.id = ? AND e.user_id = ?"
          )
          .bind(id, userId)
          .first<any>();
        if (!row) return null;
        return {
          id: row.id,
          endpointId: row.endpoint_id,
          eventType: row.event_type,
          status: row.status,
          statusCode: row.status_code === null ? null : Number(row.status_code),
          durationMs: row.duration_ms === null ? null : Number(row.duration_ms),
          errorText: row.error_text,
          payloadJson: row.payload_json,
          responseText: row.response_text ?? null,
          createdAt: row.created_at
        };
      },
      async record(input) {
        const { createdAt, id, ...recordInput } = input;
        const record = { id: id ?? crypto.randomUUID(), createdAt: createdAt ?? nowIso(), ...recordInput };
        await db
          .prepare(
            "INSERT INTO webhook_deliveries (id, endpoint_id, event_type, status, status_code, duration_ms, error_text, payload_json, response_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(
            record.id,
            record.endpointId,
            record.eventType,
            record.status,
            record.statusCode,
            record.durationMs,
            record.errorText,
            record.payloadJson,
            record.responseText,
            record.createdAt
          )
          .run();
        return record;
      }
    },
    notificationRules: {
      async listByUser(userId) {
        const result = await db
          .prepare("SELECT * FROM notification_rules WHERE user_id = ? ORDER BY updated_at DESC")
          .bind(userId)
          .all();
        return (result.results ?? []).map(toNotificationRuleRecord);
      },
      async create(input) {
        const record: NotificationRuleRecord = {
          id: crypto.randomUUID(),
          createdAt: nowIso(),
          updatedAt: nowIso(),
          ...input
        };
        await db
          .prepare(
            "INSERT INTO notification_rules (id, user_id, name, enabled, target, target_id, event_types_json, mailbox_ids_json, keyword, quiet_hours_start, quiet_hours_end, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(
            record.id,
            record.userId,
            record.name,
            record.enabled ? 1 : 0,
            record.target,
            record.targetId,
            record.eventTypesJson,
            record.mailboxIdsJson,
            record.keyword,
            record.quietHoursStart,
            record.quietHoursEnd,
            record.createdAt,
            record.updatedAt
          )
          .run();
        return record;
      },
      async update(id, userId, input) {
        const updatedAt = nowIso();
        await db
          .prepare(
            "UPDATE notification_rules SET name = ?, enabled = ?, target = ?, target_id = ?, event_types_json = ?, mailbox_ids_json = ?, keyword = ?, quiet_hours_start = ?, quiet_hours_end = ?, updated_at = ? WHERE id = ? AND user_id = ?"
          )
          .bind(
            input.name,
            input.enabled ? 1 : 0,
            input.target,
            input.targetId,
            input.eventTypesJson,
            input.mailboxIdsJson,
            input.keyword,
            input.quietHoursStart,
            input.quietHoursEnd,
            updatedAt,
            id,
            userId
          )
          .run();
        const row = await db.prepare("SELECT * FROM notification_rules WHERE id = ? AND user_id = ?").bind(id, userId).first<any>();
        return row ? toNotificationRuleRecord(row) : null;
      },
      async delete(id, userId) {
        await db.prepare("DELETE FROM notification_rules WHERE id = ? AND user_id = ?").bind(id, userId).run();
      }
    }
  };
}
