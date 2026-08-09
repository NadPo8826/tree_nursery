/**
 * Generates an ADMIN_TOTP_SECRET and the otpauth:// URL to scan into
 * Google Authenticator / Authy / 1Password.
 *
 *   node scripts/generate-totp-secret.mjs
 *
 * Then add the printed line to site/.env.local and restart the server —
 * from that moment the admin login requires password + 6-digit code.
 */
import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const bytes = randomBytes(20);
let bits = 0;
let value = 0;
let secret = "";
for (const byte of bytes) {
  value = (value << 8) | byte;
  bits += 8;
  while (bits >= 5) {
    secret += ALPHABET[(value >>> (bits - 5)) & 31];
    bits -= 5;
  }
}

const label = encodeURIComponent("Tree Nursery Admin");
console.log("Add to site/.env.local:\n");
console.log(`ADMIN_TOTP_SECRET=${secret}\n`);
console.log("Scan into your authenticator app (or type the secret manually):\n");
console.log(`otpauth://totp/${label}?secret=${secret}&issuer=${label}&digits=6&period=30`);
