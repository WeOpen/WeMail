import { requireString, toRecordLike } from "../validators";
import type { AccountCreationStatus } from "../types";

const accountCreationStatuses: AccountCreationStatus[] = ["enabled", "disabled", "archived"];

function parseOptionalTags(value: unknown) {
  if (typeof value === "undefined") return undefined;
  if (!Array.isArray(value)) throw new Error("tags must be an array");

  return Array.from(
    new Set(
      value.map((tag) => {
        if (typeof tag !== "string" || tag.trim().length === 0) {
          throw new Error("tags must contain non-empty strings");
        }
        return tag.trim();
      })
    )
  );
}

function parseOptionalStatus(value: unknown) {
  if (typeof value === "undefined") return undefined;
  if (typeof value !== "string" || !accountCreationStatuses.includes(value as AccountCreationStatus)) {
    throw new Error("status must be enabled, disabled, or archived");
  }
  return value as AccountCreationStatus;
}

export function parseMailboxCreatePayload(input: unknown) {
  const payload = toRecordLike(input);
  const domain = typeof payload.domain === "undefined" ? undefined : requireString(payload.domain, "domain");
  const creatorNote =
    typeof payload.creatorNote === "undefined" ? undefined : requireString(payload.creatorNote, "creatorNote");
  const tags = parseOptionalTags(payload.tags);
  const status = parseOptionalStatus(payload.status);

  return {
    label: requireString(payload.label ?? "Temporary inbox", "label"),
    ...(domain ? { domain } : {}),
    ...(creatorNote ? { creatorNote } : {}),
    ...(status ? { status } : {}),
    ...(tags ? { tags } : {})
  };
}
