import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import { resolveAppConfig } from "../core/config";

const textEncoder = new TextEncoder();
const passwordAlgorithm = "pbkdf2-sha256";
// Cloudflare Workers WebCrypto currently rejects PBKDF2 iteration counts above
// 100000, so keep the application default at the platform-supported ceiling.
const passwordIterations = 100_000;

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashString(value: string) {
  return toHex(await crypto.subtle.digest("SHA-256", textEncoder.encode(value)));
}

async function derivePasswordHash(password: string, salt: string, iterations = passwordIterations) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations,
      salt: textEncoder.encode(salt)
    },
    keyMaterial,
    256
  );
  return toHex(bits);
}

export async function hashPassword(password: string) {
  const salt = crypto.randomUUID();
  return `${passwordAlgorithm}:${passwordIterations}:${salt}:${await derivePasswordHash(password, salt)}`;
}

export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split(":");
  if (parts.length === 4) {
    const [algorithm, iterationsText, salt, digest] = parts;
    const iterations = Number(iterationsText);
    if (algorithm !== passwordAlgorithm || !Number.isInteger(iterations) || iterations < 1 || iterations > passwordIterations) {
      return false;
    }
    if (!salt || !digest) return false;
    return (await derivePasswordHash(password, salt, iterations)) === digest;
  }

  const [salt, digest] = parts;
  if (!salt || !digest) return false;
  return (await derivePasswordHash(password, salt)) === digest;
}

export function createOpaqueToken() {
  return `${crypto.randomUUID()}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function createApiKeySecret() {
  return `wk_${createOpaqueToken().replace(/-/g, "")}`;
}

export function setSessionCookie(c: Context<any>, token: string) {
  const config = resolveAppConfig(c.env);
  const secure = config.cookie.secure || new URL(c.req.url).protocol === "https:";
  if (config.cookie.domain) {
    deleteCookie(c, config.cookie.name, { path: "/" });
  }
  setCookie(c, config.cookie.name, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure,
    domain: config.cookie.domain,
    path: "/",
    maxAge: config.session.ttlHours * 60 * 60
  });
}

export function clearSessionCookie(c: Context<any>) {
  const config = resolveAppConfig(c.env);
  deleteCookie(c, config.cookie.name, { path: "/" });
  deleteCookie(c, config.cookie.name, { domain: config.cookie.domain, path: "/" });
}

export function readSessionCookie(c: Context<any>) {
  const config = resolveAppConfig(c.env);
  return getCookie(c, config.cookie.name) ?? null;
}

export function readSessionCookies(c: Context<any>) {
  const config = resolveAppConfig(c.env);
  const cookieHeader = c.req.header("cookie");
  if (!cookieHeader) return [];

  const tokens: string[] = [];
  const seen = new Set<string>();
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = part.trim().split("=");
    if (rawName !== config.cookie.name) continue;
    const value = rawValueParts.join("=");
    if (!value || seen.has(value)) continue;
    seen.add(value);
    tokens.push(value);
  }

  return tokens;
}
