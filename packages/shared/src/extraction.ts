import type { AuthenticationSummary, ExtractionResult, ExtractionType, MessageExtraction } from "./types";

// ---------------------------------------------------------------------------
// Inbound extraction engine.
//
// One email can carry several findings: a verification code, an auth link, a
// subscription link from the List-Unsubscribe header, and so on. The engine
// collects them all into a MessageExtraction envelope; "primary" keeps the
// single best result so chips, webhooks, and legacy rows stay compatible.
// ---------------------------------------------------------------------------

const linkPattern = /https?:\/\/[^\s)"'<>]+/gi;

// Keyword-anchored captures (English and Chinese). A keyword directly before
// or after the candidate is the strongest signal a digit run is a code.
// Codes may arrive hyphen-joined ("836-592"); the captured run is validated
// and normalized afterwards, so the group allows one hyphen segment.
const codeCapture = "([A-Z0-9]{2,10}(?:-[A-Z0-9]{2,10})?|[A-Z0-9]{4,10})";

const codeAfterKeywordPatterns = [
  new RegExp("\\b(?:verification|security|one[-\\s]?time|auth(?:entication)?|login|access|pass)[- ]?(?:code|otp|password|pin)\\b[^A-Za-z0-9]{0,16}" + codeCapture + "\\b", "i"),
  new RegExp("\\b(?:code|otp|passcode|pin)\\b[^A-Za-z0-9]{0,12}" + codeCapture + "\\b", "i"),
  new RegExp("(?:验证码|校验码|动态码|动态密码|一次性密码|识别码|登入码|登录码|口令)[^A-Za-z0-9]{0,10}" + codeCapture)
];

const codeBeforeKeywordPatterns = [
  new RegExp("\\b" + codeCapture + "\\b[^A-Za-z0-9]{0,16}(?:is|为|是)?\\s*(?:your\\s+)?(?:verification|security|one[-\\s]?time|login|access)?\\s*(?:code|otp|passcode|验证码|校验码|动态码|动态密码)\\b", "i")
];

// Window around a bare digit run that must contain a code keyword for the
// run to count. This is what rejects prices, dates, and order numbers.
const codeContextWindow = 40;
const codeContextKeywords =
  /\b(?:code|otp|passcode|pin|password)\b|verification|verify|security|one[-\s]?time|登录|登入|验证|校验|动态|口令/i;

const bareDigitPattern = /\b[0-9]{4,10}\b/g;

const expiryPatterns: Array<{ pattern: RegExp; units: Record<string, string> }> = [
  {
    pattern: /(?:有效期|有效时间|过期时间)[^0-9]{0,8}(\d+)\s*(分钟|分鐘|小时|小時|天)/,
    units: { "分钟": "分钟", "分鐘": "分钟", "小时": "小时", "小時": "小时", "天": "天" }
  },
  {
    // Reversed Chinese form: the window precedes 有效 ("10 分钟内有效").
    pattern: /(\d+)\s*(分钟|分鐘|小时|小時|天)\s*(?:之?内|內)?\s*有效/,
    units: { "分钟": "分钟", "分鐘": "分钟", "小时": "小时", "小時": "小时", "天": "天" }
  },
  {
    pattern: /\b(?:valid for|expires? in|expire[sd]? within|expiry)[:\s]*(\d+)\s*(minutes?|mins?|hours?|hrs?|days?)\b/i,
    units: { minute: "分钟", minutes: "分钟", min: "分钟", mins: "分钟", hour: "小时", hours: "小时", hr: "小时", hrs: "小时", day: "天", days: "天" }
  }
];

const linkClassifiers: Array<{ type: ExtractionType; label: string; matcher: RegExp }> = [
  { type: "auth_link", label: "Verification link", matcher: /(verify|activate|confirm|signin|login|reset|auth)/i },
  { type: "service_link", label: "Service link", matcher: /(github|gitlab|deploy|issue|pull|commit|docs|dashboard)/i },
  { type: "subscription_link", label: "Subscription link", matcher: /(unsubscribe|opt-?out|preferences|subscription)/i }
];

const primaryTypeOrder: ExtractionType[] = ["auth_code", "auth_link", "service_link", "subscription_link", "other_link"];

function normalizeCodeCandidate(value: string) {
  return value.replace(/[\s-]/g, "");
}

function isLikelyCodeCandidate(value: string) {
  const normalized = normalizeCodeCandidate(value);
  return /^[A-Z0-9]{4,10}$/i.test(normalized) && /\d/.test(normalized);
}

function collectCodeCandidates(text: string): string[] {
  const found: string[] = [];

  for (const pattern of codeAfterKeywordPatterns) {
    for (const match of text.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"))) {
      if (match?.[1] && isLikelyCodeCandidate(match[1])) found.push(match[1]);
    }
  }
  for (const pattern of codeBeforeKeywordPatterns) {
    for (const match of text.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"))) {
      if (match?.[1] && isLikelyCodeCandidate(match[1])) found.push(match[1]);
    }
  }

  // Bare digit runs only count inside a code-keyword context window.
  for (const match of text.matchAll(bareDigitPattern)) {
    const candidate = match[0];
    if (!isLikelyCodeCandidate(candidate)) continue;
    const start = Math.max(0, match.index - codeContextWindow);
    const end = Math.min(text.length, match.index + candidate.length + codeContextWindow);
    if (codeContextKeywords.test(text.slice(start, end))) found.push(candidate);
  }

  const unique: string[] = [];
  for (const value of found) {
    const normalized = normalizeCodeCandidate(value);
    if (!unique.some((existing) => normalizeCodeCandidate(existing) === normalized)) unique.push(value);
  }
  return unique;
}

function collectLinkItems(text: string): ExtractionResult[] {
  const links = Array.from(new Set(text.match(linkPattern) ?? []));
  const items: ExtractionResult[] = [];

  for (const classifier of linkClassifiers) {
    const link = links.find((value) => classifier.matcher.test(value));
    if (link) items.push({ method: "regex", type: classifier.type, value: link, label: classifier.label, source: "body" });
  }

  const unmatched = links.find((value) => !linkClassifiers.some((classifier) => classifier.matcher.test(value)));
  if (unmatched) {
    items.push({ method: "regex", type: "other_link", value: unmatched, label: "Useful link", source: "body" });
  }
  return items;
}

function parseListUnsubscribe(header: string | null | undefined): ExtractionResult | null {
  if (!header) return null;
  // The header may hold several comma-separated values, each possibly in
  // angle brackets; only http(s) URLs are actionable in the product UI.
  const urls = Array.from(header.matchAll(/<?(https:\/\/[^>,\s]+)>?/gi)).map((match) => match[1]);
  const url = Array.from(new Set(urls))[0];
  if (!url) return null;
  return { method: "regex", type: "subscription_link", value: url, label: "Unsubscribe (header)", source: "header" };
}

function findExpiresHint(text: string): string | null {
  for (const { pattern, units } of expiryPatterns) {
    const match = text.match(pattern);
    if (match?.[1] && match[2]) {
      const unit = units[match[2].toLowerCase()] ?? units[match[2]];
      if (unit) return `${match[1]} ${unit}内有效`;
    }
  }
  return null;
}

const authVerdictPatterns: Array<{ key: keyof AuthenticationSummary; pattern: RegExp }> = [
  { key: "spf", pattern: /\bspf=(pass|fail|softfail|none)\b/i },
  { key: "dkim", pattern: /\bdkim=(pass|fail|none)\b/i },
  { key: "dmarc", pattern: /\bdmarc=(pass|fail|quarantine|reject|none)\b/i }
];

export function parseAuthenticationResults(raw: string | null | undefined): AuthenticationSummary | null {
  if (!raw) return null;
  const summary: AuthenticationSummary = { spf: "unknown", dkim: "unknown", dmarc: "unknown", raw: raw.slice(0, 500) };

  for (const { key, pattern } of authVerdictPatterns) {
    const match = raw.match(pattern);
    if (match?.[1]) {
      const verdict = match[1].toLowerCase();
      summary[key] = verdict === "quarantine" || verdict === "reject" ? "fail" : (verdict as AuthenticationSummary["spf"]);
    }
  }
  return summary;
}

export function pickPrimaryExtraction(items: ExtractionResult[]): ExtractionResult {
  for (const type of primaryTypeOrder) {
    // Header-derived findings outrank body guesses within the same type.
    const match = items.find((item) => item.type === type && item.source === "header") ?? items.find((item) => item.type === type);
    if (match) return match;
  }
  return { method: "none", type: "none", value: "", label: "", source: null };
}

function dedupeItems(items: ExtractionResult[]): ExtractionResult[] {
  const seen = new Set<string>();
  const unique: ExtractionResult[] = [];
  for (const item of items) {
    if (item.type === "none" || !item.value) continue;
    const key = `${item.type}:${item.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

export function buildMessageExtraction(input: {
  subject?: string;
  text?: string;
  html?: string;
  listUnsubscribe?: string | null;
  authenticationResults?: string | null;
}): MessageExtraction {
  const text = [input.subject ?? "", input.text ?? "", input.html ?? ""].filter(Boolean).join("\n");

  const items = dedupeItems([
    ...collectCodeCandidates(text).map<ExtractionResult>((value) => ({
      method: "regex",
      type: "auth_code",
      value: normalizeCodeCandidate(value),
      label: "Verification code",
      source: "body"
    })),
    ...collectLinkItems(text),
    ...(parseListUnsubscribe(input.listUnsubscribe) ? [parseListUnsubscribe(input.listUnsubscribe)!] : [])
  ]);

  return {
    primary: pickPrimaryExtraction(items),
    items,
    expiresHint: findExpiresHint(text),
    authSummary: parseAuthenticationResults(input.authenticationResults)
  };
}

// Legacy single-result API: returns the primary finding.
export function extractImportantInfo(input: {
  subject?: string;
  text?: string;
  html?: string;
}): ExtractionResult {
  return buildMessageExtraction(input).primary;
}

// Normalizes whatever is stored in mail_messages.extraction_json: the new
// envelope, or a legacy single ExtractionResult written before 0.4.0.
export function parseMessageExtraction(json: string | null | undefined): MessageExtraction {
  const none: MessageExtraction = { primary: { method: "none", type: "none", value: "", label: "", source: null }, items: [], expiresHint: null, authSummary: null };
  if (!json) return none;

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return none;
  }
  if (typeof parsed !== "object" || parsed === null) return none;

  if ("items" in parsed && Array.isArray((parsed as MessageExtraction).items)) {
    const envelope = parsed as MessageExtraction;
    const items = dedupeItems(envelope.items ?? []);
    return {
      primary: envelope.primary ?? pickPrimaryExtraction(items),
      items,
      expiresHint: envelope.expiresHint ?? null,
      authSummary: envelope.authSummary ?? null
    };
  }

  const legacy = parsed as ExtractionResult;
  if (!legacy || typeof legacy !== "object" || !legacy.type) return none;
  const legacyItems = legacy.type !== "none" && legacy.value ? [legacy] : [];
  return { primary: legacy, items: legacyItems, expiresHint: null, authSummary: null };
}

// Merges AI-fallback findings into an envelope whose regex pass found
// nothing, then re-picks the primary.
export function mergeAiItems(current: MessageExtraction, aiItems: ExtractionResult[]): MessageExtraction {
  const items = dedupeItems([...current.items, ...aiItems.map((item) => ({ ...item, method: "ai" as const }))]);
  return { ...current, items, primary: pickPrimaryExtraction(items) };
}
