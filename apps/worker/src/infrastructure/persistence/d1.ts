import type { MailDomainSummary, UserRole } from "@wemail/shared";

import type { AppStore, AttachmentRecord, QuotaRecord } from "../../core/bindings";

function nowIso() {
  return new Date().toISOString();
}

function toBool(value: unknown) {
  return value === 1 || value === "1" || value === true;
}

function parseJson<T>(value: string | null | undefined, fallback: T) {
  if (!value) return fallback;
  return JSON.parse(value) as T;
}

function parseAllowedRoles(value: string | null | undefined): UserRole[] {
  const roles = parseJson<unknown[]>(value, []);
  return roles.filter((role): role is UserRole => role === "admin" || role === "member");
}

export function createD1Store(db: D1Database): AppStore {
  return {
    users: {
      async count() {
        const result = await db.prepare("SELECT count(*) AS count FROM users").first<{ count: number }>();
        return result?.count ?? 0;
      },
      async findByEmail(email) {
        const row = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<any>();
        return row
          ? { id: row.id, email: row.email, passwordHash: row.password_hash, role: row.role, createdAt: row.created_at }
          : null;
      },
      async findById(id) {
        const row = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<any>();
        return row
          ? { id: row.id, email: row.email, passwordHash: row.password_hash, role: row.role, createdAt: row.created_at }
          : null;
      },
      async create(input) {
        const id = crypto.randomUUID();
        const createdAt = nowIso();
        await db
          .prepare("INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)")
          .bind(id, input.email, input.passwordHash, input.role, createdAt)
          .run();
        return { id, email: input.email, passwordHash: input.passwordHash, role: input.role, createdAt };
      },
      async updateRole(id, role) {
        await db.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, id).run();
        return this.findById(id);
      },
      async list() {
        const result = await db.prepare("SELECT * FROM users ORDER BY email ASC").all();
        return (result.results ?? []).map((row: any) => ({
          id: row.id,
          email: row.email,
          passwordHash: row.password_hash,
          role: row.role,
          createdAt: row.created_at
        }));
      }
    },
    sessions: {
      async create(input) {
        const id = `${crypto.randomUUID()}-${Math.random().toString(36).slice(2, 10)}`;
        const createdAt = nowIso();
        await db
          .prepare("INSERT INTO auth_sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
          .bind(id, input.userId, input.expiresAt, createdAt)
          .run();
        return { id, userId: input.userId, expiresAt: input.expiresAt, createdAt };
      },
      async findById(id) {
        const row = await db.prepare("SELECT * FROM auth_sessions WHERE id = ?").bind(id).first<any>();
        return row ? { id: row.id, userId: row.user_id, expiresAt: row.expires_at, createdAt: row.created_at } : null;
      },
      async delete(id) {
        await db.prepare("DELETE FROM auth_sessions WHERE id = ?").bind(id).run();
      }
    },
    invites: {
      async create(input) {
        const id = crypto.randomUUID();
        const createdAt = nowIso();
        await db
          .prepare(
            "INSERT INTO user_invites (id, code, created_by_user_id, redeemed_by_user_id, redeemed_at, disabled_at, created_at) VALUES (?, ?, ?, NULL, NULL, NULL, ?)"
          )
          .bind(id, input.code, input.createdByUserId, createdAt)
          .run();
        return {
          id,
          code: input.code,
          createdByUserId: input.createdByUserId,
          redeemedByUserId: null,
          redeemedAt: null,
          disabledAt: null,
          createdAt
        };
      },
      async findByCode(code) {
        const row = await db.prepare("SELECT * FROM user_invites WHERE code = ?").bind(code).first<any>();
        return row
          ? {
              id: row.id,
              code: row.code,
              createdByUserId: row.created_by_user_id,
              redeemedByUserId: row.redeemed_by_user_id,
              redeemedAt: row.redeemed_at,
              disabledAt: row.disabled_at,
              createdAt: row.created_at
            }
          : null;
      },
      async redeem(code, userId) {
        const redeemedAt = nowIso();
        await db
          .prepare("UPDATE user_invites SET redeemed_by_user_id = ?, redeemed_at = ? WHERE code = ?")
          .bind(userId, redeemedAt, code)
          .run();
        return (await this.findByCode(code))!;
      },
      async list() {
        const result = await db.prepare("SELECT * FROM user_invites ORDER BY created_at DESC").all();
        return (result.results ?? []).map((row: any) => ({
          id: row.id,
          code: row.code,
          createdByUserId: row.created_by_user_id,
          redeemedByUserId: row.redeemed_by_user_id,
          redeemedAt: row.redeemed_at,
          disabledAt: row.disabled_at,
          createdAt: row.created_at
        }));
      },
      async disable(id) {
        await db.prepare("UPDATE user_invites SET disabled_at = ? WHERE id = ?").bind(nowIso(), id).run();
      }
    },
    mailboxes: {
      async countByUser(userId) {
        const result = await db
          .prepare("SELECT count(*) AS count FROM accounts WHERE user_id = ?")
          .bind(userId)
          .first<{ count: number }>();
        return result?.count ?? 0;
      },
      async create(input) {
        const id = crypto.randomUUID();
        const createdAt = nowIso();
        await db
          .prepare("INSERT INTO accounts (id, user_id, address, label, created_at) VALUES (?, ?, ?, ?, ?)")
          .bind(id, input.userId, input.address, input.label, createdAt)
          .run();
        return { id, userId: input.userId, address: input.address, label: input.label, createdAt };
      },
      async listByUser(userId) {
        const result = await db.prepare("SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC").bind(userId).all();
        return (result.results ?? []).map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          address: row.address,
          label: row.label,
          createdAt: row.created_at
        }));
      },
      async listAll() {
        const result = await db.prepare("SELECT * FROM accounts ORDER BY created_at DESC").all();
        return (result.results ?? []).map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          address: row.address,
          label: row.label,
          createdAt: row.created_at
        }));
      },
      async findById(id) {
        const row = await db.prepare("SELECT * FROM accounts WHERE id = ?").bind(id).first<any>();
        return row
          ? { id: row.id, userId: row.user_id, address: row.address, label: row.label, createdAt: row.created_at }
          : null;
      },
      async findByAddress(address) {
        const row = await db.prepare("SELECT * FROM accounts WHERE address = ?").bind(address).first<any>();
        return row
          ? { id: row.id, userId: row.user_id, address: row.address, label: row.label, createdAt: row.created_at }
          : null;
      },
      async delete(id) {
        await db.prepare("DELETE FROM accounts WHERE id = ?").bind(id).run();
      }
    },
    messages: {
      async create(input) {
        const id = crypto.randomUUID();
        await db
          .prepare(
            "INSERT INTO mail_messages (id, account_id, from_address, subject, preview_text, body_text, extraction_json, oversize_status, attachment_count, received_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(
            id,
            input.mailboxId,
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
        return { id, ...input };
      },
      async listByMailbox(mailboxId) {
        const result = await db
          .prepare("SELECT * FROM mail_messages WHERE account_id = ? ORDER BY received_at DESC")
          .bind(mailboxId)
          .all();
        return (result.results ?? []).map((row: any) => ({
          id: row.id,
          mailboxId: row.account_id,
          fromAddress: row.from_address,
          subject: row.subject,
          previewText: row.preview_text,
          bodyText: row.body_text,
          extractionJson: row.extraction_json,
          oversizeStatus: row.oversize_status,
          attachmentCount: Number(row.attachment_count),
          receivedAt: row.received_at,
          expiresAt: row.expires_at
        }));
      },
      async findById(id) {
        const row = await db.prepare("SELECT * FROM mail_messages WHERE id = ?").bind(id).first<any>();
        return row
          ? {
              id: row.id,
              mailboxId: row.account_id,
              fromAddress: row.from_address,
              subject: row.subject,
              previewText: row.preview_text,
              bodyText: row.body_text,
              extractionJson: row.extraction_json,
              oversizeStatus: row.oversize_status,
              attachmentCount: Number(row.attachment_count),
              receivedAt: row.received_at,
              expiresAt: row.expires_at
            }
          : null;
      },
      async listExpired(beforeIso) {
        const result = await db.prepare("SELECT * FROM mail_messages WHERE expires_at <= ?").bind(beforeIso).all();
        return (result.results ?? []).map((row: any) => ({
          id: row.id,
          mailboxId: row.account_id,
          fromAddress: row.from_address,
          subject: row.subject,
          previewText: row.preview_text,
          bodyText: row.body_text,
          extractionJson: row.extraction_json,
          oversizeStatus: row.oversize_status,
          attachmentCount: Number(row.attachment_count),
          receivedAt: row.received_at,
          expiresAt: row.expires_at
        }));
      },
      async deleteMany(ids) {
        if (ids.length === 0) return;
        const placeholders = ids.map(() => "?").join(", ");
        await db.prepare(`DELETE FROM mail_messages WHERE id IN (${placeholders})`).bind(...ids).run();
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
        const placeholders = messageIds.map(() => "?").join(", ");
        const result = await db
          .prepare(`SELECT id, filename, content_type, size, storage_key FROM mail_attachments WHERE message_id IN (${placeholders})`)
          .bind(...messageIds)
          .all();
        return (result.results ?? []).map((row: any) => ({
          id: row.id,
          filename: row.filename,
          contentType: row.content_type,
          size: Number(row.size),
          key: row.storage_key
        })) as AttachmentRecord[];
      },
      async deleteByMessageIds(messageIds) {
        if (messageIds.length === 0) return;
        const placeholders = messageIds.map(() => "?").join(", ");
        await db.prepare(`DELETE FROM mail_attachments WHERE message_id IN (${placeholders})`).bind(...messageIds).run();
      }
    },
    outboundMessages: {
      async create(input) {
        await db
          .prepare(
            "INSERT INTO mail_outbound_messages (id, account_id, to_address, subject, status, error_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(
            crypto.randomUUID(),
            input.mailboxId,
            input.toAddress,
            input.subject,
            input.status,
            input.errorText,
            nowIso()
          )
          .run();
      },
      async listByMailbox(mailboxId) {
        const result = await db
          .prepare("SELECT * FROM mail_outbound_messages WHERE account_id = ? ORDER BY created_at DESC")
          .bind(mailboxId)
          .all();
        return (result.results ?? []).map((row: any) => ({
          id: row.id,
          mailboxId: row.account_id,
          toAddress: row.to_address,
          subject: row.subject,
          status: row.status,
          errorText: row.error_text,
          createdAt: row.created_at
        }));
      }
    },
    apiKeys: {
      async create(input) {
        const record = {
          id: crypto.randomUUID(),
          userId: input.userId,
          label: input.label,
          prefix: input.prefix,
          keyHash: input.keyHash,
          createdAt: nowIso(),
          lastUsedAt: null,
          revokedAt: null
        };
        await db
          .prepare(
            "INSERT INTO api_keys (id, user_id, label, prefix, key_hash, created_at, last_used_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)"
          )
          .bind(record.id, record.userId, record.label, record.prefix, record.keyHash, record.createdAt)
          .run();
        return record;
      },
      async listByUser(userId) {
        const result = await db.prepare("SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC").bind(userId).all();
        return (result.results ?? []).map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          label: row.label,
          prefix: row.prefix,
          keyHash: row.key_hash,
          createdAt: row.created_at,
          lastUsedAt: row.last_used_at,
          revokedAt: row.revoked_at
        }));
      },
      async findActiveByHash(hash) {
        const row = await db
          .prepare("SELECT * FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL")
          .bind(hash)
          .first<any>();
        return row
          ? {
              id: row.id,
              userId: row.user_id,
              label: row.label,
              prefix: row.prefix,
              keyHash: row.key_hash,
              createdAt: row.created_at,
              lastUsedAt: row.last_used_at,
              revokedAt: row.revoked_at
            }
          : null;
      },
      async touch(id) {
        await db.prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?").bind(nowIso(), id).run();
      },
      async revoke(id, userId) {
        await db.prepare("UPDATE api_keys SET revoked_at = ? WHERE id = ? AND user_id = ?").bind(nowIso(), id, userId).run();
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
      }
    },
    quotas: {
      async getByUserId(userId, fallbackLimit) {
        const row = await db.prepare("SELECT * FROM user_send_quotas WHERE user_id = ?").bind(userId).first<any>();
        if (!row) {
          const next: QuotaRecord = {
            userId,
            dailyLimit: fallbackLimit,
            sendsToday: 0,
            disabled: false,
            updatedAt: nowIso()
          };
          await db
            .prepare("INSERT INTO user_send_quotas (user_id, daily_limit, sends_today, disabled, updated_at) VALUES (?, ?, ?, ?, ?)")
            .bind(userId, next.dailyLimit, next.sendsToday, 0, next.updatedAt)
            .run();
          return next;
        }
        return {
          userId: row.user_id,
          dailyLimit: Number(row.daily_limit),
          sendsToday: Number(row.sends_today),
          disabled: toBool(row.disabled),
          updatedAt: row.updated_at
        };
      },
      async save(quota) {
        await db
          .prepare(
            "INSERT OR REPLACE INTO user_send_quotas (user_id, daily_limit, sends_today, disabled, updated_at) VALUES (?, ?, ?, ?, ?)"
          )
          .bind(quota.userId, quota.dailyLimit, quota.sendsToday, quota.disabled ? 1 : 0, quota.updatedAt)
          .run();
      }
    },
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
      async delete(id, userId) {
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
          createdAt: row.created_at
        }));
      },
      async record(input) {
        const record = { id: crypto.randomUUID(), createdAt: nowIso(), ...input };
        await db
          .prepare(
            "INSERT INTO webhook_deliveries (id, endpoint_id, event_type, status, status_code, duration_ms, error_text, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
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
            record.createdAt
          )
          .run();
        return record;
      }
    },
    announcements: {
      async list() {
        const result = await db.prepare("SELECT * FROM announcements ORDER BY published_at DESC").all();
        return (result.results ?? []).map((row: any) => ({
          id: row.id,
          title: row.title,
          summary: row.summary,
          type: row.type,
          status: row.status,
          audience: row.audience,
          priority: row.priority,
          authorUserId: row.author_user_id,
          authorLabel: row.author_label,
          tagsJson: row.tags_json,
          pinned: toBool(row.pinned),
          startAt: row.start_at,
          endAt: row.end_at,
          publishedAt: row.published_at,
          updatedAt: row.updated_at
        }));
      },
      async create(input) {
        const now = nowIso();
        const record = { id: crypto.randomUUID(), publishedAt: now, updatedAt: now, ...input };
        await db
          .prepare(
            "INSERT INTO announcements (id, title, summary, type, status, audience, priority, author_user_id, author_label, tags_json, pinned, start_at, end_at, published_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(
            record.id,
            record.title,
            record.summary,
            record.type,
            record.status,
            record.audience,
            record.priority,
            record.authorUserId,
            record.authorLabel,
            record.tagsJson,
            record.pinned ? 1 : 0,
            record.startAt,
            record.endAt,
            record.publishedAt,
            record.updatedAt
          )
          .run();
        return record;
      }
    }
  };
}
