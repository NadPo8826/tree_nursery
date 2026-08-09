import { createHmac, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { adminEntries } from "@/lib/telegram";

/**
 * Admin auth — two-screen login:
 *   Screen 1: username + shared password (ADMIN_PASSWORD). The username
 *     identifies WHICH admin is logging in (named entries in
 *     TELEGRAM_ADMIN_CHAT_IDS / the admin panel, "name:chatId" format).
 *   Screen 2: a 6-digit one-time code pushed to that admin's OWN Telegram
 *     chat — never broadcast, so one admin can't complete another's login.
 * Between the screens a short-lived HMAC-signed "pending" cookie carries
 * the verified username. The session cookie is HMAC-signed, httpOnly, and
 * expires server-side too — a stolen cookie value goes stale even if the
 * browser lies about maxAge.
 * If no named admin exists (bot unset, or only legacy bare chat IDs),
 * login degrades to password-only so a fresh setup can still get in.
 */
const COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // two weeks

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

/**
 * Secure-flag by ACTUAL protocol, not NODE_ENV: the owner runs `next start`
 * on the nursery PC and logs in from a phone over plain-http LAN — a Secure
 * cookie would silently never come back there. Behind real HTTPS (Vercel
 * etc.) x-forwarded-proto is https and the flag turns on.
 */
async function cookieSecure(): Promise<boolean> {
  const proto = (await headers()).get("x-forwarded-proto") ?? "";
  return proto.split(",")[0]?.trim() === "https";
}

export function isConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function checkPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ---- Telegram login codes: the second factor, per user -------------- */
/* 6-digit codes keyed by username; single-use, 5-minute expiry,         */
/* 5 attempts. A code only ever goes to that username's own chat.        */

const tgLoginCodes = new Map<
  string,
  { hash: string; expiresAt: number; attempts: number }
>();

/** OTP is on when the bot is configured AND at least one admin has a name. */
export async function isTelegramLoginAvailable(): Promise<boolean> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return false;
  return (await adminEntries()).some((e) => e.name);
}

export function issueTelegramLoginCode(username: string): string {
  // opportunistic GC so abandoned logins don't accumulate
  for (const [key, entry] of tgLoginCodes) {
    if (Date.now() > entry.expiresAt) tgLoginCodes.delete(key);
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  tgLoginCodes.set(username.trim().toLowerCase(), {
    hash: createHmac("sha256", secret()).update(code).digest("hex"),
    expiresAt: Date.now() + 5 * 60_000,
    attempts: 0,
  });
  return code;
}

export function verifyTelegramLoginCode(username: string, code: string): boolean {
  const key = username.trim().toLowerCase();
  const entry = tgLoginCodes.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt || entry.attempts >= 5) {
    tgLoginCodes.delete(key);
    return false;
  }
  entry.attempts++;
  const given = createHmac("sha256", secret()).update(code.trim()).digest("hex");
  const a = Buffer.from(given);
  const b = Buffer.from(entry.hash);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (ok) tgLoginCodes.delete(key); // single use
  return ok;
}

/* ---- Pending-login cookie: bridges screen 1 → screen 2 -------------- */
/* Set only after username+password passed; proves to the OTP screen     */
/* who is mid-login. Signed, httpOnly, 10-minute expiry.                 */

const PENDING_COOKIE = "admin_login_pending";
const PENDING_TTL_MS = 10 * 60_000;

export async function setPendingLogin(username: string): Promise<void> {
  const payload = `${Buffer.from(username, "utf8").toString("base64url")}.${Date.now()}`;
  (await cookies()).set(PENDING_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: await cookieSecure(),
    maxAge: PENDING_TTL_MS / 1000,
    path: "/admin",
  });
}

/** Returns the mid-login username, or null if absent/tampered/expired. */
export async function getPendingLogin(): Promise<string | null> {
  const raw = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  if (i < 0) return null;
  const payload = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [encoded, issued] = payload.split(".");
  const issuedAt = Number(issued);
  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > PENDING_TTL_MS) {
    return null;
  }
  try {
    return Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export async function clearPendingLogin(): Promise<void> {
  (await cookies()).delete({ name: PENDING_COOKIE, path: "/admin" });
}

export async function createSession(): Promise<void> {
  const payload = `admin.${Date.now()}`;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: await cookieSecure(),
    maxAge: 60 * 60 * 24 * 14, // two weeks
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  if (!isConfigured()) return false;
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) return false;
  const i = raw.lastIndexOf(".");
  if (i < 0) return false;
  const payload = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  // Server-side expiry: the payload carries its creation time under the HMAC.
  const issuedAt = Number(payload.split(".")[1]);
  return Number.isFinite(issuedAt) && Date.now() - issuedAt < SESSION_TTL_MS;
}
