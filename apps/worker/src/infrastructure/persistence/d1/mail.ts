import type { D1Database } from "@cloudflare/workers-types";
import type {
  AppStore,
  AttachmentRecord,
  MailboxDetailListQuery,
  MailboxDetailRecord,
  OutboundMessageUsageQuery,
  OutboundMessageUsageSummary
} from "../../../core/bindings";
import { toMailboxDetailRecord, toMailboxRecord, toMessageRecord, toOutboundMessageRecord } from "./row-mappers";
import { DAY_MS, getActiveRangeDays, getInactiveDays, getSafePage, getSafePageSize, nowIso } from "./shared";

// Cloudflare D1 caps bound parameters per query at 100. IN (...) clauses with
// one placeholder per id must stay at or below that or the whole statement
// errors — the cleanup cron passes up to CLEANUP_BATCH_SIZE ids at once, and
// the batch-delete route passes user-selected ids.
const D1_BIND_PARAMETER_LIMIT = 100;

function chunkForD1BindLimit<T>(items: T[]): T[][] {
  if (items.length <= D1_BIND_PARAMETER_LIMIT) return [items];
  const chunks: T[][] = [];
  for (let offset = 0; offset < items.length; offset += D1_BIND_PARAMETER_LIMIT) {
    chunks.push(items.slice(offset, offset + D1_BIND_PARAMETER_LIMIT));
  }
  return chunks;
}

type MailAggregate = Pick<AppStore, "mailboxes" | "messages" | "attachments" | "outboundMessages">;

export function createMailAggregate(db: D1Database): MailAggregate {
  async function findMailboxDetailById(id: string): Promise<MailboxDetailRecord | null> {
    const row = await db
      .prepare(
        `
          SELECT
            a.id,
            a.user_id,
            a.address,
            a.label,
            a.status,
            a.tags_json,
            a.created_by_user_id,
            a.last_active_at,
            a.deleted_at,
            a.created_at,
            u.name as created_by_name,
            (SELECT COUNT(*) FROM mail_messages WHERE account_id = a.id) as message_count,
            (SELECT COUNT(*) FROM mail_outbound_messages WHERE account_id = a.id) as outbound_count
          FROM accounts a
          LEFT JOIN users u ON a.created_by_user_id = u.id
          WHERE a.id = ?
        `
      )
      .bind(id)
      .first<any>();

    return row ? toMailboxDetailRecord(row) : null;
  }

  return {
    mailboxes: {
      async countByUser(userId) {
        const result = await db
          .prepare("SELECT count(*) AS count FROM accounts WHERE user_id = ? AND status != 'soft_deleted'")
          .bind(userId)
          .first<{ count: number }>();
        return result?.count ?? 0;
      },
      async create(input) {
        const id = crypto.randomUUID();
        const createdAt = nowIso();
        await db
          .prepare(
            "INSERT INTO accounts (id, user_id, address, label, status, tags_json, created_by_user_id, last_active_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(
            id,
            input.userId,
            input.address,
            input.label,
            input.status ?? "enabled",
            JSON.stringify(input.tags ?? []),
            input.userId,
            input.lastActiveAt ?? null,
            createdAt
          )
          .run();
        return { id, userId: input.userId, address: input.address, label: input.label, createdAt };
      },
      async update(id, input) {
        const assignments: string[] = [];
        const bindings: unknown[] = [];

        if (typeof input.label !== "undefined") {
          assignments.push("label = ?");
          bindings.push(input.label);
        }

        if (typeof input.status !== "undefined") {
          assignments.push("status = ?");
          bindings.push(input.status);
          assignments.push("deleted_at = ?");
          bindings.push(input.status === "soft_deleted" ? nowIso() : null);
        }

        if (typeof input.deletedAt !== "undefined") {
          assignments.push("deleted_at = ?");
          bindings.push(input.deletedAt);
        }

        if (typeof input.lastActiveAt !== "undefined") {
          assignments.push("last_active_at = ?");
          bindings.push(input.lastActiveAt);
        }

        if (typeof input.tags !== "undefined") {
          assignments.push("tags_json = ?");
          bindings.push(JSON.stringify(input.tags));
        }

        if (assignments.length === 0) return findMailboxDetailById(id);

        await db
          .prepare(`UPDATE accounts SET ${assignments.join(", ")} WHERE id = ?`)
          .bind(...bindings, id)
          .run();
        return findMailboxDetailById(id);
      },
      async listByUser(userId) {
        const result = await db.prepare("SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC").bind(userId).all();
        return (result.results ?? []).map(toMailboxRecord);
      },
      async listAllWithDetails(query: MailboxDetailListQuery) {
        const page = getSafePage(query.page);
        const pageSize = getSafePageSize(query.pageSize);
        const offset = (page - 1) * pageSize;
        const whereConditions: string[] = [];
        const bindings: any[] = [];

        if (query.userId) {
          whereConditions.push("a.user_id = ?");
          bindings.push(query.userId);
        }

        if (query.search) {
          whereConditions.push("(a.id LIKE ? OR a.label LIKE ? OR a.address LIKE ? OR u.name LIKE ?)");
          const searchPattern = `%${query.search}%`;
          bindings.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        if (query.status && query.status !== "all") {
          whereConditions.push("a.status = ?");
          bindings.push(query.status);
        }

        if (query.createdBy && query.createdBy !== "all") {
          whereConditions.push("u.name = ?");
          bindings.push(query.createdBy);
        }

        const activeRangeDays = getActiveRangeDays(query.activeRange);
        if (activeRangeDays) {
          whereConditions.push("a.last_active_at IS NOT NULL AND a.last_active_at >= ?");
          bindings.push(new Date(Date.now() - activeRangeDays * DAY_MS).toISOString());
        }

        if (query.quickFilter === "anomaly") {
          whereConditions.push("a.status <> 'enabled'");
        }

        if (query.quickFilter === "inactive") {
          whereConditions.push("(a.last_active_at IS NULL OR a.last_active_at < ?)");
          bindings.push(new Date(Date.now() - getInactiveDays(query.inactiveDays) * DAY_MS).toISOString());
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

        const countQuery = `
          SELECT COUNT(*) as count
          FROM accounts a
          LEFT JOIN users u ON a.created_by_user_id = u.id
          ${whereClause}
        `;
        const countResult = await db.prepare(countQuery).bind(...bindings).first<{ count: number }>();
        const total = countResult?.count ?? 0;

        const dataQuery = `
          SELECT
            a.id,
            a.user_id,
            a.address,
            a.label,
            a.status,
            a.tags_json,
            a.created_by_user_id,
            a.last_active_at,
            a.deleted_at,
            a.created_at,
            u.name as created_by_name,
            (SELECT COUNT(*) FROM mail_messages WHERE account_id = a.id) as message_count,
            (SELECT COUNT(*) FROM mail_outbound_messages WHERE account_id = a.id) as outbound_count
          FROM accounts a
          LEFT JOIN users u ON a.created_by_user_id = u.id
          ${whereClause}
          ORDER BY a.created_at DESC
          LIMIT ? OFFSET ?
        `;
        const dataResult = await db.prepare(dataQuery).bind(...bindings, pageSize, offset).all();

        const accounts = (dataResult.results ?? []).map(toMailboxDetailRecord);

        return { accounts, total };
      },
      async listAll() {
        const result = await db.prepare("SELECT * FROM accounts ORDER BY created_at DESC").all();
        return (result.results ?? []).map(toMailboxRecord);
      },
      async listPage(options) {
        const totalRow = await db.prepare("SELECT count(*) AS count FROM accounts").first<{ count: number }>();
        const latestRow = await db.prepare("SELECT * FROM accounts ORDER BY created_at DESC LIMIT 1").first<any>();
        const result = await db
          .prepare("SELECT * FROM accounts ORDER BY created_at DESC LIMIT ? OFFSET ?")
          .bind(options.pageSize, (options.page - 1) * options.pageSize)
          .all();

        return {
          latestMailbox: latestRow ? toMailboxRecord(latestRow) : null,
          mailboxes: (result.results ?? []).map(toMailboxRecord),
          page: options.page,
          pageSize: options.pageSize,
          total: totalRow?.count ?? 0
        };
      },
      async findById(id) {
        const row = await db.prepare("SELECT * FROM accounts WHERE id = ?").bind(id).first<any>();
        return row ? toMailboxRecord(row) : null;
      },
      async findDetailById(id) {
        return findMailboxDetailById(id);
      },
      async findByAddress(address) {
        const row = await db
          .prepare("SELECT * FROM accounts WHERE address = ? AND status <> 'soft_deleted'")
          .bind(address)
          .first<any>();
        return row ? toMailboxRecord(row) : null;
      },
      async delete(id) {
        await db.prepare("DELETE FROM accounts WHERE id = ?").bind(id).run();
      }
    },
    messages: {
      async create(input) {
        const id = crypto.randomUUID();
        try {
          await db
            .prepare(
              "INSERT INTO mail_messages (id, account_id, to_address, message_id, from_address, subject, preview_text, body_text, extraction_json, oversize_status, attachment_count, received_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(
              id,
              input.mailboxId,
              input.toAddress ?? null,
              input.messageId ?? null,
              input.fromAddress,
              input.subject,
              input.previewText,
              input.bodyText,
              input.extractionJson,
              input.oversizeStatus,
              input.attachmentCount,
              input.receivedAt,
              input.expiresAt
            )
            .run();
        } catch (error) {
          // The (account_id, message_id) unique index is the race backstop:
          // two concurrent redeliveries can both pass the pre-check, and the
          // loser surfaces here. Re-read and hand back the winner.
          if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
            const existing = await db
              .prepare("SELECT * FROM mail_messages WHERE account_id = ? AND message_id = ?")
              .bind(input.mailboxId, input.messageId ?? null)
              .first<any>();
            if (existing) return toMessageRecord(existing);
          }
          throw error;
        }
        return { id, ...input };
      },
      async listForMailboxes(query) {
        const mailboxIds = Array.from(new Set(query.mailboxIds)).filter(Boolean);
        const page = getSafePage(query.page);
        const pageSize = getSafePageSize(query.pageSize);

        if (mailboxIds.length === 0 && !query.includeUnmatched) {
          return {
            messages: [],
            page,
            pageSize,
            summary: { messageCount: 0, extractionCount: 0, attachmentCount: 0 },
            total: 0
          };
        }

        const bindings: unknown[] = [];
        const scopeConditions: string[] = [];

        if (mailboxIds.length > 0) {
          // D1 limits bound SQL variables; json_each keeps large mailbox scopes to one binding.
          scopeConditions.push("account_id IN (SELECT value FROM json_each(?))");
          bindings.push(JSON.stringify(mailboxIds));
        }
        if (query.includeUnmatched) {
          scopeConditions.push("account_id LIKE 'unmatched:%'");
        }

        const whereConditions = [`(${scopeConditions.join(" OR ")})`];
        const search = query.search?.trim();

        if (search) {
          const searchLike = `%${search}%`;
          whereConditions.push(
            "(to_address LIKE ? COLLATE NOCASE OR from_address LIKE ? COLLATE NOCASE OR subject LIKE ? COLLATE NOCASE OR preview_text LIKE ? COLLATE NOCASE OR body_text LIKE ? COLLATE NOCASE OR extraction_json LIKE ? COLLATE NOCASE)"
          );
          bindings.push(searchLike, searchLike, searchLike, searchLike, searchLike, searchLike);
        }

        if (query.filter === "code") {
          whereConditions.push("json_extract(extraction_json, '$.type') = 'auth_code'");
        }
        if (query.filter === "link") {
          whereConditions.push("json_extract(extraction_json, '$.type') NOT IN ('auth_code', 'none')");
        }
        if (query.filter === "attachment") {
          whereConditions.push("attachment_count > 0");
        }
        if (query.filter === "unparsed") {
          whereConditions.push("json_extract(extraction_json, '$.type') = 'none'");
        }

        const from = query.from?.trim();
        if (from) {
          whereConditions.push("from_address LIKE ? COLLATE NOCASE");
          bindings.push(`%${from}%`);
        }

        const subject = query.subject?.trim();
        if (subject) {
          whereConditions.push("subject LIKE ? COLLATE NOCASE");
          bindings.push(`%${subject}%`);
        }

        if (query.startDate) {
          whereConditions.push("received_at >= ?");
          bindings.push(query.startDate);
        }

        if (query.endDate) {
          whereConditions.push("received_at <= ?");
          bindings.push(query.endDate);
        }

        if (typeof query.hasAttachment === "boolean") {
          whereConditions.push(query.hasAttachment ? "attachment_count > 0" : "attachment_count = 0");
        }

        if (query.extractionType) {
          whereConditions.push("json_extract(extraction_json, '$.type') = ?");
          bindings.push(query.extractionType);
        }

        const whereClause = `WHERE ${whereConditions.join(" AND ")}`;
        const totalRow = await db
          .prepare(`SELECT COUNT(*) AS count FROM mail_messages ${whereClause}`)
          .bind(...bindings)
          .first<{ count: number }>();
        const summaryRow = await db
          .prepare(
            `SELECT
              COUNT(*) AS message_count,
              COALESCE(SUM(CASE WHEN json_extract(extraction_json, '$.type') <> 'none' AND trim(COALESCE(json_extract(extraction_json, '$.value'), '')) <> '' THEN 1 ELSE 0 END), 0) AS extraction_count,
              COALESCE(SUM(attachment_count), 0) AS attachment_count
            FROM mail_messages ${whereClause}`
          )
          .bind(...bindings)
          .first<{ message_count: number; extraction_count: number; attachment_count: number }>();
        const result = await db
          .prepare(`SELECT * FROM mail_messages ${whereClause} ORDER BY received_at DESC LIMIT ? OFFSET ?`)
          .bind(...bindings, pageSize, (page - 1) * pageSize)
          .all();

        return {
          messages: (result.results ?? []).map(toMessageRecord),
          page,
          pageSize,
          summary: {
            messageCount: Number(summaryRow?.message_count ?? 0),
            extractionCount: Number(summaryRow?.extraction_count ?? 0),
            attachmentCount: Number(summaryRow?.attachment_count ?? 0)
          },
          total: Number(totalRow?.count ?? 0)
        };
      },
      async listByMailbox(mailboxId) {
        const result = await db
          .prepare("SELECT * FROM mail_messages WHERE account_id = ? ORDER BY received_at DESC")
          .bind(mailboxId)
          .all();
        return (result.results ?? []).map(toMessageRecord);
      },
      async findByMailboxAndMessageId(mailboxId, messageId) {
        const row = await db
          .prepare("SELECT * FROM mail_messages WHERE account_id = ? AND message_id = ?")
          .bind(mailboxId, messageId)
          .first<any>();
        return row ? toMessageRecord(row) : null;
      },
      async listRecentByMailbox(mailboxId, sinceIso) {
        // Backed by idx_mail_messages_account_received (account_id, received_at).
        const result = await db
          .prepare("SELECT * FROM mail_messages WHERE account_id = ? AND received_at >= ? ORDER BY received_at DESC")
          .bind(mailboxId, sinceIso)
          .all();
        return (result.results ?? []).map(toMessageRecord);
      },
      async findById(id) {
        const row = await db.prepare("SELECT * FROM mail_messages WHERE id = ?").bind(id).first<any>();
        return row ? toMessageRecord(row) : null;
      },
      async listExpired(beforeIso, options) {
        // Ordered by the expiry index (see migration 0020) so the cleanup cron
        // can page through bounded batches without a full-table scan.
        const limit = options?.limit;
        const sql =
          "SELECT * FROM mail_messages WHERE expires_at <= ? ORDER BY expires_at ASC, id ASC" +
          (limit !== undefined ? " LIMIT ?" : "");
        const statement = limit !== undefined
          ? db.prepare(sql).bind(beforeIso, limit)
          : db.prepare(sql).bind(beforeIso);
        const result = await statement.all();
        return (result.results ?? []).map(toMessageRecord);
      },
      async deleteMany(ids) {
        if (ids.length === 0) return;
        for (const chunk of chunkForD1BindLimit(ids)) {
          const placeholders = chunk.map(() => "?").join(", ");
          await db.prepare(`DELETE FROM mail_messages WHERE id IN (${placeholders})`).bind(...chunk).run();
        }
      }
    },
    attachments: {
      async createMany(messageId, nextAttachments) {
        for (const attachment of nextAttachments) {
          await db
            .prepare(
              "INSERT INTO mail_attachments (id, message_id, filename, content_type, size, storage_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(
              attachment.id,
              messageId,
              attachment.filename,
              attachment.contentType,
              attachment.size,
              attachment.key,
              nowIso()
            )
            .run();
        }
      },
      async listByMessage(messageId) {
        const result = await db
          .prepare("SELECT id, filename, content_type, size, storage_key FROM mail_attachments WHERE message_id = ?")
          .bind(messageId)
          .all();
        return (result.results ?? []).map((row: any) => ({
          id: row.id,
          filename: row.filename,
          contentType: row.content_type,
          size: Number(row.size),
          key: row.storage_key
        })) as AttachmentRecord[];
      },
      async listByMessageIds(messageIds) {
        if (messageIds.length === 0) return [];
        const results: AttachmentRecord[] = [];
        for (const chunk of chunkForD1BindLimit(messageIds)) {
          const placeholders = chunk.map(() => "?").join(", ");
          const result = await db
            .prepare(`SELECT id, filename, content_type, size, storage_key FROM mail_attachments WHERE message_id IN (${placeholders})`)
            .bind(...chunk)
            .all();
          results.push(
            ...((result.results ?? []).map((row: any) => ({
              id: row.id,
              filename: row.filename,
              contentType: row.content_type,
              size: Number(row.size),
              key: row.storage_key
            })) as AttachmentRecord[])
          );
        }
        return results;
      },
      async deleteByMessageIds(messageIds) {
        if (messageIds.length === 0) return;
        for (const chunk of chunkForD1BindLimit(messageIds)) {
          const placeholders = chunk.map(() => "?").join(", ");
          await db.prepare(`DELETE FROM mail_attachments WHERE message_id IN (${placeholders})`).bind(...chunk).run();
        }
      }
    },
    outboundMessages: {
      async create(input) {
        const id = crypto.randomUUID();
        const createdAt = nowIso();
        await db
          .prepare(
            "INSERT INTO mail_outbound_messages (id, account_id, from_address, to_address, subject, body_text, status, error_text, provider_message_id, request_payload_json, response_payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(
            id,
            input.mailboxId,
            input.fromAddress,
            input.toAddress,
            input.subject,
            input.bodyText,
            input.status,
            input.errorText,
            input.providerMessageId,
            input.requestPayloadJson,
            input.responsePayloadJson,
            createdAt
          )
          .run();
        return {
          id,
          createdAt,
          ...input
        };
      },
      async listByMailbox(query) {
        const page = getSafePage(query.page);
        const pageSize = getSafePageSize(query.pageSize);
        const baseBindings: unknown[] = [query.mailboxId];
        const baseConditions = ["account_id = ?"];
        const search = query.search?.trim();

        if (search) {
          const searchLike = `%${search}%`;
          baseConditions.push(
            "(from_address LIKE ? COLLATE NOCASE OR to_address LIKE ? COLLATE NOCASE OR subject LIKE ? COLLATE NOCASE OR body_text LIKE ? COLLATE NOCASE OR error_text LIKE ? COLLATE NOCASE OR provider_message_id LIKE ? COLLATE NOCASE OR request_payload_json LIKE ? COLLATE NOCASE OR response_payload_json LIKE ? COLLATE NOCASE)"
          );
          baseBindings.push(searchLike, searchLike, searchLike, searchLike, searchLike, searchLike, searchLike, searchLike);
        }

        const filteredConditions = [...baseConditions];
        const filteredBindings = [...baseBindings];
        if (query.status === "sent" || query.status === "failed") {
          filteredConditions.push("status = ?");
          filteredBindings.push(query.status);
        }

        const baseWhereClause = `WHERE ${baseConditions.join(" AND ")}`;
        const filteredWhereClause = `WHERE ${filteredConditions.join(" AND ")}`;
        const totalRow = await db
          .prepare(`SELECT COUNT(*) AS count FROM mail_outbound_messages ${filteredWhereClause}`)
          .bind(...filteredBindings)
          .first<{ count: number }>();
        const summaryRow = await db
          .prepare(
            `SELECT
              COUNT(*) AS total_count,
              COALESCE(SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 0) AS sent_count,
              COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed_count
            FROM mail_outbound_messages ${baseWhereClause}`
          )
          .bind(...baseBindings)
          .first<{ total_count: number; sent_count: number; failed_count: number }>();
        const result = await db
          .prepare(`SELECT * FROM mail_outbound_messages ${filteredWhereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
          .bind(...filteredBindings, pageSize, (page - 1) * pageSize)
          .all();

        return {
          messages: (result.results ?? []).map(toOutboundMessageRecord),
          page,
          pageSize,
          summary: {
            totalCount: Number(summaryRow?.total_count ?? 0),
            sentCount: Number(summaryRow?.sent_count ?? 0),
            failedCount: Number(summaryRow?.failed_count ?? 0)
          },
          total: Number(totalRow?.count ?? 0)
        };
      },
      async summarizeByMailboxes(query: OutboundMessageUsageQuery): Promise<OutboundMessageUsageSummary> {
        const mailboxIds = Array.from(new Set(query.mailboxIds)).filter(Boolean);
        if (mailboxIds.length === 0) {
          return {
            totalCount: 0,
            sentCount: 0,
            failedCount: 0,
            sentSinceCount: 0
          };
        }

        const sentSinceExpression = query.sinceIso
          ? "COALESCE(SUM(CASE WHEN status = 'sent' AND created_at >= ? THEN 1 ELSE 0 END), 0)"
          : "COALESCE(SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 0)";
        const bindings: unknown[] = query.sinceIso
          ? [query.sinceIso, JSON.stringify(mailboxIds)]
          : [JSON.stringify(mailboxIds)];
        // Admin summaries only need counts; materializing outbound bodies makes this request grow with mailbox history.
        const row = await db
          .prepare(
            `SELECT
              COUNT(*) AS total_count,
              COALESCE(SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 0) AS sent_count,
              COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed_count,
              ${sentSinceExpression} AS sent_since_count
            FROM mail_outbound_messages
            WHERE account_id IN (SELECT value FROM json_each(?))`
          )
          .bind(...bindings)
          .first<{ total_count: number; sent_count: number; failed_count: number; sent_since_count: number }>();

        return {
          totalCount: Number(row?.total_count ?? 0),
          sentCount: Number(row?.sent_count ?? 0),
          failedCount: Number(row?.failed_count ?? 0),
          sentSinceCount: Number(row?.sent_since_count ?? 0)
        };
      },
      async findById(id) {
        const row = await db.prepare("SELECT * FROM mail_outbound_messages WHERE id = ?").bind(id).first<any>();
        return row ? toOutboundMessageRecord(row) : null;
      }
    }
  };
}
