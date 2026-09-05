import type { D1Database } from "@cloudflare/workers-types";
import type { AppStore } from "../../../core/bindings";
import {
  toApiKeyRecord,
  toInviteRecord,
  toOAuthIdentityRecord,
  toOAuthPendingLoginRecord,
  toOAuthStateRecord,
  toSessionRecord,
  toUserPreferencesRecord,
  toUserRecord
} from "./row-mappers";
import { nowIso } from "./shared";

type UsersAggregate = Pick<AppStore, "users" | "userPreferences" | "sessions" | "oauthStates" | "oauthPendingLogins" | "oauthIdentities" | "invites" | "apiKeys">;

export function createUsersAggregate(db: D1Database): UsersAggregate {
  return {
    users: {
      async count() {
        const result = await db.prepare("SELECT count(*) AS count FROM users").first<{ count: number }>();
        return result?.count ?? 0;
      },
      async countActiveByRole(role) {
        const statement = role
          ? db.prepare("SELECT count(*) AS count FROM users WHERE status = 'active' AND role = ?").bind(role)
          : db.prepare("SELECT count(*) AS count FROM users WHERE status = 'active'");
        const result = await statement.first<{ count: number }>();
        return result?.count ?? 0;
      },
      async findByEmail(email) {
        const row = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<any>();
        return row ? toUserRecord(row) : null;
      },
      async findById(id) {
        const row = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<any>();
        return row ? toUserRecord(row) : null;
      },
      async create(input) {
        const id = crypto.randomUUID();
        const createdAt = nowIso();
        await db
          .prepare(
            "INSERT INTO users (id, email, name, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)"
          )
          .bind(id, input.email, input.name, input.passwordHash, input.role, createdAt, createdAt)
          .run();
        return {
          id,
          email: input.email,
          name: input.name,
          passwordHash: input.passwordHash,
          role: input.role,
          status: "active",
          createdAt,
          updatedAt: createdAt
        };
      },
      async updateProfile(id, input) {
        await db.prepare("UPDATE users SET name = ?, updated_at = ? WHERE id = ?").bind(input.name, nowIso(), id).run();
        return this.findById(id);
      },
      async updateRole(id, role) {
        await db.prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?").bind(role, nowIso(), id).run();
        return this.findById(id);
      },
      async updatePasswordHash(id, passwordHash) {
        await db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").bind(passwordHash, nowIso(), id).run();
        return this.findById(id);
      },
      async updateStatus(id, status) {
        await db.prepare("UPDATE users SET status = ?, updated_at = ? WHERE id = ?").bind(status, nowIso(), id).run();
        return this.findById(id);
      },
      async delete(id) {
        const existing = await this.findById(id);
        if (!existing) return false;
        await db.prepare("DELETE FROM auth_sessions WHERE user_id = ?").bind(id).run();
        await db.prepare("DELETE FROM oauth_identities WHERE user_id = ?").bind(id).run();
        await db.prepare("DELETE FROM user_send_quotas WHERE user_id = ?").bind(id).run();
        await db.prepare("DELETE FROM api_keys WHERE user_id = ?").bind(id).run();
        await db.prepare("DELETE FROM telegram_subscriptions WHERE user_id = ?").bind(id).run();
        await db.prepare("DELETE FROM user_preferences WHERE user_id = ?").bind(id).run();
        await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
        return true;
      },
      async list(options) {
        const whereParts: string[] = [];
        const bindings: Array<string | number> = [];
        const normalizedSearch = options.search?.toLowerCase();

        if (normalizedSearch) {
          whereParts.push("(lower(email) LIKE ? OR lower(name) LIKE ?)");
          bindings.push(`%${normalizedSearch}%`, `%${normalizedSearch}%`);
        }
        if (options.role) {
          whereParts.push("role = ?");
          bindings.push(options.role);
        }
        if (options.status) {
          whereParts.push("status = ?");
          bindings.push(options.status);
        }

        const whereSql = whereParts.length > 0 ? ` WHERE ${whereParts.join(" AND ")}` : "";
        const totalRow = await db
          .prepare(`SELECT count(*) AS count FROM users${whereSql}`)
          .bind(...bindings)
          .first<{ count: number }>();
        const result = await db
          .prepare(`SELECT * FROM users${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
          .bind(...bindings, options.pageSize, (options.page - 1) * options.pageSize)
          .all();

        return {
          users: (result.results ?? []).map(toUserRecord),
          total: totalRow?.count ?? 0,
          page: options.page,
          pageSize: options.pageSize
        };
      },
      async summary() {
        const row = await db
          .prepare(
            "SELECT count(*) AS total, sum(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active FROM users"
          )
          .first<{ active: number | null; total: number }>();
        return {
          active: row?.active ?? 0,
          total: row?.total ?? 0
        };
      }
    },
    userPreferences: {
      async getByUserId(userId) {
        const row = await db.prepare("SELECT * FROM user_preferences WHERE user_id = ?").bind(userId).first<any>();
        return row ? toUserPreferencesRecord(row) : null;
      },
      async save(record) {
        const updatedAt = nowIso();
        await db
          .prepare(
            "INSERT OR REPLACE INTO user_preferences (user_id, bio, locale, timezone, date_format, landing_page, density, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(
            record.userId,
            record.bio,
            record.locale,
            record.timezone,
            record.dateFormat,
            record.landingPage,
            record.density,
            updatedAt
          )
          .run();
        return {
          ...record,
          updatedAt
        };
      }
    },
    sessions: {
      async create(input) {
        const id = `${crypto.randomUUID()}-${Math.random().toString(36).slice(2, 10)}`;
        const createdAt = nowIso();
        await db
          .prepare(
            "INSERT INTO auth_sessions (id, user_id, user_agent, ip_address, expires_at, last_seen_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(id, input.userId, input.userAgent ?? null, input.ipAddress ?? null, input.expiresAt, createdAt, createdAt)
          .run();
        return {
          id,
          userId: input.userId,
          userAgent: input.userAgent ?? null,
          ipAddress: input.ipAddress ?? null,
          expiresAt: input.expiresAt,
          lastSeenAt: createdAt,
          createdAt
        };
      },
      async findById(id) {
        const row = await db.prepare("SELECT * FROM auth_sessions WHERE id = ?").bind(id).first<any>();
        return row ? toSessionRecord(row) : null;
      },
      async listByUser(userId) {
        const result = await db
          .prepare("SELECT * FROM auth_sessions WHERE user_id = ? ORDER BY COALESCE(last_seen_at, created_at) DESC, created_at DESC")
          .bind(userId)
          .all();
        return (result.results ?? []).map(toSessionRecord);
      },
      async touch(id, input = {}) {
        const lastSeenAt = nowIso();
        await db
          .prepare(
            `
              UPDATE auth_sessions
              SET
                last_seen_at = ?,
                user_agent = COALESCE(?, user_agent),
                ip_address = COALESCE(?, ip_address)
              WHERE id = ?
            `
          )
          .bind(lastSeenAt, input.userAgent ?? null, input.ipAddress ?? null, id)
          .run();
      },
      async delete(id) {
        await db.prepare("DELETE FROM auth_sessions WHERE id = ?").bind(id).run();
      },
      async deleteByUserId(userId) {
        await db.prepare("DELETE FROM auth_sessions WHERE user_id = ?").bind(userId).run();
      },
      async deleteByUserIdExcept(userId, keepSessionId) {
        await db.prepare("DELETE FROM auth_sessions WHERE user_id = ? AND id != ?").bind(userId, keepSessionId).run();
      }
    },
    oauthStates: {
      async create(input) {
        const id = `${crypto.randomUUID()}-${Math.random().toString(36).slice(2, 10)}`;
        const createdAt = nowIso();
        await db
          .prepare("INSERT INTO oauth_states (id, provider, redirect_to, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
          .bind(id, input.provider, input.redirectTo, input.expiresAt, createdAt)
          .run();
        return { id, provider: input.provider, redirectTo: input.redirectTo, expiresAt: input.expiresAt, createdAt };
      },
      async consume(id) {
        const row = await db.prepare("SELECT * FROM oauth_states WHERE id = ?").bind(id).first<any>();
        await db.prepare("DELETE FROM oauth_states WHERE id = ?").bind(id).run();
        if (!row) return null;
        const record = toOAuthStateRecord(row);
        return new Date(record.expiresAt) > new Date() ? record : null;
      }
    },
    oauthPendingLogins: {
      async create(input) {
        const id = `${crypto.randomUUID()}-${Math.random().toString(36).slice(2, 10)}`;
        const createdAt = nowIso();
        await db
          .prepare(
            "INSERT INTO oauth_pending_logins (id, provider, provider_user_id, provider_email, provider_name, provider_login, redirect_to, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(
            id,
            input.provider,
            input.providerUserId,
            input.providerEmail,
            input.providerName,
            input.providerLogin,
            input.redirectTo,
            input.expiresAt,
            createdAt
          )
          .run();
        return { id, ...input, createdAt };
      },
      async findById(id) {
        const row = await db.prepare("SELECT * FROM oauth_pending_logins WHERE id = ?").bind(id).first<any>();
        if (!row) return null;
        const record = toOAuthPendingLoginRecord(row);
        if (new Date(record.expiresAt) > new Date()) return record;
        await db.prepare("DELETE FROM oauth_pending_logins WHERE id = ?").bind(id).run();
        return null;
      },
      async consume(id) {
        const row = await db.prepare("SELECT * FROM oauth_pending_logins WHERE id = ?").bind(id).first<any>();
        await db.prepare("DELETE FROM oauth_pending_logins WHERE id = ?").bind(id).run();
        if (!row) return null;
        const record = toOAuthPendingLoginRecord(row);
        return new Date(record.expiresAt) > new Date() ? record : null;
      }
    },
    oauthIdentities: {
      async findByProviderUser(provider, providerUserId) {
        const row = await db
          .prepare("SELECT * FROM oauth_identities WHERE provider = ? AND provider_user_id = ?")
          .bind(provider, providerUserId)
          .first<any>();
        return row ? toOAuthIdentityRecord(row) : null;
      },
      async upsert(input) {
        const existing = await this.findByProviderUser(input.provider, input.providerUserId);
        const updatedAt = nowIso();
        if (existing) {
          await db
            .prepare(
              "UPDATE oauth_identities SET user_id = ?, provider_email = ?, provider_login = ?, updated_at = ? WHERE id = ?"
            )
            .bind(input.userId, input.providerEmail, input.providerLogin, updatedAt, existing.id)
            .run();
          return { ...existing, userId: input.userId, providerEmail: input.providerEmail, providerLogin: input.providerLogin, updatedAt };
        }

        const id = crypto.randomUUID();
        await db
          .prepare(
            "INSERT INTO oauth_identities (id, user_id, provider, provider_user_id, provider_email, provider_login, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(id, input.userId, input.provider, input.providerUserId, input.providerEmail, input.providerLogin, updatedAt, updatedAt)
          .run();
        return { id, ...input, createdAt: updatedAt, updatedAt };
      },
      async deleteByUserId(userId) {
        await db.prepare("DELETE FROM oauth_identities WHERE user_id = ?").bind(userId).run();
      }
    },
    invites: {
      async create(input) {
        const id = crypto.randomUUID();
        const createdAt = nowIso();
        const targetRole = input.targetRole ?? "member";
        const maxRedemptions = input.maxRedemptions ?? 1;
        await db
          .prepare(
            "INSERT INTO user_invites (id, code, created_by_user_id, redeemed_by_user_id, redeemed_at, disabled_at, expires_at, target_role, max_redemptions, redemption_count, created_at) VALUES (?, ?, ?, NULL, NULL, NULL, ?, ?, ?, 0, ?)"
          )
          .bind(id, input.code, input.createdByUserId, input.expiresAt ?? null, targetRole, maxRedemptions, createdAt)
          .run();
        return {
          id,
          code: input.code,
          createdByUserId: input.createdByUserId,
          redeemedByUserId: null,
          redeemedAt: null,
          disabledAt: null,
          expiresAt: input.expiresAt ?? null,
          targetRole,
          maxRedemptions,
          redemptionCount: 0,
          createdAt
        };
      },
      async findByCode(code) {
        const row = await db.prepare("SELECT * FROM user_invites WHERE code = ?").bind(code).first<any>();
        return row ? toInviteRecord(row) : null;
      },
      async findById(id) {
        const row = await db.prepare("SELECT * FROM user_invites WHERE id = ?").bind(id).first<any>();
        return row ? toInviteRecord(row) : null;
      },
      async redeem(code, userId) {
        const redeemedAt = nowIso();
        await db
          .prepare(
            "UPDATE user_invites SET redeemed_by_user_id = ?, redeemed_at = ?, redemption_count = redemption_count + 1 WHERE code = ? AND redemption_count < max_redemptions"
          )
          .bind(userId, redeemedAt, code)
          .run();
        return (await this.findByCode(code))!;
      },
      async list() {
        const result = await db.prepare("SELECT * FROM user_invites ORDER BY created_at DESC").all();
        return (result.results ?? []).map(toInviteRecord);
      },
      async listPage(options) {
        const totalRow = await db.prepare("SELECT count(*) AS count FROM user_invites").first<{ count: number }>();
        const availableRow = await db
          .prepare(
            "SELECT count(*) AS count FROM user_invites WHERE redemption_count < max_redemptions AND disabled_at IS NULL AND (expires_at IS NULL OR expires_at > ?)"
          )
          .bind(nowIso())
          .first<{ count: number }>();
        const result = await db
          .prepare(
            `SELECT user_invites.*, users.name AS redeemed_by_user_name, users.email AS redeemed_by_user_email
             FROM user_invites
             LEFT JOIN users ON users.id = user_invites.redeemed_by_user_id
             ORDER BY user_invites.created_at DESC
             LIMIT ? OFFSET ?`
          )
          .bind(options.pageSize, (options.page - 1) * options.pageSize)
          .all();

        return {
          available: availableRow?.count ?? 0,
          invites: (result.results ?? []).map(toInviteRecord),
          page: options.page,
          pageSize: options.pageSize,
          total: totalRow?.count ?? 0
        };
      },
      async disable(id) {
        await db.prepare("UPDATE user_invites SET disabled_at = ? WHERE id = ?").bind(nowIso(), id).run();
      }
    },
    apiKeys: {
      async create(input) {
        const record = {
          id: crypto.randomUUID(),
          userId: input.userId,
          label: input.label,
          prefix: input.prefix,
          scopes: input.scopes,
          keyHash: input.keyHash,
          createdAt: nowIso(),
          lastUsedAt: null,
          revokedAt: null
        };
        await db
          .prepare(
            "INSERT INTO api_keys (id, user_id, label, prefix, scopes_json, key_hash, created_at, last_used_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)"
          )
          .bind(record.id, record.userId, record.label, record.prefix, JSON.stringify(record.scopes), record.keyHash, record.createdAt)
          .run();
        return record;
      },
      async listByUser(userId) {
        const result = await db.prepare("SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC").bind(userId).all();
        return (result.results ?? []).map(toApiKeyRecord);
      },
      async listAll() {
        const result = await db.prepare("SELECT * FROM api_keys ORDER BY created_at DESC, id DESC").all();
        return (result.results ?? []).map(toApiKeyRecord);
      },
      async findActiveByHash(hash) {
        const row = await db
          .prepare("SELECT * FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL")
          .bind(hash)
          .first<any>();
        return row ? toApiKeyRecord(row) : null;
      },
      async touch(id) {
        await db.prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?").bind(nowIso(), id).run();
      },
      async revoke(id, userId) {
        await db.prepare("UPDATE api_keys SET revoked_at = ? WHERE id = ? AND user_id = ?").bind(nowIso(), id, userId).run();
      }
    }
  };
}
