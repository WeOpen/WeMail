import type {
  AnnouncementRecord,
  AnnouncementReceiptRecord,
  NotificationRuleRecord,
  OAuthIdentityRecord,
  OAuthPendingLoginRecord,
  OAuthStateRecord,
  OutboundMessageRecord,
  PersistedMessageRecord,
  SessionRecord,
  UserPreferencesRecord
} from "../../../core/bindings";
import { parseApiKeyScopes, parseJson, toBool } from "./shared";
import type { DictionaryGroupSummary, DictionaryItemSummary, UserStatus } from "@wemail/shared";
import type { MailboxDetailRecord, UserRecord, InviteRecord } from "../../../core/bindings";

export function parseOAuthProvider(value: unknown) {
  return value === "linuxdo" ? "linuxdo" : "github";
}

export function parseUserStatus(value: unknown): UserStatus {
  return value === "disabled" || value === "outbound_disabled" ? "disabled" : "active";
}

export function parseUserRole(value: unknown) {
  return value === "admin" ? "admin" : "member";
}


export function toOAuthIdentityRecord(row: any): OAuthIdentityRecord {
  return {
    id: row.id,
    userId: row.user_id,
    provider: parseOAuthProvider(row.provider),
    providerUserId: row.provider_user_id,
    providerEmail: row.provider_email,
    providerLogin: row.provider_login ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toOAuthStateRecord(row: any): OAuthStateRecord {
  return {
    id: row.id,
    provider: parseOAuthProvider(row.provider),
    redirectTo: row.redirect_to,
    expiresAt: row.expires_at,
    createdAt: row.created_at
  };
}

export function toOAuthPendingLoginRecord(row: any): OAuthPendingLoginRecord {
  return {
    id: row.id,
    provider: parseOAuthProvider(row.provider),
    providerUserId: row.provider_user_id,
    providerEmail: row.provider_email,
    providerName: row.provider_name,
    providerLogin: row.provider_login ?? null,
    redirectTo: row.redirect_to,
    expiresAt: row.expires_at,
    createdAt: row.created_at
  };
}



export function toMessageRecord(row: any): PersistedMessageRecord {
  return {
    id: row.id,
    mailboxId: row.account_id,
    toAddress: row.to_address ?? null,
    fromAddress: row.from_address,
    subject: row.subject,
    previewText: row.preview_text,
    bodyText: row.body_text,
    extractionJson: row.extraction_json,
    oversizeStatus: row.oversize_status,
    attachmentCount: Number(row.attachment_count),
    receivedAt: row.received_at,
    expiresAt: row.expires_at
  };
}

export function toNotificationRuleRecord(row: any): NotificationRuleRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    enabled: Boolean(row.enabled),
    target: row.target,
    targetId: row.target_id ?? null,
    eventTypesJson: row.event_types_json,
    mailboxIdsJson: row.mailbox_ids_json,
    keyword: row.keyword,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toAnnouncementRecord(row: any): AnnouncementRecord {
  return {
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
  };
}

export function toAnnouncementReceiptRecord(row: any): AnnouncementReceiptRecord {
  return {
    announcementId: row.announcement_id,
    userId: row.user_id,
    acknowledgedAt: row.acknowledged_at
  };
}

export function toOutboundMessageRecord(row: any): OutboundMessageRecord {
  return {
    id: row.id,
    mailboxId: row.account_id,
    fromAddress: row.from_address ?? "",
    toAddress: row.to_address,
    subject: row.subject,
    bodyText: row.body_text ?? "",
    status: row.status === "failed" ? "failed" : "sent",
    errorText: row.error_text,
    providerMessageId: row.provider_message_id ?? null,
    requestPayloadJson: row.request_payload_json ?? "{}",
    responsePayloadJson: row.response_payload_json ?? null,
    createdAt: row.created_at
  };
}

export function toUserRecord(row: any): UserRecord {
  const email = String(row.email);
  return {
    id: row.id,
    email,
    name: row.name || email.split("@")[0] || email,
    passwordHash: row.password_hash,
    role: row.role,
    status: parseUserStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at
  };
}

export function toUserPreferencesRecord(row: any): UserPreferencesRecord {
  return {
    userId: row.user_id,
    bio: row.bio || "",
    locale: row.locale || "zh-CN",
    timezone: row.timezone || "Asia/Shanghai",
    dateFormat: row.date_format || "yyyy-mm-dd",
    landingPage: row.landing_page || "/dashboard",
    density: row.density || "comfortable",
    updatedAt: row.updated_at
  };
}

export function toSessionRecord(row: any): SessionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    userAgent: row.user_agent ?? null,
    ipAddress: row.ip_address ?? null,
    expiresAt: row.expires_at,
    lastSeenAt: row.last_seen_at ?? row.created_at,
    createdAt: row.created_at
  };
}

export function toInviteRecord(row: any): InviteRecord {
  return {
    id: row.id,
    code: row.code,
    createdByUserId: row.created_by_user_id,
    redeemedByUserId: row.redeemed_by_user_id,
    redeemedByUserName: row.redeemed_by_user_name || row.redeemed_by_user_email || null,
    redeemedAt: row.redeemed_at,
    disabledAt: row.disabled_at,
    expiresAt: row.expires_at ?? null,
    targetRole: parseUserRole(row.target_role),
    maxRedemptions: Number(row.max_redemptions ?? 1),
    redemptionCount: Number(row.redemption_count ?? (row.redeemed_at ? 1 : 0)),
    createdAt: row.created_at
  };
}

export function toApiKeyRecord(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    prefix: row.prefix,
    scopes: parseApiKeyScopes(row.scopes_json),
    keyHash: row.key_hash,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at
  };
}

export function toMailboxRecord(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    address: row.address,
    label: row.label,
    createdAt: row.created_at
  };
}

export function toMailboxDetailRecord(row: any): MailboxDetailRecord {
  return {
    id: row.id,
    userId: row.user_id,
    address: row.address,
    label: row.label,
    status: row.status || "enabled",
    tags: JSON.parse(row.tags_json || "[]"),
    createdBy: row.created_by_user_id,
    createdByName: row.created_by_name,
    lastActiveAt: row.last_active_at,
    deletedAt: row.deleted_at,
    messageCount: Number(row.message_count || 0),
    outboundCount: Number(row.outbound_count || 0),
    createdAt: row.created_at
  };
}

export function toDictionaryGroup(row: any): DictionaryGroupSummary {
  return {
    groupKey: row.group_key,
    label: row.label,
    description: row.description,
    isSystem: toBool(row.is_system),
    version: Number(row.version || 1),
    updatedAt: row.updated_at
  };
}

export function toDictionaryItem(row: any): DictionaryItemSummary {
  return {
    groupKey: row.group_key,
    value: row.value,
    label: row.label,
    description: row.description,
    sortOrder: Number(row.sort_order || 0),
    enabled: toBool(row.enabled),
    metadata: parseJson<Record<string, unknown>>(row.metadata_json, {}),
    updatedAt: row.updated_at
  };
}
