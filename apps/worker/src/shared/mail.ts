import PostalMime from "postal-mime";

import { extractImportantInfo, type ExtractionResult } from "@wemail/shared";
import type { AppBindings, AttachmentRecord, PersistedMessageRecord, ResendClient, TelegramApiClient } from "../core/bindings";

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

  return {
    fromAddress: parsed.from?.address ?? "unknown@sender.invalid",
    subject: parsed.subject ?? "(no subject)",
    text: parsed.text ?? parsed.html ?? "",
    attachments: normalizedAttachments
  };
}

export function buildExtraction(subject: string, bodyText: string) {
  return extractImportantInfo({ subject, text: bodyText });
}

export async function maybeRunAiFallback(
  env: { AI?: AppBindings["AI"] },
  current: ExtractionResult,
  content: string
) {
  if (current.type !== "none" || !env.AI) return current;

  try {
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct" as any, {
      messages: [
        {
          role: "system",
          content:
            "Extract exactly one useful auth code or auth link from the email. Return JSON with keys type, value, label."
        },
        { role: "user", content }
      ]
    });

    const response =
      typeof result === "object" && result && "response" in result ? (result.response as string) : null;
    if (!response) return current;

    const parsed = JSON.parse(response) as { type?: string; value?: string; label?: string };
    if (!parsed.type || !parsed.value) return current;

    return {
      method: "ai",
      type: parsed.type as ExtractionResult["type"],
      value: parsed.value,
      label: parsed.label ?? "AI result"
    };
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
  return {
    id: message.id,
    mailboxId: message.mailboxId,
    toAddress: message.toAddress ?? null,
    fromAddress: message.fromAddress,
    subject: message.subject,
    previewText: message.previewText,
    bodyText: message.bodyText,
    extraction: JSON.parse(message.extractionJson) as ExtractionResult,
    oversizeStatus: message.oversizeStatus,
    attachmentCount: message.attachmentCount,
    attachments,
    receivedAt: message.receivedAt,
    expiresAt: message.expiresAt
  };
}
