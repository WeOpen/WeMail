import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import { resolveAppConfig } from "../core/config";

const textEncoder = new TextEncoder();
const passwordIterations = 120_000;

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashString(value: string) {
  return toHex(await crypto.subtle.digest("SHA-256", textEncoder.encode(value)));
}

async function derivePasswordHash(password: string, salt: string) {
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
      iterations: passwordIterations,
      salt: textEncoder.encode(salt)
    },
    keyMaterial,
    256
  );
  return toHex(bits);
}

export async function hashPassword(password: string) {
  const salt = crypto.randomUUID();
  return `${salt}:${await derivePasswordHash(password, salt)}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, digest] = stored.split(":");
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
  setCookie(c, config.cookie.name, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure,
    path: "/",
    maxAge: config.session.ttlHours * 60 * 60
  });
}

export function clearSessionCookie(c: Context<any>) {
  const config = resolveAppConfig(c.env);
  deleteCookie(c, config.cookie.name, { path: "/" });
}

export function readSessionCookie(c: Context<any>) {
  const config = resolveAppConfig(c.env);
  return getCookie(c, config.cookie.name) ?? null;
}
