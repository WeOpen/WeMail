import type { ExtractionResult } from "./types";

const codePatterns = [
  /\b(?:code|otp|verification code|security code|passcode)[:\s-]*([A-Z0-9]{4,8})\b/i,
  /\b([0-9]{4,8})\b/
];

const linkPattern = /https?:\/\/[^\s)]+/gi;

function pickLink(links: string[], matcher: RegExp) {
  return links.find((link) => matcher.test(link));
}

function normalizeCodeCandidate(value: string) {
  return value.replace(/[\s-]/g, "");
}

function isLikelyCodeCandidate(value: string) {
  const normalized = normalizeCodeCandidate(value);
  return /^[A-Z0-9]{4,8}$/i.test(normalized) && /\d/.test(normalized);
}

export function extractImportantInfo(input: {
  subject?: string;
  text?: string;
  html?: string;
}): ExtractionResult {
  const subject = input.subject ?? "";
  const text = [subject, input.text ?? "", input.html ?? ""].filter(Boolean).join("\n");

  for (const pattern of codePatterns) {
    const match = text.match(pattern);
    if (match?.[1] && isLikelyCodeCandidate(match[1])) {
      return {
        method: "regex",
        type: "auth_code",
        value: normalizeCodeCandidate(match[1]),
        label: "Verification code"
      };
    }
  }

  const links = Array.from(new Set(text.match(linkPattern) ?? []));

  const authLink = pickLink(links, /(verify|activate|confirm|signin|login|reset)/i);
  if (authLink) {
    return {
      method: "regex",
      type: "auth_link",
      value: authLink,
      label: "Verification link"
    };
  }

  const serviceLink = pickLink(links, /(github|gitlab|deploy|issue|pull|commit)/i);
  if (serviceLink) {
    return {
      method: "regex",
      type: "service_link",
      value: serviceLink,
      label: "Service link"
    };
  }

  const subscriptionLink = pickLink(links, /(unsubscribe|opt-?out|preferences)/i);
  if (subscriptionLink) {
    return {
      method: "regex",
      type: "subscription_link",
      value: subscriptionLink,
      label: "Subscription link"
    };
  }

  if (links.length > 0) {
    return {
      method: "regex",
      type: "other_link",
      value: links[0],
      label: "Useful link"
    };
  }

  return {
    method: "none",
    type: "none",
    value: "",
    label: ""
  };
}
