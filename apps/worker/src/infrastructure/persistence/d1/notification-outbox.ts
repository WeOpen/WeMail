import type { D1Database } from "@cloudflare/workers-types";
import type { NotificationStatusSummary } from "@wemail/shared";

import type { AppStore, NotificationOutboxInput, NotificationOutboxRecord } from "../../../core/bindings";
import { getSafePageSize, nowIso } from "./shared";

function toRecord(row: Record<string, unknown>): NotificationOutboxRecord {
  return {
    messageId: row.message_id == null ? null : String(row.message_id),
    id: String(row.id), eventId: String(row.event_id), userId: String(row.user_id),
    target: row.target as NotificationOutboxRecord["target"], targetId: String(row.target_id),
    eventType: String(row.event_type), payloadJson: String(row.payload_json),
    status: row.status as NotificationOutboxRecord["status"], attempts: Number(row.attempts),
    nextAttemptAt: String(row.next_attempt_at), lockedAt: row.locked_at == null ? null : String(row.locked_at),
    leaseToken: row.lease_token == null ? null : String(row.lease_token),
    lastError: row.last_error == null ? null : String(row.last_error), expiresAt: String(row.expires_at),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at)
  };
}

export function prepareNotificationInsert(db: D1Database, input: NotificationOutboxInput) {
  const now = nowIso();
  return db.prepare(
    "INSERT OR IGNORE INTO notification_outbox (id, message_id, event_id, user_id, target, target_id, event_type, payload_json, status, attempts, next_attempt_at, locked_at, lease_token, last_error, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, NULL, NULL, NULL, ?, ?, ?)"
  ).bind(crypto.randomUUID(), input.messageId ?? null, input.eventId, input.userId, input.target, input.targetId, input.eventType,
    input.payloadJson, input.nextAttemptAt ?? now, input.expiresAt, now, now);
}

export function createNotificationOutboxAggregate(db: D1Database): Pick<AppStore, "notificationOutbox"> {
  return {
    notificationOutbox: {
      async enqueue(input) {
        await prepareNotificationInsert(db, input).run();
        const row = await db.prepare("SELECT * FROM notification_outbox WHERE event_id = ? AND target = ? AND target_id = ?")
          .bind(input.eventId, input.target, input.targetId).first<Record<string, unknown>>();
        if (!row) throw new Error("Notification outbox enqueue failed");
        return toRecord(row);
      },
      async claimDue(input) {
        // A single conditional UPDATE claims a bounded batch. The lease token
        // prevents a timed-out owner from completing a later owner's attempt.
        const leaseToken = crypto.randomUUID();
        await db.prepare("UPDATE notification_outbox SET status = 'failed', locked_at = NULL, lease_token = NULL, last_error = 'Delivery attempt limit exceeded after interruption', updated_at = ? WHERE status = 'processing' AND attempts >= 5 AND locked_at <= ?")
          .bind(input.nowIso, input.lockBeforeIso).run();
        const filters = input.taskId ? " AND id = ? AND user_id = ?" : "";
        const statement = db.prepare(`UPDATE notification_outbox SET status = 'processing', attempts = attempts + 1, locked_at = ?, lease_token = ?, updated_at = ? WHERE id IN (SELECT id FROM notification_outbox WHERE status IN ('pending', 'retrying', 'processing') AND attempts < 5 AND next_attempt_at <= ? AND expires_at > ? AND (locked_at IS NULL OR locked_at <= ?)${filters} ORDER BY next_attempt_at, created_at LIMIT ?) RETURNING *`);
        const bindings: Array<string | number> = [input.nowIso, leaseToken, input.nowIso, input.nowIso, input.nowIso, input.lockBeforeIso];
        if (input.taskId) bindings.push(input.taskId, input.userId ?? "");
        bindings.push(getSafePageSize(input.limit));
        const result = await statement.bind(...bindings).all<Record<string, unknown>>();
        return (result.results ?? []).map(toRecord);
      },
      async markSucceeded(id, leaseToken, updatedAt = nowIso()) {
        await db.prepare("UPDATE notification_outbox SET status = 'succeeded', locked_at = NULL, lease_token = NULL, last_error = NULL, updated_at = ? WHERE id = ? AND status = 'processing' AND lease_token = ?")
          .bind(updatedAt, id, leaseToken).run();
      },
      async markFailed(id, input) {
        const status = input.suppressed ? "suppressed" : input.retryAt ? "retrying" : "failed";
        await db.prepare("UPDATE notification_outbox SET status = CASE WHEN attempts >= 5 AND ? = 'retrying' THEN 'failed' ELSE ? END, locked_at = NULL, lease_token = NULL, last_error = ?, next_attempt_at = COALESCE(?, next_attempt_at), updated_at = ? WHERE id = ? AND status = 'processing' AND lease_token = ?")
          .bind(status, status, input.error.slice(0, 2000), input.retryAt ?? null, input.updatedAt ?? nowIso(), id, input.leaseToken).run();
      },
      async replay(id, userId, now) {
        const result = await db.prepare("UPDATE notification_outbox SET status = 'pending', attempts = 0, next_attempt_at = ?, locked_at = NULL, lease_token = NULL, updated_at = ? WHERE id = ? AND user_id = ? AND status IN ('failed', 'retrying', 'suppressed') AND expires_at > ? RETURNING *")
          .bind(now, now, id, userId, now).all<Record<string, unknown>>();
        return result.results?.[0] ? toRecord(result.results[0]) : null;
      },
      async deleteExpired(now, legacyBeforeIso) {
        // Attempts can contain the same verification code as the durable task.
        // Remove both in one transaction at the source message's retention time.
        await db.batch([
          db.prepare("DELETE FROM webhook_deliveries WHERE json_valid(payload_json) AND (json_extract(payload_json, '$.notificationTaskId') IN (SELECT id FROM notification_outbox WHERE expires_at <= ?) OR json_extract(payload_json, '$.data.messageId') IN (SELECT id FROM mail_messages WHERE expires_at <= ?))").bind(now, now),
          db.prepare("DELETE FROM webhook_deliveries WHERE created_at <= ? AND CASE WHEN json_valid(payload_json) THEN json_extract(payload_json, '$.notificationTaskId') ELSE NULL END IS NULL").bind(legacyBeforeIso ?? ""),
          db.prepare("DELETE FROM notification_outbox WHERE expires_at <= ?").bind(now)
        ]);
      },
      async listByUser(userId, limit = 50, target) {
        const result = await db.prepare(`SELECT * FROM notification_outbox WHERE user_id = ?${target ? " AND target = ?" : ""} ORDER BY created_at DESC, id DESC LIMIT ?`)
          .bind(userId, ...(target ? [target] : []), getSafePageSize(limit)).all<Record<string, unknown>>();
        return (result.results ?? []).map(toRecord);
      },
      async listRecent(limit = 30) {
        const result = await db.prepare("SELECT * FROM notification_outbox ORDER BY created_at DESC, id DESC LIMIT ?")
          .bind(getSafePageSize(limit)).all<Record<string, unknown>>();
        return (result.results ?? []).map(toRecord);
      },
      async summarize(userId, target) {
        const filters: string[] = ["expires_at > ?"];
        const bindings: string[] = [nowIso()];
        if (userId) { filters.push("user_id = ?"); bindings.push(userId); }
        if (target) { filters.push("target = ?"); bindings.push(target); }
        const rows = await db.prepare(`SELECT status, COUNT(*) AS count, MAX(updated_at) AS last_updated FROM notification_outbox WHERE ${filters.join(" AND ")} GROUP BY status`)
          .bind(...bindings).all<{ status: keyof NotificationStatusSummary["counts"]; count: number; last_updated: string }>();
        const counts: NotificationStatusSummary["counts"] = { pending: 0, processing: 0, retrying: 0, succeeded: 0, failed: 0, suppressed: 0 };
        let lastSucceededAt: string | null = null;
        for (const row of rows.results ?? []) {
          if (row.status in counts) counts[row.status] = Number(row.count);
          if (row.status === "succeeded") lastSucceededAt = row.last_updated;
        }
        return { counts, backlogCount: counts.pending + counts.processing + counts.retrying, lastSucceededAt };
      }
    }
  };
}
