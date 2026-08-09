/**
 * Local-dev bridge for the Telegram secretary.
 *
 * In production Telegram calls our webhook directly. On localhost it can't,
 * so this script long-polls getUpdates and forwards each update to the
 * local webhook with the shared secret header. It also pings the reminders
 * cron every minute so "תזכיר לי בעוד שעה" works in dev.
 *
 * Run alongside `next dev`:  node scripts/telegram-poll.mjs
 * (reads .env.local; requires TELEGRAM_BOT_TOKEN + TELEGRAM_WEBHOOK_SECRET)
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
try {
  for (const line of readFileSync(resolve(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#") && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  /* no .env.local — rely on the environment */
}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const SITE = process.env.LOCAL_SITE_URL ?? "http://localhost:4200";

if (!TOKEN || !SECRET) {
  console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_WEBHOOK_SECRET in .env.local");
  process.exit(1);
}

// A registered webhook blocks getUpdates — remove it for local polling.
await fetch(`https://api.telegram.org/bot${TOKEN}/deleteWebhook`);
console.log(`Polling Telegram → forwarding to ${SITE}/api/telegram (Ctrl+C to stop)`);

let offset = 0;
let lastCron = 0;

for (;;) {
  try {
    if (Date.now() - lastCron > 60_000) {
      lastCron = Date.now();
      fetch(`${SITE}/api/cron/reminders`, {
        headers: process.env.CRON_SECRET
          ? { authorization: `Bearer ${process.env.CRON_SECRET}` }
          : {},
      })
        .then(async (r) => {
          const data = await r.json().catch(() => ({}));
          if (data.fired) console.log(`⏰ fired ${data.fired} reminder(s)`);
        })
        .catch(() => {});
    }

    const res = await fetch(
      `https://api.telegram.org/bot${TOKEN}/getUpdates?timeout=50&offset=${offset}`,
      { signal: AbortSignal.timeout(60_000) },
    );
    const data = await res.json();
    if (!data.ok) {
      console.error("getUpdates error:", data.description);
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    for (const update of data.result) {
      offset = update.update_id + 1;
      const from = update.message?.chat?.id;
      const text = update.message?.text;
      if (text) console.log(`← [${from}] ${text}`);
      const fwd = await fetch(`${SITE}/api/telegram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-bot-api-secret-token": SECRET,
        },
        body: JSON.stringify(update),
      });
      if (!fwd.ok) console.error("webhook forward failed:", fwd.status);
    }
  } catch (e) {
    console.error("poll error:", e.message ?? e);
    await new Promise((r) => setTimeout(r, 5000));
  }
}
