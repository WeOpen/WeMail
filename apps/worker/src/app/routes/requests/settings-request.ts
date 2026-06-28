import { API_KEY_SCOPE_DEFINITIONS, DEFAULT_API_KEY_SCOPES, parseTelegramPayload, type ApiKeyScope } from "@wemail/shared";

export async function parseTelegramUpdateRequest(request: Request) {
  return parseTelegramPayload(await request.json());
}

export async function parseApiKeyCreateRequest(request: Request) {
  const payload = (await request.json().catch(() => ({ label: "Default key" }))) as { label?: string; scopes?: unknown };
  const scopeIds = new Set<string>(API_KEY_SCOPE_DEFINITIONS.map((scope) => scope.id));
  const requestedScopes = Array.isArray(payload.scopes)
    ? payload.scopes.filter((scope): scope is ApiKeyScope => typeof scope === "string" && scopeIds.has(scope))
    : [];

  return {
    label: String(payload.label ?? "Default key"),
    scopes: requestedScopes.length > 0 ? requestedScopes : [...DEFAULT_API_KEY_SCOPES]
  };
}
