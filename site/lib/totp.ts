import { createHmac, timingSafeEqual } from "crypto";

/**
 * RFC 6238 TOTP (the standard used by Google Authenticator / Authy / 1Password),
 * implemented on Node's crypto — no third-party dependency to trust.
 * 6 digits, 30-second step, ±1 step of clock drift allowed.
 */

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32_ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secret: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(code % 1_000_000).padStart(6, "0");
}

/** Verify a 6-digit code against the base32 secret, allowing ±1 time step. */
export function verifyTotp(secretB32: string, code: string): boolean {
  const clean = code.replace(/\D/g, "");
  if (clean.length !== 6) return false;
  const secret = base32Decode(secretB32);
  if (secret.length < 10) return false; // refuse trivially weak secrets
  const step = Math.floor(Date.now() / 30_000);
  const given = Buffer.from(clean);
  for (const drift of [0, -1, 1]) {
    const expected = Buffer.from(hotp(secret, step + drift));
    if (given.length === expected.length && timingSafeEqual(given, expected)) {
      return true;
    }
  }
  return false;
}
