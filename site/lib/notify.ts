import type { Lead } from "@/lib/db";
import { tgSendToAdmins } from "@/lib/telegram";

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
  lines.push(`אפשר להמשיך מכאן: «פרטים על #${lead.id.slice(0, 8)}» · «סמן שדיברתי איתו» · «שלח לו הצעת מחיר» · «תזכיר לי עליו בעוד X שעות»`);
  return lines.join("\n");
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
  }
}

async function sendTelegram(text: string): Promise<void> {
  await tgSendToAdmins(text);
}

async function sendEmail(subject: string, text: string): Promise<void> {
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
      from: process.env.LEAD_EMAIL_FROM ?? "leads@resend.dev",
      to,
      subject,
      text,
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
    sendTelegram(text),
    sendEmail(subject, text),
  ]);
  for (const r of results) {
    if (r.status === "rejected") console.error("notify error:", r.reason);
  }
}
