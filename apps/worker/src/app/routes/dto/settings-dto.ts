import type { ApiKeyScope, ApiKeySummary, UserSummary } from "@wemail/shared";

type ApiKeyRecordLike = {
  id: string;
  userId?: string;
  label: string;
  prefix: string;
  scopes: ApiKeyScope[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

type ApiKeyOwnerLike = {
  id: string;
  email: string;
  name: string;
  role: UserSummary["role"];
  status: UserSummary["status"];
  createdAt: string;
  updatedAt: string;
};

function toApiKeyOwnerSummary(owner: ApiKeyOwnerLike): UserSummary {
  return {
    id: owner.id,
    email: owner.email,
    name: owner.name,
    role: owner.role,
    status: owner.status,
    createdAt: owner.createdAt,
    updatedAt: owner.updatedAt
  };
}

export function toApiKeySummary(entry: ApiKeyRecordLike, owner?: ApiKeyOwnerLike | null): ApiKeySummary {
  return {
    id: entry.id,
    label: entry.label,
    owner: owner ? toApiKeyOwnerSummary(owner) : undefined,
    prefix: entry.prefix,
    scopes: entry.scopes,
    createdAt: entry.createdAt,
    lastUsedAt: entry.lastUsedAt,
    revokedAt: entry.revokedAt
  };
}
