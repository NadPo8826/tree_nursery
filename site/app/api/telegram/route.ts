import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { repo } from "@/lib/db";
import {
  isAdminChat,
  logTelegram,
  tgAnswerCallback,
  tgSend,
} from "@/lib/telegram";
import { runSecretary, type SecretaryTurn } from "@/lib/secretary";

/**
 * Telegram webhook — the secretary's front door.
 * Security layers:
 * 1. x-telegram-bot-api-secret-token must equal TELEGRAM_WEBHOOK_SECRET
 *    (set when registering the webhook), so only Telegram can call us.
 * 2. Only chat IDs in TELEGRAM_ADMIN_CHAT_IDS reach the secretary; anyone
 *    else gets one polite refusal per hour and is otherwise ignored.
 *
 * Identity is ONLY message.chat.id — a value Telegram's servers set and a
 * sender cannot forge. We deliberately never look at display names,
 * usernames, forwarded-from headers, or contact-card attachments: all of
 * those are sender-controlled content, so "sending the owner's contact" or
 * forwarding the owner's message proves nothing and grants nothing.
 *
 * Conversation memory is in-process (fine for a single dev/long-lived
 * server; on serverless it resets between cold starts — acceptable for a
 * secretary where each request is usually self-contained).
 */
const conversations = new Map<string, SecretaryTurn[]>();
const refusedAt = new Map<string, number>();

interface TgUpdate {
  message?: {
    text?: string;
    chat?: { id?: number | string };
  };
  callback_query?: {
    id: string;
    data?: string;
    from?: { id?: number | string };
  };
}

/** Runs the secretary on a text and replies; shared by messages and buttons. */
async function converse(chatKey: string, chatId: string | number, text: string) {
  const history = conversations.get(chatKey) ?? [];
  history.push({ role: "user", content: text.slice(0, 2000) });
  try {
    const reply = await runSecretary(history.slice(-20));
    history.push({ role: "assistant", content: reply });
    conversations.set(chatKey, history.slice(-20));
    logTelegram("out", reply, chatId);
    await tgSend(chatId, reply);
  } catch (e) {
    console.error("secretary failed:", e);
    await tgSend(chatId, "משהו נכשל אצלי — נסה שוב עוד רגע.");
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  // --- inline-button taps (callback_query) -----------------------------
  const cb = update.callback_query;
  if (cb?.data && cb.from?.id !== undefined) {
    const cbChatId = cb.from.id;
    if (!(await isAdminChat(cbChatId))) {
      await tgAnswerCallback(cb.id);
      return NextResponse.json({ ok: true });
    }
    const [action, leadId, arg] = cb.data.split(":");
    const lead = (await repo.getLeads()).find((l) => l.id === leadId);
    logTelegram("in", `[כפתור] ${cb.data}`, cbChatId);
    if (!lead) {
      await tgAnswerCallback(cb.id, "הפנייה כבר לא קיימת");
      return NextResponse.json({ ok: true });
    }
    if (action === "st") {
      await repo.setLeadStatus(lead.id, "contacted");
      await tgAnswerCallback(cb.id, "סומן ✓");
      const msg = `✓ ${lead.name} סומן כ"יצרנו קשר".`;
      logTelegram("out", msg, cbChatId);
      await tgSend(cbChatId, msg);
    } else if (action === "rm") {
      const hours = Number(arg) || 3;
      const reminders = await repo.getReminders();
      await repo.saveReminders([
        ...reminders,
        {
          id: randomUUID(),
          createdAt: new Date().toISOString(),
          dueAt: new Date(Date.now() + hours * 3_600_000).toISOString(),
          noteHe: `לחזור אל ${lead.name} (${lead.phone})`,
          leadId: lead.id,
          done: false,
        },
      ]);
      await tgAnswerCallback(cb.id, "תזכורת נקבעה ⏰");
      const msg = `⏰ אזכיר לך לחזור אל ${lead.name} בעוד ${hours} שעות.`;
      logTelegram("out", msg, cbChatId);
      await tgSend(cbChatId, msg);
    } else if (action === "qt") {
      await tgAnswerCallback(cb.id);
      // hand off to the secretary so the full quote flow (items, extras,
      // template, approval) runs as a conversation
      await converse(
        String(cbChatId),
        cbChatId,
        `אני רוצה לשלוח הצעת מחיר לפנייה #${lead.id.slice(0, 8)}. בדוק את הפנייה והנחה אותי.`,
      );
    } else {
      await tgAnswerCallback(cb.id);
    }
    return NextResponse.json({ ok: true });
  }

  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim();
  // Always answer Telegram 200 — otherwise it retries the same update forever
  if (chatId === undefined || !text) return NextResponse.json({ ok: true });

  const chatKey = String(chatId);

  if (!(await isAdminChat(chatId))) {
    const last = refusedAt.get(chatKey) ?? 0;
    if (Date.now() - last > 3_600_000) {
      refusedAt.set(chatKey, Date.now());
      await tgSend(
        chatId,
        "שלום! זהו בוט פנימי של צוות המשתלה. לשאלות על עצים ולתיאום ביקור — נשמח לראותכם באתר שלנו 🌳",
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (text === "/start" || text === "/reset") {
    conversations.set(chatKey, []);
    await tgSend(
      chatId,
      [
        "שלום! אני המזכיר של המשתלה. אפשר לבקש ממני למשל:",
        "• «אילו פניות עוד לא טופלו?»",
        "• «פרטים על הפנייה של דוד»",
        "• «סמן שדיברתי איתו»",
        "• «תזכיר לי בעוד 3 שעות לחזור אליו»",
        "• «שלח לו הצעת מחיר: 12,000 ₪ כולל הובלה ונטיעה»",
        "• «כמה פניות נכנסו השבוע?»",
        "",
        "/reset — מתחיל שיחה נקייה",
      ].join("\n"),
    );
    return NextResponse.json({ ok: true });
  }

  logTelegram("in", text, chatId);
  await converse(chatKey, chatId, text);
  return NextResponse.json({ ok: true });
}
