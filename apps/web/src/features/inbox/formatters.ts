export function formatAttachmentSize(size: number) {
  return `${Math.round(size / 1024)} KB`;
}

function padTimePart(value: number) {
  return String(value).padStart(2, "0");
}

function isSameLocalDate(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function formatClockTime(value: Date) {
  return `${padTimePart(value.getHours())}:${padTimePart(value.getMinutes())}:${padTimePart(value.getSeconds())}`;
}

export function formatReceivedAt(value: string) {
  const receivedAt = new Date(value);

  if (Number.isNaN(receivedAt.getTime())) {
    return value;
  }

  if (isSameLocalDate(receivedAt, new Date())) {
    return formatClockTime(receivedAt);
  }

  return `${receivedAt.getFullYear()}-${padTimePart(receivedAt.getMonth() + 1)}-${padTimePart(receivedAt.getDate())} ${formatClockTime(receivedAt)}`;
}

const brandNameOverrides: Record<string, string> = {
  github: "GitHub",
  linear: "Linear",
  openai: "OpenAI",
  vercel: "Vercel",
  wemail: "WeMail"
};

const genericDomainLabels = new Set(["accounts", "auth", "email", "login", "mail", "notifications", "notify", "smtp"]);

function titleCaseSenderName(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function formatSenderName(fromAddress: string) {
  const trimmedAddress = fromAddress.trim();
  const addressMatch = trimmedAddress.match(/<([^<>]+)>/);
  const normalizedAddress = addressMatch?.[1]?.trim() || trimmedAddress;
  const [localPart, domainPart] = normalizedAddress.split("@");
  const domainLabels = (domainPart ?? "")
    .split(".")
    .map((label) => label.trim().toLowerCase())
    .filter(Boolean);
  const candidate = domainLabels.find((label) => !genericDomainLabels.has(label)) || domainLabels[0] || localPart || trimmedAddress;
  const normalizedCandidate = candidate.toLowerCase();

  return brandNameOverrides[normalizedCandidate] ?? titleCaseSenderName(candidate);
}
