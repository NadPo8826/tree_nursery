import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { verifyTotp } from "@/lib/totp";

/**
 * Admin auth: one owner, password (ADMIN_PASSWORD) + optional TOTP second
 * factor (ADMIN_TOTP_SECRET — generate with scripts/generate-totp-secret.mjs).
 * The session cookie is HMAC-signed, httpOnly, and expires server-side too —
 * a stolen cookie value goes stale even if the browser lies about maxAge.
 */
const COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // two weeks

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
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

export function isTotpEnabled(): boolean {
  return Boolean(process.env.ADMIN_TOTP_SECRET);
}

export function checkTotp(code: string): boolean {
  const secret = process.env.ADMIN_TOTP_SECRET;
  if (!secret) return true; // MFA not configured — password-only mode
  return verifyTotp(secret, code);
}

export async function createSession(): Promise<void> {
  const payload = `admin.${Date.now()}`;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
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
