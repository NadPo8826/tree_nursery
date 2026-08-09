import { repo } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";
import { parseAdminEntries, recentChats } from "@/lib/telegram";
import { SaveButton } from "@/components/admin/SaveButton";
import {
  addTelegramAdminAction,
  removeTelegramAdminAction,
  saveTelegramSettingsAction,
} from "../actions";
import Link from "next/link";

const QUOTE_TEMPLATE_EXAMPLE = `שלום {שם},

תודה על הפנייה למשתלת עץ הדומים. להלן הצעת המחיר:

{פירוט}

תוספות:
{תוספות}

סה"כ: {סה"כ} ₪
ההצעה בתוקף 14 יום.

בברכה,
עץ הדומים · {טלפון}`;

function ilTime(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", {
    timeZone: "Asia/Jerusalem",
    dateStyle: "short",
    timeStyle: "short",
  });
}

const kindBadge: Record<string, { label: string; cls: string }> = {
  in: { label: "נכנס", cls: "bg-sand text-ink" },
  out: { label: "יוצא", cls: "bg-leaf/15 text-leaf" },
  cron: { label: "אוטומטי", cls: "bg-gold-bright/25 text-soil" },
};

export default async function AdminTelegramPage({
  searchParams,
}: {
  searchParams: Promise<{ discover?: string }>;
}) {
  await requireAdminPage();
  const [settings, log] = await Promise.all([
    repo.getSettings(),
    repo.getTelegramLog(),
  ]);
  const doDiscover = (await searchParams).discover === "1";
  const discovered = doDiscover ? await recentChats() : undefined;

  const tokenSet = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  const envEntries = parseAdminEntries(
    [process.env.TELEGRAM_ADMIN_CHAT_IDS, process.env.TELEGRAM_CHAT_ID]
      .filter(Boolean)
      .join(","),
  );
  const dbEntries = parseAdminEntries(settings.telegramAdminIds);
  // discovery rows prefill a login-safe username from the Telegram name
  const suggestName = (raw: string) =>
    raw.replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 20);

  return (
    <div>
      <h1 className="font-display text-3xl">המזכיר בטלגרם</h1>
      <p className="mt-1 text-sm text-ink-muted">
        התראות על פניות, תזכורות, סיכום בוקר והצעות מחיר — הכול מהטלפון.
      </p>

      {/* status */}
      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        <span className={`rounded-full px-4 py-1.5 ${tokenSet ? "bg-leaf/15 text-leaf" : "bg-red-100 text-red-700"}`}>
          {tokenSet ? "✓ בוט מחובר" : "חסר TELEGRAM_BOT_TOKEN בשרת"}
        </span>
        <span className="rounded-full bg-sand px-4 py-1.5">
          מנהלים מקובץ השרת: {envEntries.length}
        </span>
      </div>

      <div className="mt-6 grid max-w-4xl gap-6 lg:grid-cols-2">
        {/* admins */}
        <section className="rounded-2xl border-[1.5px] border-line-sand bg-card p-5">
          <h2 className="font-display text-xl">מי יכול לדבר עם הבוט</h2>
          <p className="mt-1 text-xs text-ink-muted">
            רק חשבונות ברשימה מקבלים מענה. שם המשתמש משמש גם לכניסה לניהול —
            בכניסה נשלח קוד חד־פעמי לטלגרם של אותו משתמש. מזהים מקובץ השרת
            אינם ניתנים להסרה מכאן (הגנת גיבוי).
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {envEntries.map((entry) => (
              <li key={entry.chatId} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate">
                  {entry.name || <span className="text-ink-muted">ללא שם משתמש</span>}{" "}
                  <span dir="ltr" className="text-xs text-ink-muted tabular-nums">
                    {entry.chatId}
                  </span>
                </span>
                <span className="rounded-full bg-sand px-2 py-0.5 text-[11px]">קובץ שרת</span>
              </li>
            ))}
            {dbEntries.map((entry) => (
              <li key={entry.chatId} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate">
                  {entry.name || <span className="text-ink-muted">ללא שם משתמש</span>}{" "}
                  <span dir="ltr" className="text-xs text-ink-muted tabular-nums">
                    {entry.chatId}
                  </span>
                </span>
                <form action={removeTelegramAdminAction}>
                  <input type="hidden" name="chatId" value={entry.chatId} />
                  <SaveButton toast="המנהל הוסר" className="text-xs text-red-700 hover:underline">
                    הסרה
                  </SaveButton>
                </form>
              </li>
            ))}
            {envEntries.length + dbEntries.length === 0 && (
              <li className="text-xs text-ink-muted">אין עדיין מנהלים.</li>
            )}
          </ul>

          <form action={addTelegramAdminAction} className="mt-4 flex flex-wrap gap-2">
            <input
              name="name"
              placeholder="שם משתמש (לכניסה)"
              className="admin-input min-w-32 flex-1"
            />
            <input
              name="chatId"
              dir="ltr"
              placeholder="מזהה צ'אט (מספר)"
              className="admin-input min-w-32 flex-1"
            />
            <SaveButton toast="המנהל נוסף" className="shrink-0 rounded-full bg-clay px-4 py-2 text-sm font-semibold text-white">
              הוספה
            </SaveButton>
          </form>
          <p className="mt-1 text-[11px] text-ink-muted">
            שם משתמש: אותיות/ספרות/מקף בלבד, 2–20 תווים, ייחודי.
          </p>

          <div className="mt-4 border-t border-line-sand pt-3">
            <Link
              href="/admin/telegram?discover=1"
              className="text-sm font-semibold text-clay-deep hover:underline"
            >
              מי כתב לבוט לאחרונה? ←
            </Link>
            <p className="mt-1 text-[11px] text-ink-muted">
              שלחו הודעה לבוט מהחשבון שרוצים להוסיף, ואז לחצו. (לא זמין בזמן
              שסקריפט ההאזנה המקומי רץ — עצרו אותו רגע.)
            </p>
            {doDiscover && discovered === null && (
              <p className="mt-2 text-xs text-red-700">
                ערוץ העדכונים תפוס (סקריפט ההאזנה רץ) — עצרו אותו ונסו שוב.
              </p>
            )}
            {doDiscover && discovered && discovered.length === 0 && (
              <p className="mt-2 text-xs text-ink-muted">
                לא נמצאו הודעות אחרונות — שלחו הודעה לבוט ונסו שוב.
              </p>
            )}
            {discovered && discovered.length > 0 && (
              <ul className="mt-2 space-y-2">
                {discovered.map((chat) => (
                  <li key={chat.id} className="text-sm">
                    <span className="block truncate">
                      {chat.name}{" "}
                      <span dir="ltr" className="text-xs text-ink-muted tabular-nums">
                        {chat.id}
                      </span>
                    </span>
                    <form action={addTelegramAdminAction} className="mt-1 flex gap-2">
                      <input type="hidden" name="chatId" value={chat.id} />
                      <input
                        name="name"
                        defaultValue={suggestName(chat.name)}
                        placeholder="שם משתמש"
                        className="admin-input flex-1 py-1 text-xs"
                      />
                      <SaveButton toast="המנהל נוסף" className="shrink-0 rounded-full border-[1.5px] border-clay px-3 py-1 text-xs font-semibold text-clay-deep hover:bg-clay hover:text-white">
                        הוסף כמנהל
                      </SaveButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* schedule + template */}
        <form
          key={JSON.stringify({ d: settings.digestHour, n: settings.nagAfterHours, q: settings.quoteTemplateHe, w: settings.weeklyDay, wh: settings.weeklyHour, c: settings.convoTimeoutMin })}
          action={saveTelegramSettingsAction}
          className="space-y-5 rounded-2xl border-[1.5px] border-line-sand bg-card p-5"
        >
          <h2 className="font-display text-xl">אוטומציות</h2>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-xs text-ink-muted">
              סיכום בוקר יומי
              <select name="digestHour" defaultValue={settings.digestHour} className="admin-input">
                <option value={-1}>כבוי</option>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-ink-muted">
              התראה על פנייה שממתינה מעל (שעות)
              <input
                name="nagAfterHours"
                type="number"
                min={0}
                defaultValue={settings.nagAfterHours}
                className="admin-input"
              />
              <span className="mt-1 block text-[11px]">0 = כבוי. נשלחת פעם אחת לכל פנייה.</span>
            </label>
            <label className="block text-xs text-ink-muted">
              סגירת שיחה אחרי (דקות ללא מענה)
              <input
                name="convoTimeoutMin"
                type="number"
                min={5}
                defaultValue={settings.convoTimeoutMin}
                className="admin-input"
              />
              <span className="mt-1 block text-[11px]">
                אחרי שקט כזה — ההודעה הבאה פותחת שיחה חדשה (עם כפתורי פעולות),
                והמזכיר עדיין זוכר את השיחה הקודמת כרקע.
              </span>
            </label>
            <label className="block text-xs text-ink-muted">
              סיכום שבועי — יום
              <select name="weeklyDay" defaultValue={settings.weeklyDay} className="admin-input">
                <option value={-1}>כבוי</option>
                {["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"].map(
                  (day, i) => (
                    <option key={i} value={i}>
                      {day}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="block text-xs text-ink-muted">
              סיכום שבועי — שעה
              <select name="weeklyHour" defaultValue={settings.weeklyHour} className="admin-input">
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-xs text-ink-muted">
            תבנית הצעת המחיר
            <textarea
              name="quoteTemplateHe"
              defaultValue={settings.quoteTemplateHe}
              rows={10}
              placeholder={QUOTE_TEMPLATE_EXAMPLE}
              className="admin-input font-mono text-xs"
            />
            <span className="mt-1 block text-[11px] leading-relaxed">
              המזכיר ממלא את התבנית ומציג לאישורכם לפני שליחה. סמנים מומלצים:
              ‎{"{שם} {פירוט} {תוספות} {סה\"כ} {טלפון}"}‎ — אפשר גם לנסח חופשי,
              המזכיר יבין. ריק — המזכיר בונה מסמך מסודר בעצמו.
            </span>
          </label>

          <SaveButton className="min-h-11 rounded-full bg-clay px-6 py-2 text-sm font-semibold text-white">
            שמירה
          </SaveButton>
        </form>
      </div>

      {/* activity log */}
      <section className="mt-8 max-w-4xl">
        <h2 className="font-display text-xl">יומן פעילות</h2>
        <p className="mt-1 text-xs text-ink-muted">
          200 האירועים האחרונים: שיחות מול המזכיר והודעות אוטומטיות (תזכורות,
          סיכום בוקר, התראות).
        </p>
        {log.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            אין עדיין פעילות — שלחו הודעה לבוט והיא תופיע כאן.
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {[...log].reverse().slice(0, 200).map((entry, i) => {
              const badge = kindBadge[entry.kind] ?? kindBadge.cron;
              return (
                <li
                  key={`${entry.at}-${i}`}
                  className="flex items-baseline gap-3 rounded-xl border border-line-sand/60 bg-card px-4 py-2 text-sm"
                >
                  <span className="shrink-0 text-xs text-ink-muted tabular-nums">
                    {ilTime(entry.at)}
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <span className="min-w-0 flex-1 break-words">{entry.text}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
