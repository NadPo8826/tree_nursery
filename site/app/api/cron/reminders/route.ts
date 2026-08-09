import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/db";
import { tgSendToAdmins } from "@/lib/telegram";

/**
 * Fires due reminders to the admin Telegram accounts.
 * Called every minute — by Vercel Cron in production (sends
 * Authorization: Bearer CRON_SECRET) or by scripts/telegram-poll.mjs
 * during local dev.
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

  const reminders = await repo.getReminders();
  const now = Date.now();
  const due = reminders.filter((r) => !r.done && new Date(r.dueAt).getTime() <= now);
  if (due.length === 0) return NextResponse.json({ ok: true, fired: 0 });

  const leads = await repo.getLeads();
  for (const r of due) {
    const lead = r.leadId ? leads.find((l) => l.id === r.leadId) : undefined;
    const lines = [`⏰ תזכורת: ${r.noteHe}`];
    if (lead) lines.push(`פנייה: ${lead.name} · ${lead.phone}${lead.email ? ` · ${lead.email}` : ""}`);
    await tgSendToAdmins(lines.join("\n"));
  }

  await repo.saveReminders(
    reminders.map((r) => (due.some((d) => d.id === r.id) ? { ...r, done: true } : r)),
  );
  return NextResponse.json({ ok: true, fired: due.length });
}
