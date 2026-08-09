import { repo } from "@/lib/db";
import type { Lead } from "@/lib/db";
import { tgSendToAdmins } from "@/lib/telegram";

/**
 * Hebrew plain-text renders unpredictably (often LTR) across mail clients —
 * ship an explicit RTL HTML body alongside the text fallback. Content is
 * entity-escaped before injection.
 */
export function rtlEmailHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div dir="rtl" style="text-align:right;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;white-space:pre-wrap;">${escaped}</div>`;
}

/** "quotes@domain" → "עץ הדומים <quotes@domain>" unless a name is already set. */
export async function emailFrom(): Promise<string> {
  const raw = process.env.LEAD_EMAIL_FROM ?? "onboarding@resend.dev";
  if (raw.includes("<")) return raw;
  const { siteName } = await repo.getSettings();
  return `${siteName} <${raw}>`;
}

/**
 * Owner notifications for new leads: email (Resend) + Telegram bot push.
 * Each channel activates only when its env vars are present; failures are
 * logged, never thrown — a lead must always be saved even if notifying fails.
 */
function leadSummary(lead: Lead): string {
  const lines = [
    `🌳 ליד חדש מהאתר (${channelLabel(lead.channel)}) · #${lead.id.slice(0, 8)}`,
    `שם: ${lead.name}`,
    `טלפון: ${lead.phone}`,
  ];
  if (lead.email) lines.push(`מייל: ${lead.email}`);
  if (lead.interest) lines.push(`מתעניין ב: ${lead.interest}`);
  if (lead.items.length > 0) {
    lines.push("עצים שנבחרו:");
    for (const item of lead.items) {
      lines.push(`- ${item.treeName} × ${item.qtyRange}`);
    }
  }
  if (lead.message) lines.push(`הודעה: ${lead.message}`);
  if (lead.isPro) lines.push("⚑ ליד מקצועי (B2B)");
  lines.push(`עמוד מקור: ${lead.sourcePage}`);
  return lines.join("\n");
}

/** One-tap actions under each lead alert; free-text requests still work. */
function leadKeyboard(lead: Lead) {
  return [
    [{ text: "✓ סמן שדיברתי איתו", callback_data: `st:${lead.id}` }],
    [
      { text: "✉ שלח הצעת מחיר", callback_data: `qt:${lead.id}` },
      { text: "⏰ תזכיר לי עוד 3 ש׳", callback_data: `rm:${lead.id}:3` },
    ],
  ];
}

function channelLabel(channel: Lead["channel"]): string {
  switch (channel) {
    case "form":
      return "טופס";
    case "rfq":
      return "בחירת עצים";
    case "ai_chat":
      return "צ'אט";
    case "whatsapp_click":
      return "וואטסאפ";
    case "manual":
      return "ידני / טלפון";
  }
}

async function sendTelegram(lead: Lead, text: string): Promise<void> {
  await tgSendToAdmins(text, leadKeyboard(lead));
}

async function sendEmail(
  subject: string,
  text: string,
  replyTo?: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_EMAIL_TO;
  if (!apiKey || !to) return;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: await emailFrom(),
      to,
      // replying to a lead alert opens a mail to the customer directly
      ...(replyTo && { reply_to: replyTo }),
      subject,
      text,
      html: rtlEmailHtml(text),
    }),
  });
  if (!res.ok) {
    console.error("email notify failed:", res.status, await res.text());
  }
}

export async function notifyNewLead(lead: Lead): Promise<void> {
  const text = leadSummary(lead);
  const subject = `ליד חדש: ${lead.name} — ${lead.interest || channelLabel(lead.channel)}`;
  const results = await Promise.allSettled([
    sendTelegram(lead, text),
    sendEmail(subject, text, lead.email),
  ]);
  for (const r of results) {
    if (r.status === "rejected") console.error("notify error:", r.reason);
  }
}
