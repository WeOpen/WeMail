import { requireString, toRecordLike } from "../validators";

function isValidEmailAddress(value: string) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value.trim());
}

export function parseOutboundPayload(input: unknown) {
  const payload = toRecordLike(input);
  const toAddress = requireString(payload.toAddress, "toAddress");
  if (!isValidEmailAddress(toAddress)) {
    throw new Error("toAddress must be a valid email address");
  }

  return {
    mailboxId: requireString(payload.mailboxId, "mailboxId"),
    toAddress,
    subject: requireString(payload.subject, "subject"),
    bodyText: requireString(payload.bodyText, "bodyText")
  };
}
