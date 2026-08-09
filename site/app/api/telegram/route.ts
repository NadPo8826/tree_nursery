import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { repo } from "@/lib/db";
import type { ConvoTurn } from "@/lib/db";
import {
  downloadTelegramPhoto,
  isAdminChat,
  logTelegram,
  tgAnswerCallback,
  tgSend,
  tgTyping,
  type InlineKeyboard,
} from "@/lib/telegram";
import { runSecretary } from "@/lib/secretary";

/**
 * Telegram webhook — the secretary's front door.
 * Security layers:
 * 1. x-telegram-bot-api-secret-token must equal TELEGRAM_WEBHOOK_SECRET
 *    (set when registering the webhook), so only Telegram can call us.
 * 2. Only admin chat IDs (env ∪ admin panel) reach the secretary; anyone
 *    else gets one polite refusal per hour and is otherwise ignored.
 *
 * Identity is ONLY message.chat.id — a value Telegram's servers set and a
 * sender cannot forge. We deliberately never look at display names,
 * usernames, forwarded-from headers, or contact-card attachments.
 *
 * Conversations are persisted in the DB with session semantics: after
 * convoTimeoutMin minutes of silence a conversation is considered over —
 * the next message starts a fresh session (with a quick-action menu), and
 * the previous transcript rides along as background so the owner can still
 * say "לגבי מה שדיברנו קודם".
 */
const refusedAt = new Map<string, number>();

interface TgUpdate {
  message?: {
    text?: string;
    caption?: string;
    photo?: { file_id: string }[];
    chat?: { id?: number | string };
  };
  callback_query?: {
    id: string;
    data?: string;
    from?: { id?: number | string };
  };
}

/** Quick actions offered at the start of every new conversation. */
function menuKeyboard(hasPrevious: boolean): InlineKeyboard {
  return [
    ...(hasPrevious
      ? [[{ text: "↩ להמשיך את השיחה הקודמת", callback_data: "mn:resume" }]]
      : []),
    [{ text: "📥 פניות שלא טופלו", callback_data: "mn:leads" }],
    [
      { text: "📊 סיכום השבוע", callback_data: "mn:stats" },
      { text: "⏰ תזכורות פתוחות", callback_data: "mn:reminders" },
    ],
    [
      { text: "✉ הצעת מחיר", callback_data: "mn:quote" },
      { text: "🌳 עדכון קטלוג", callback_data: "mn:catalog" },
    ],
  ];
}

const MENU_PROMPTS: Record<string, string> = {
  leads: "אילו פניות עוד לא טופלו?",
  stats: "תן לי סיכום של השבוע האחרון — פניות ומבקרים באתר.",
  reminders: "אילו תזכורות פתוחות יש לי?",
  quote: "אני רוצה לשלוח הצעת מחיר. שאל אותי למי ועל מה.",
  catalog: "אני רוצה לעדכן משהו בקטלוג (מחיר / מבצע / זמינות / עץ חדש). שאל אותי מה.",
};

/**
 * Runs the secretary with session semantics and replies. Returns nothing;
 * shared by text messages, photos, and button taps.
 */
async function converse(chatId: string | number, text: string): Promise<void> {
  const chatKey = String(chatId);
  const [settings, stored] = await Promise.all([
    repo.getSettings(),
    repo.getTelegramConvo(chatKey),
  ]);
  const timeoutMs = Math.max(5, settings.convoTimeoutMin || 30) * 60_000;
  const lastAt = stored.length > 0 ? new Date(stored[stored.length - 1].at).getTime() : 0;
  const isNewSession = stored.length === 0 || Date.now() - lastAt > timeoutMs;

  // a new session starts truly clean — previous turns come back ONLY via
  // the explicit "resume last conversation" button (which un-expires them)
  const activeTurns: ConvoTurn[] = isNewSession ? [] : stored;

  const userTurn: ConvoTurn = {
    role: "user",
    content: text.slice(0, 2000),
    at: new Date().toISOString(),
  };
  const history = [...activeTurns, userTurn];

  tgTyping(chatId); // instant feedback while the model thinks
  try {
    const reply = await runSecretary(
      history.slice(-20).map(({ role, content }) => ({ role, content })),
    );
    // reply FIRST — persistence and logging happen after, off the hot path
    await tgSend(
      chatId,
      reply,
      isNewSession ? menuKeyboard(stored.length > 0) : undefined,
    );
    const assistantTurn: ConvoTurn = {
      role: "assistant",
      content: reply,
      at: new Date().toISOString(),
    };
    repo
      .saveTelegramConvo(chatKey, [...history, assistantTurn])
      .catch((e) => console.error("convo save failed:", e));
    logTelegram("out", reply, chatId);
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
    const [action, arg1, arg2] = cb.data.split(":");
    logTelegram("in", `[כפתור] ${cb.data}`, cbChatId);

    // quick-action menu buttons
    if (action === "mn") {
      if (arg1 === "resume") {
        // "un-expire" the stored conversation: touching the last turn's
        // timestamp makes the next message continue it as an active session
        const chatKey = String(cbChatId);
        const stored = await repo.getTelegramConvo(chatKey);
        if (stored.length === 0) {
          await tgAnswerCallback(cb.id, "אין שיחה קודמת");
          return NextResponse.json({ ok: true });
        }
        stored[stored.length - 1] = {
          ...stored[stored.length - 1],
          at: new Date().toISOString(),
        };
        await repo.saveTelegramConvo(chatKey, stored);
        await tgAnswerCallback(cb.id, "ממשיכים ↩");
        const lastAssistant = [...stored].reverse().find((t) => t.role === "assistant");
        const msg = lastAssistant
          ? `ממשיכים מאיפה שעצרנו. ההודעה האחרונה שלי הייתה:\n«${lastAssistant.content.slice(0, 500)}»`
          : "ממשיכים מאיפה שעצרנו — במה עצרנו?";
        logTelegram("out", msg, cbChatId);
        await tgSend(cbChatId, msg);
        return NextResponse.json({ ok: true });
      }
      await tgAnswerCallback(cb.id);
      const prompt = MENU_PROMPTS[arg1];
      if (prompt) await converse(cbChatId, prompt);
      return NextResponse.json({ ok: true });
    }

    // lead-alert buttons carry a lead id
    const lead = (await repo.getLeads()).find((l) => l.id === arg1);
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
      const hours = Number(arg2) || 3;
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
      await converse(
        cbChatId,
        `אני רוצה לשלוח הצעת מחיר לפנייה #${lead.id.slice(0, 8)}. בדוק את הפנייה והנחה אותי.`,
      );
    } else {
      await tgAnswerCallback(cb.id);
    }
    return NextResponse.json({ ok: true });
  }

  const chatId = update.message?.chat?.id;
  // Always answer Telegram 200 — otherwise it retries the same update forever
  if (chatId === undefined) return NextResponse.json({ ok: true });

  // --- photo from the field: save it, then let the secretary decide what
  // to do with it (new tree / replace an existing tree's photo) ----------
  const photoSizes = update.message?.photo;
  if (photoSizes && photoSizes.length > 0) {
    if (!(await isAdminChat(chatId))) return NextResponse.json({ ok: true });
    const saved = await downloadTelegramPhoto(photoSizes[photoSizes.length - 1].file_id);
    const caption = update.message?.caption?.trim() ?? "";
    logTelegram("in", `[תמונה] ${caption || "(ללא כיתוב)"}`, chatId);
    if (!saved) {
      await tgSend(chatId, "לא הצלחתי לשמור את התמונה — נסה שוב.");
      return NextResponse.json({ ok: true });
    }
    await converse(
      chatId,
      `[שלחתי תמונה — נשמרה בנתיב ${saved}]\n${
        caption ||
        "בלי כיתוב. שאל אותי: עץ חדש לקטלוג, או החלפת תמונה לעץ קיים (ולאיזה)?"
      }`,
    );
    return NextResponse.json({ ok: true });
  }

  const text = update.message?.text?.trim();
  if (!text) return NextResponse.json({ ok: true });

  if (!(await isAdminChat(chatId))) {
    const chatKey = String(chatId);
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
    // /reset wipes memory; /start keeps it so "resume" stays available
    if (text === "/reset") await repo.saveTelegramConvo(String(chatId), []);
    const stored =
      text === "/reset" ? [] : await repo.getTelegramConvo(String(chatId));
    await tgSend(
      chatId,
      "שלום! אני המזכיר של המשתלה. במה אפשר לעזור?\nאפשר ללחוץ על כפתור — או פשוט לכתוב לי חופשי.",
      menuKeyboard(stored.length > 0),
    );
    return NextResponse.json({ ok: true });
  }

  logTelegram("in", text, chatId);
  await converse(chatId, text);
  return NextResponse.json({ ok: true });
}
