import PostalMime from "postal-mime";

import {
  buildMessageExtraction as buildSharedMessageExtraction,
  mergeAiItems,
  parseMessageExtraction,
  type ExtractionResult,
  type MessageExtraction
} from "@wemail/shared";
import type { AppBindings, AttachmentRecord, PersistedMessageRecord, ResendClient, TelegramApiClient } from "../core/bindings";

const htmlEntityMap: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: "\""
};

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, rawName: string) => {
    const name = rawName.toLowerCase();
    if (name.startsWith("#x")) {
      const codePoint = Number.parseInt(name.slice(2), 16);
      return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    }
    if (name.startsWith("#")) {
      const codePoint = Number.parseInt(name.slice(1), 10);
      return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    }
    return htmlEntityMap[name] ?? entity;
  });
}

function normalizeTextLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function normalizeRemoteImageSrc(value: string) {
  const decoded = decodeHtmlEntities(value.trim());
  try {
    const url = new URL(decoded);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function htmlToReadableText(html: string) {
  const withRemoteImageBlocks = html.replace(
    /<img\b[^>]*\bsrc=(["']?)([^"'\s>]+)\1[^>]*>/gi,
    (_match, _quote: string, src: string) => {
      const safeSrc = normalizeRemoteImageSrc(src);
      return safeSrc ? `\nRemote image blocked: ${safeSrc}\n` : " ";
    }
  );
  // Quote chains (reply history) carry no signal for a disposable inbox and
  // push the actual content below the fold — drop them before flattening.
  const withoutQuotes = withRemoteImageBlocks
    .replace(/<blockquote\b[^>]*>[\s\S]*?<\/blockquote>/gi, " ")
    .replace(/<div\b[^>]*class=(["']?)[^"']*gmail_quote[^"']*\1[^>]*>[\s\S]*?<\/div>/gi, " ");
  const withLinks = withoutQuotes.replace(
    /<a\b[^>]*\bhref=(["']?)([^"'\s>]+)\1[^>]*>([\s\S]*?)<\/a>/gi,
    (_match, _quote: string, href: string, label: string) => `${label} ${href}`
  );
  // Tables read as "col | col" rows so order confirmations and receipts keep
  // their column relationships in the flattened text.
  const withTables = withLinks
    .replace(/<\s*(script|style|head)\b[\s\S]*?<\/\s*\1\s*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\s*t[dh]\b[^>]*>/gi, " ")
    .replace(/<\s*\/t[dh]\b[^>]*>\s*(?!<\s*t[dh]\b|<\s*\/tr\b)/gi, " | ")
    .replace(/<\s*\/tr\b[^>]*>/gi, "\n")
    .replace(/<\s*(br|\/p|\/div|\/h[1-6]|\/li)\b[^>]*>/gi, "\n")
    .replace(/<\s*(p|div|h[1-6]|li|tr)\b[^>]*>/gi, "\n");
  const text = withTables.replace(/<[^>]+>/g, " ");
  return normalizeTextLines(decodeHtmlEntities(text));
}

function pickReadableBodyText(parsed: { text?: string; html?: string }) {
  const text = parsed.text?.trim();
  if (text) {
    // Drop reply-quoted lines so extraction reads the new content only.
    const withoutQuotes = parsed.text
      ?.split("\n")
      .filter((line) => !/^\s*>/.test(line))
      .join("\n");
    return withoutQuotes ?? "";
  }
  return parsed.html ? htmlToReadableText(parsed.html) : "";
}

export async function parseRawEmail(raw: ReadableStream<Uint8Array>) {
  const chunks: Uint8Array[] = [];
  const reader = raw.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const parser = new PostalMime();
  const parsed = await parser.parse(merged.buffer);
  const normalizedAttachments = (parsed.attachments ?? []).map((attachment) => {
    const content =
      typeof attachment.content === "string"
        ? new TextEncoder().encode(attachment.content)
        : attachment.content instanceof Uint8Array
          ? attachment.content
          : new Uint8Array(attachment.content);

    return {
      filename: attachment.filename ?? "attachment.bin",
      contentType: attachment.mimeType ?? "application/octet-stream",
      data: content,
      size: content.byteLength
    };
  });

  const headers = parsed.headers ?? [];
  const findHeader = (name: string) => headers.find((header) => header.key === name)?.value ?? null;

  return {
    fromAddress: parsed.from?.address ?? "unknown@sender.invalid",
    subject: parsed.subject ?? "(no subject)",
    // The RFC 5322 Message-ID survives redelivery unchanged, making it the
    // idempotency key for inbound processing.
    messageId: parsed.messageId?.trim() || null,
    // RFC 8058 list-unsubscribe and the receiving mail server's auth verdicts
    // feed the extraction envelope.
    listUnsubscribe: findHeader("list-unsubscribe"),
    authenticationResults: findHeader("authentication-results"),
    text: pickReadableBodyText(parsed),
    attachments: normalizedAttachments
  };
}

export function buildMessageExtraction(input: {
  subject: string;
  bodyText: string;
  listUnsubscribe?: string | null;
  authenticationResults?: string | null;
}): MessageExtraction {
  return buildSharedMessageExtraction({
    subject: input.subject,
    text: input.bodyText,
    listUnsubscribe: input.listUnsubscribe ?? null,
    authenticationResults: input.authenticationResults ?? null
  });
}

const aiAllowedTypes = new Set(["auth_code", "auth_link", "service_link", "subscription_link", "other_link"]);

// Llama 3.1 responds more reliably to JSON when fenced; strip fences before
// parsing so one formatting quirk doesn't discard the whole fallback.
function stripJsonFences(value: string) {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] ?? value).trim();
}

export async function maybeRunAiFallback(
  env: { AI?: AppBindings["AI"] },
  current: MessageExtraction,
  content: string
) {
  if (current.primary.type !== "none" || !env.AI) return current;

  try {
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct" as any, {
      messages: [
        {
          role: "system",
          content:
            "Extract every useful auth code and actionable link from the email. Respond with a JSON array; each element has keys type (one of auth_code, auth_link, service_link, subscription_link, other_link), value, label. No other text."
        },
        { role: "user", content }
      ]
    });

    const response =
      typeof result === "object" && result && "response" in result ? (result.response as string) : null;
    if (!response) return current;

    const parsed = JSON.parse(stripJsonFences(response)) as unknown;
    if (!Array.isArray(parsed)) return current;

    const aiItems = parsed
      .filter(
        (item): item is { type: string; value: string; label?: string } =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as { type?: unknown }).type === "string" &&
          typeof (item as { value?: unknown }).value === "string" &&
          aiAllowedTypes.has((item as { type: string }).type)
      )
      .map((item) => ({
        method: "regex" as const,
        type: item.type as ExtractionResult["type"],
        value: item.value,
        label: item.label ?? "AI result",
        source: "body" as const
      }));
    if (aiItems.length === 0) return current;

    return mergeAiItems(current, aiItems);
  } catch {
    return current;
  }
}

export function createPreview(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 220);
}

export function buildTelegramClient(token: string | undefined): TelegramApiClient | null {
  if (!token) return null;
  async function parseTelegramApiError(response: Response, fallback: string) {
    if (response.ok) return null;
    const payload = (await response.json().catch(() => null)) as { description?: string } | null;
    return payload?.description ?? fallback;
  }

  return {
    async getChat({ chatId }: { chatId: string }) {
      const response = await fetch(`https://api.telegram.org/bot${token}/getChat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId })
      });
      const description = await parseTelegramApiError(response, `Telegram getChat failed: ${response.status}`);
      return { ok: response.ok, description };
    },
    async sendMessage({ chatId, text }: { chatId: string; text: string }) {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: false
        })
      });
      return { ok: response.ok };
    },
    async setMyCommands({ commands }: { commands: Array<{ command: string; description: string }> }) {
      const response = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ commands })
      });
      const description = await parseTelegramApiError(response, `Telegram setMyCommands failed: ${response.status}`);
      return { ok: response.ok, description };
    },
    async setChatMenuButton() {
      const response = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ menu_button: { type: "commands" } })
      });
      const description = await parseTelegramApiError(response, `Telegram setChatMenuButton failed: ${response.status}`);
      return { ok: response.ok, description };
    },
    async setWebhook({
      allowedUpdates,
      dropPendingUpdates,
      secretToken,
      url
    }: {
      allowedUpdates: string[];
      dropPendingUpdates: boolean;
      secretToken?: string;
      url: string;
    }) {
      const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url,
          allowed_updates: allowedUpdates,
          drop_pending_updates: dropPendingUpdates,
          ...(secretToken ? { secret_token: secretToken } : {})
        })
      });
      const description = await parseTelegramApiError(response, `Telegram setWebhook failed: ${response.status}`);
      return { ok: response.ok, description };
    }
  };
}

export function buildResendClient(apiKey: string | undefined): ResendClient | null {
  if (!apiKey) return null;
  return {
    async sendEmail(payload: {
      from: string;
      to: string;
      subject: string;
      text: string;
      html?: string;
    }) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          from: payload.from,
          to: [payload.to],
          subject: payload.subject,
          text: payload.text,
          html: payload.html
        })
      });

      const responseText = await response.text();
      let responsePayload: unknown = responseText;
      try {
        responsePayload = responseText ? JSON.parse(responseText) : null;
      } catch {
        responsePayload = responseText;
      }

      if (!response.ok) {
        return { success: false, error: responseText, responsePayload };
      }

      const messageId =
        typeof responsePayload === "object" && responsePayload && "id" in responsePayload
          ? String((responsePayload as { id: unknown }).id)
          : undefined;
      return { success: true, messageId, responsePayload };
    }
  };
}

export function toMessageJson(message: PersistedMessageRecord, attachments: AttachmentRecord[]) {
  // extractionJson holds either the new envelope or a pre-0.4.0 single
  // result; the shared normalizer returns the envelope shape for both.
  const envelope = parseMessageExtraction(message.extractionJson);
  return {
    id: message.id,
    mailboxId: message.mailboxId,
    toAddress: message.toAddress ?? null,
    fromAddress: message.fromAddress,
    subject: message.subject,
    previewText: message.previewText,
    bodyText: message.bodyText,
    extraction: envelope.primary,
    extractions: envelope.items,
    expiresHint: envelope.expiresHint,
    authSummary: envelope.authSummary,
    oversizeStatus: message.oversizeStatus,
    attachmentCount: message.attachmentCount,
    attachments,
    receivedAt: message.receivedAt,
    expiresAt: message.expiresAt
  };
}
