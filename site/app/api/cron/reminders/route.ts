import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/db";
import { logTelegram, tgSendToAdmins } from "@/lib/telegram";
import { isOnSale } from "@/lib/catalog";

/**
 * The secretary's clock — called every minute (systemd/Vercel cron in
 * production with Authorization: Bearer CRON_SECRET, or by
 * scripts/telegram-poll.mjs during local dev). Fires:
 *  - due reminders ("תזכיר לי בעוד 3 שעות")
 *  - one-time nags for leads stuck in "new" past the configured threshold
 *  - the once-a-day morning digest at the configured Israel-time hour
 */
export async function GET(req: NextRequest) {
  // Fail closed: in production a CRON_SECRET is mandatory; without it the
  // endpoint refuses everyone. Only local dev may run without a secret.
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const [reminders, leads, settings, state] = await Promise.all([
    repo.getReminders(),
    repo.getLeads(),
    repo.getSettings(),
    repo.getTelegramState(),
  ]);
  const now = Date.now();

  // --- due reminders ---------------------------------------------------
  const due = reminders.filter((r) => !r.done && new Date(r.dueAt).getTime() <= now);
  for (const r of due) {
    const lead = r.leadId ? leads.find((l) => l.id === r.leadId) : undefined;
    const lines = [`⏰ תזכורת: ${r.noteHe}`];
    if (lead) lines.push(`פנייה: ${lead.name} · ${lead.phone}${lead.email ? ` · ${lead.email}` : ""}`);
    logTelegram("cron", lines[0]);
    await tgSendToAdmins(lines.join("\n"));
  }
  if (due.length > 0) {
    await repo.saveReminders(
      reminders.map((r) => (due.some((d) => d.id === r.id) ? { ...r, done: true } : r)),
    );
  }

  // --- stuck leads: real-time nag, once per lead -----------------------
  const nagMs = settings.nagAfterHours > 0 ? settings.nagAfterHours * 3_600_000 : 0;
  const stuck = nagMs
    ? leads.filter(
        (l) => l.status === "new" && now - new Date(l.createdAt).getTime() > nagMs,
      )
    : [];
  const toNag = stuck.filter((l) => !state.naggedLeadIds.includes(l.id));
  let stateChanged = false;
  if (toNag.length > 0) {
    const lines = [
      toNag.length === 1
        ? "⚠️ פנייה שמחכה כבר מעל הסף:"
        : `⚠️ ${toNag.length} פניות שמחכות כבר מעל הסף:`,
      ...toNag.map(
        (l) =>
          `• ${l.name} · ${l.phone} · #${l.id.slice(0, 8)} (${Math.round(
            (now - new Date(l.createdAt).getTime()) / 3_600_000,
          )} שעות)`,
      ),
      "«סמן שדיברתי איתו» יעצור את התזכורות לפנייה.",
    ];
    logTelegram("cron", `נשלחה התראה על ${toNag.length} פניות מעל סף ההמתנה`);
    await tgSendToAdmins(lines.join("\n"));
    state.naggedLeadIds.push(...toNag.map((l) => l.id));
    stateChanged = true;
  }
  // keep the tracking list bounded to leads that still exist
  const known = new Set(leads.map((l) => l.id));
  const pruned = state.naggedLeadIds.filter((id) => known.has(id));
  if (pruned.length !== state.naggedLeadIds.length) {
    state.naggedLeadIds = pruned;
    stateChanged = true;
  }

  // --- morning digest, once per day at the configured Israel-time hour --
  const il = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    hour: "numeric",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const ilDate = `${il.find((p) => p.type === "year")!.value}-${il.find((p) => p.type === "month")!.value}-${il.find((p) => p.type === "day")!.value}`;
  const ilHour = Number(il.find((p) => p.type === "hour")!.value);

  let digestSent = false;
  if (
    settings.digestHour >= 0 &&
    ilHour >= settings.digestHour &&
    state.lastDigestDate !== ilDate
  ) {
    const dayMs = 86_400_000;
    const newToday = leads.filter((l) => now - new Date(l.createdAt).getTime() < dayMs);
    const unanswered = leads.filter((l) => l.status === "new");
    const oldest = unanswered.sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt),
    )[0];
    const dueToday = reminders.filter(
      (r) => !r.done && new Date(r.dueAt).getTime() - now < dayMs,
    );
    const trees = await repo.getTrees();
    const promoCount = trees.filter(isOnSale).length;

    const lines = [
      `☀️ בוקר טוב! סיכום ${settings.siteName}:`,
      `פניות חדשות ביממה האחרונה: ${newToday.length}`,
      unanswered.length > 0
        ? `ממתינות למענה: ${unanswered.length}${
            oldest
              ? ` (הוותיקה ביותר — ${oldest.name}, לפני ${Math.round(
                  (now - new Date(oldest.createdAt).getTime()) / 3_600_000,
                )} שעות)`
              : ""
          }`
        : "אין פניות ממתינות — כל הכבוד! ✅",
      dueToday.length > 0 ? `תזכורות להיום: ${dueToday.length}` : null,
      promoCount > 0 ? `מבצעים פעילים באתר: ${promoCount}` : null,
      stuck.length > 0
        ? `⚠️ מעל סף ההמתנה (${settings.nagAfterHours} ש׳): ${stuck.length} פניות`
        : null,
      `אפשר לשאול אותי: «אילו פניות עוד לא טופלו?»`,
    ].filter(Boolean) as string[];
    logTelegram("cron", "נשלח סיכום הבוקר היומי");
    await tgSendToAdmins(lines.join("\n"));
    state.lastDigestDate = ilDate;
    stateChanged = true;
    digestSent = true;
  }

  if (stateChanged) await repo.saveTelegramState(state);
  return NextResponse.json({
    ok: true,
    fired: due.length,
    nagged: toNag.length,
    digest: digestSent,
  });
}
