import type { D1Database } from "@cloudflare/workers-types";
import type { OutboundMessageStatus } from "@wemail/shared";

import type { AppStore, OutboundSendRecord } from "../../../core/bindings";
import { toOutboundMessageRecord } from "./row-mappers";

function toSend(row: Record<string, unknown>): OutboundSendRecord {
  return {
    ...toOutboundMessageRecord(row), userId: String(row.user_id), requestId: String(row.request_key), requestHash: String(row.request_hash),
    maxAttempts: Number(row.max_attempts), retryDelayMs: Number(row.retry_delay_ms), attempts: Number(row.attempts),
    nextAttemptAt: String(row.next_attempt_at), leaseToken: row.lease_token == null ? null : String(row.lease_token),
    submissionUncertain: row.submission_uncertain === 1,
    firstAttemptAt: row.first_attempt_at == null ? null : String(row.first_attempt_at)
  };
}

const eventOrder = "CASE status WHEN 'complained' THEN 6 WHEN 'bounced' THEN 5 WHEN 'delivered' THEN 4 WHEN 'failed' THEN 3 WHEN 'accepted' THEN 2 ELSE 0 END DESC, occurred_at DESC";

function providerUpdate(db: D1Database, providerId: string) {
  // Reconcile buffered early callbacks and never let a late 'sent' callback
  // regress a terminal delivery verdict. All events remain in the timeline.
  return db.prepare(`UPDATE mail_outbound_messages SET status = (SELECT status FROM mail_outbound_events WHERE provider_message_id = ? ORDER BY ${eventOrder} LIMIT 1), error_text = (SELECT detail FROM mail_outbound_events WHERE provider_message_id = ? ORDER BY ${eventOrder} LIMIT 1) WHERE provider_message_id = ? AND EXISTS (SELECT 1 FROM mail_outbound_events WHERE provider_message_id = ?)`)
    .bind(providerId, providerId, providerId, providerId);
}

export function createOutboundSendsAggregate(db: D1Database): Pick<AppStore, "outboundSends"> {
  return {
    outboundSends: {
      async accept(input, limits) {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const today = now.slice(0, 10);
        // Only an inserted logical request can increment quota. D1's batch
        // transaction serializes competing requests and rolls back both writes.
        await db.batch([
          db.prepare("INSERT OR IGNORE INTO user_send_quotas (user_id, daily_limit, sends_today, api_daily_limit, api_calls_today, disabled, updated_at) VALUES (?, ?, 0, ?, 0, 0, ?)")
            .bind(input.userId, limits.dailyLimit, limits.apiDailyLimit, now),
          db.prepare("INSERT INTO mail_outbound_messages (id, account_id, user_id, request_key, request_hash, from_address, to_address, subject, body_text, status, request_payload_json, max_attempts, retry_delay_ms, attempts, next_attempt_at, created_at, updated_at) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?, 0, ?, ?, ? FROM user_send_quotas WHERE user_id = ? AND disabled = 0 AND (CASE WHEN substr(updated_at, 1, 10) != ? THEN 0 ELSE sends_today END) < daily_limit ON CONFLICT(user_id, request_key) DO NOTHING")
            .bind(id, input.mailboxId, input.userId, input.requestId, input.requestHash, input.fromAddress, input.toAddress, input.subject, input.bodyText, input.requestPayloadJson, input.maxAttempts, input.retryDelayMs, now, now, now, input.userId, today),
          db.prepare("UPDATE user_send_quotas SET sends_today = CASE WHEN substr(updated_at, 1, 10) != ? THEN 1 ELSE sends_today + 1 END, api_calls_today = CASE WHEN substr(updated_at, 1, 10) != ? THEN 0 ELSE api_calls_today END, updated_at = ? WHERE user_id = ? AND EXISTS (SELECT 1 FROM mail_outbound_messages WHERE id = ?)")
            .bind(today, today, now, input.userId, id)
        ]);
        return this.findByUserAndKey(input.userId, input.requestId);
      },
      async findByUserAndKey(userId, requestId) {
        const row = await db.prepare("SELECT * FROM mail_outbound_messages WHERE user_id = ? AND request_key = ?").bind(userId, requestId).first<Record<string, unknown>>();
        return row ? toSend(row) : null;
      },
      async claimDue(input) {
        // Resend retains keys for 24 hours. Stop an hour early so network time
        // and clock skew cannot turn recovery into a second physical email.
        const expiry = new Date(new Date(input.nowIso).getTime() - 23 * 3_600_000).toISOString();
        await db.prepare("UPDATE mail_outbound_messages SET status = 'uncertain', error_text = '供应商幂等窗口已过期或最后一次尝试中断，请核对供应商记录', locked_at = NULL, lease_token = NULL, updated_at = ? WHERE user_id IS NOT NULL AND status IN ('queued', 'sending') AND ((first_attempt_at IS NOT NULL AND first_attempt_at <= ?) OR (status = 'sending' AND attempts >= max_attempts AND locked_at <= ?))")
          .bind(input.nowIso, expiry, input.lockBeforeIso).run();
        const token = crypto.randomUUID();
        const filters = input.id ? " AND id = ? AND user_id = ?" : "";
        const values: Array<string | number> = [input.nowIso, token, input.nowIso, input.nowIso, input.nowIso, input.lockBeforeIso];
        if (input.id) values.push(input.id, input.userId ?? "");
        values.push(Math.min(Math.max(input.limit, 1), 10));
        const result = await db.prepare(`UPDATE mail_outbound_messages SET submission_uncertain = CASE WHEN status = 'sending' THEN 1 ELSE submission_uncertain END, status = 'sending', attempts = attempts + 1, locked_at = ?, lease_token = ?, first_attempt_at = COALESCE(first_attempt_at, ?), updated_at = ? WHERE id IN (SELECT id FROM mail_outbound_messages WHERE user_id IS NOT NULL AND attempts < max_attempts AND ((status = 'queued' AND next_attempt_at <= ?) OR (status = 'sending' AND locked_at <= ?))${filters} ORDER BY next_attempt_at LIMIT ?) RETURNING *`)
          .bind(...values).all<Record<string, unknown>>();
        return (result.results ?? []).map(toSend);
      },
      async complete(id, input) {
        await db.batch([
          db.prepare("INSERT INTO mail_outbound_events (id, message_id, provider_message_id, event_type, status, occurred_at, detail) SELECT ?, id, ?, 'attempt', ?, ?, ? FROM mail_outbound_messages WHERE id = ? AND lease_token = ? AND status = 'sending'")
            .bind(`attempt:${crypto.randomUUID()}`, input.providerMessageId ?? null, input.status, input.nowIso, input.errorText?.slice(0, 2000) ?? null, id, input.leaseToken),
          db.prepare("UPDATE mail_outbound_messages SET status = ?, submission_uncertain = MAX(submission_uncertain, ?), error_text = ?, provider_message_id = COALESCE(?, provider_message_id), response_payload_json = ?, next_attempt_at = COALESCE(?, next_attempt_at), locked_at = NULL, lease_token = NULL, updated_at = ? WHERE id = ? AND lease_token = ? AND status = 'sending'")
            .bind(input.status, input.submissionUncertain ? 1 : 0, input.errorText?.slice(0, 2000) ?? null, input.providerMessageId ?? null, input.responsePayloadJson ?? null, input.nextAttemptAt ?? null, input.nowIso, id, input.leaseToken),
          // Keep the provider association and buffered final verdict atomic.
          // Otherwise a reconciliation failure would leave an accepted record
          // with no recoverable lease after its callback already returned 200.
          ...(input.providerMessageId ? [providerUpdate(db, input.providerMessageId)] : [])
        ]);
      },
      async recordProviderEvent(event) {
        await db.batch([
          db.prepare("INSERT OR IGNORE INTO mail_outbound_events (id, provider_message_id, event_type, status, occurred_at, detail) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(`provider:${event.id}`, event.providerMessageId, event.type, event.status, event.occurredAt, event.detail?.slice(0, 2000) ?? null),
          providerUpdate(db, event.providerMessageId)
        ]);
      },
      async timeline(id) {
        const result = await db.prepare("SELECT * FROM mail_outbound_events WHERE message_id = ? OR provider_message_id = (SELECT provider_message_id FROM mail_outbound_messages WHERE id = ?) ORDER BY occurred_at, id")
          .bind(id, id).all<{ id: string; event_type: string; status: OutboundMessageStatus; occurred_at: string; detail: string | null }>();
        return (result.results ?? []).map((row) => ({ id: row.id, type: row.event_type, status: row.status, occurredAt: row.occurred_at, detail: row.detail }));
      },
      async cleanup(before) {
        // Keep the hash/key ledger so an old request key cannot become a new
        // billable send after sensitive failed-message payloads are purged.
        await db.batch([
          db.prepare("DELETE FROM mail_outbound_events WHERE message_id IS NULL AND occurred_at <= ? AND NOT EXISTS (SELECT 1 FROM mail_outbound_messages WHERE provider_message_id = mail_outbound_events.provider_message_id)").bind(before),
          db.prepare("UPDATE mail_outbound_events SET detail = NULL WHERE message_id IN (SELECT id FROM mail_outbound_messages WHERE status IN ('failed','uncertain','bounced','complained') AND created_at <= ?) OR provider_message_id IN (SELECT provider_message_id FROM mail_outbound_messages WHERE status IN ('failed','uncertain','bounced','complained') AND created_at <= ?)").bind(before, before),
          db.prepare("UPDATE mail_outbound_messages SET body_text = '', request_payload_json = '{}', response_payload_json = NULL, error_text = NULL, payload_retained = 0 WHERE status IN ('failed','uncertain','bounced','complained') AND created_at <= ?").bind(before)
        ]);
      }
    }
  };
}
