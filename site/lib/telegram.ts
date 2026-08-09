/**
 * Telegram transport layer — thin wrappers over the Bot API.
 * Admin identity lives here: TELEGRAM_ADMIN_CHAT_IDS is a comma-separated
 * list of chat IDs (TELEGRAM_CHAT_ID kept as a single-admin fallback).
 * Only these IDs get secretary access; everyone else gets a polite brush-off.
 */

export function adminChatIds(): string[] {
  const multi = process.env.TELEGRAM_ADMIN_CHAT_IDS ?? "";
  const single = process.env.TELEGRAM_CHAT_ID ?? "";
  return [...multi.split(","), single]
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);
}

export function isAdminChat(chatId: string | number): boolean {
  return adminChatIds().includes(String(chatId));
}

export async function tgSend(chatId: string | number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  // Telegram caps messages at 4096 chars — split long secretary answers
  for (let i = 0; i < text.length; i += 4000) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(i, i + 4000) }),
    });
    if (!res.ok) {
      console.error("telegram send failed:", res.status, await res.text());
      return;
    }
  }
}

/** Push the same message to every configured admin (lead alerts, reminders). */
export async function tgSendToAdmins(text: string): Promise<void> {
  await Promise.allSettled(adminChatIds().map((id) => tgSend(id, text)));
}
