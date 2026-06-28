import type { ApiKeyScope, ApiKeySummary } from "@wemail/shared";

type ApiKeyRecordLike = {
  id: string;
  label: string;
  prefix: string;
  scopes: ApiKeyScope[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export function toApiKeySummary(entry: ApiKeyRecordLike): ApiKeySummary {
  return {
    id: entry.id,
    label: entry.label,
    prefix: entry.prefix,
    scopes: entry.scopes,
    createdAt: entry.createdAt,
    lastUsedAt: entry.lastUsedAt,
    revokedAt: entry.revokedAt
  };
}
