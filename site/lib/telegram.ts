import { repo } from "@/lib/db";

/**
 * Telegram transport layer — thin wrappers over the Bot API.
 *
 * Admin identity = the UNION of two lists:
 *  - TELEGRAM_ADMIN_CHAT_IDS env var (comma-separated; TELEGRAM_CHAT_ID kept
 *    as single-ID fallback) — the tamper-proof bootstrap. A hijacked admin
 *    session cannot remove these, because env changes require server access.
 *  - settings.telegramAdminIds — managed in /admin/telegram (behind MFA),
 *    for conveniently adding/removing extra admins.
 * Only these IDs get secretary access; everyone else gets a polite brush-off.
 */

function envAdminIds(): string[] {
  const multi = process.env.TELEGRAM_ADMIN_CHAT_IDS ?? "";
  const single = process.env.TELEGRAM_CHAT_ID ?? "";
  return [...multi.split(","), single].map((s) => s.trim()).filter(Boolean);
}

export async function adminChatIds(): Promise<string[]> {
  const settings = await repo.getSettings();
  const fromDb = (settings.telegramAdminIds ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...envAdminIds(), ...fromDb])];
}

export async function isAdminChat(chatId: string | number): Promise<boolean> {
  return (await adminChatIds()).includes(String(chatId));
}

/** One row = one array; e.g. [[btn],[btn,btn]] renders two rows. */
export type InlineKeyboard = { text: string; callback_data: string }[][];

/**
 * Telegram aligns each line by its first strongly-directional character, so
 * Hebrew lines that open with ✓ / emoji / digits / #id render LTR. An
 * invisible RLM (U+200F) prefix on every Hebrew-containing line forces RTL;
 * pure-Latin lines (URLs etc.) are left alone so links stay clickable.
 */
function forceRtl(text: string): string {
  return text
    .split("\n")
    .map((line) =>
      /[֐-׿]/.test(line) && !line.startsWith("‏")
        ? `‏${line}`
        : line,
    )
    .join("\n");
}

export async function tgSend(
  chatId: string | number,
  text: string,
  keyboard?: InlineKeyboard,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const rtlText = forceRtl(text);
  // Telegram caps messages at 4096 chars — split long secretary answers;
  // the keyboard rides on the last chunk so it sits under the message
  const chunks: string[] = [];
  for (let i = 0; i < rtlText.length; i += 4000) chunks.push(rtlText.slice(i, i + 4000));
  for (let i = 0; i < chunks.length; i++) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunks[i],
        ...(keyboard && i === chunks.length - 1
          ? { reply_markup: { inline_keyboard: keyboard } }
          : {}),
      }),
    });
    if (!res.ok) {
      console.error("telegram send failed:", res.status, await res.text());
      return;
    }
  }
}

/** Push the same message to every configured admin (lead alerts, reminders). */
export async function tgSendToAdmins(
  text: string,
  keyboard?: InlineKeyboard,
): Promise<void> {
  const ids = await adminChatIds();
  await Promise.allSettled(ids.map((id) => tgSend(id, text, keyboard)));
}

/** Clears the button's loading spinner and optionally flashes a toast. */
export async function tgAnswerCallback(
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  }).catch((e) => console.error("answerCallbackQuery failed:", e));
}

/** Fire-and-forget activity log shown in /admin/telegram. */
export function logTelegram(
  kind: "in" | "out" | "cron",
  text: string,
  chatId?: string | number,
): void {
  repo
    .appendTelegramLog({
      at: new Date().toISOString(),
      kind,
      chatId: chatId === undefined ? undefined : String(chatId),
      text: text.slice(0, 400),
    })
    .catch((e) => console.error("telegram log failed:", e));
}

export interface RecentChat {
  id: string;
  name: string;
  lastText: string;
}

/**
 * Discovery helper for /admin/telegram: who messaged the bot recently.
 * Read-only getUpdates (no offset commit). Returns null on conflict —
 * i.e. while the local poll script or a webhook holds the updates stream.
 */
export async function recentChats(): Promise<RecentChat[] | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return [];
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
      cache: "no-store",
    });
    if (res.status === 409) return null;
    const data = (await res.json()) as {
      ok: boolean;
      result?: {
        message?: {
          text?: string;
          chat?: { id?: number; first_name?: string; last_name?: string; username?: string };
        };
      }[];
    };
    if (!data.ok) return [];
    const byId = new Map<string, RecentChat>();
    for (const update of data.result ?? []) {
      const chat = update.message?.chat;
      if (!chat?.id) continue;
      const name =
        [chat.first_name, chat.last_name].filter(Boolean).join(" ") ||
        chat.username ||
        "ללא שם";
      byId.set(String(chat.id), {
        id: String(chat.id),
        name,
        lastText: (update.message?.text ?? "").slice(0, 40),
      });
    }
    return [...byId.values()];
  } catch (e) {
    console.error("telegram discovery failed:", e);
    return [];
  }
}
