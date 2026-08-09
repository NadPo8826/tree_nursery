import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import { repo } from "@/lib/db";
import type { Lead, LeadStatus, Reminder } from "@/lib/db";
import {
  DEFAULT_SECRETARY_SYSTEM,
  effectivePrompt,
  fillPlaceholders,
} from "@/lib/ai-prompts";

/**
 * The owner-facing Telegram secretary. Runs ONLY for admin chat IDs —
 * the webhook gates access before this module is ever called.
 *
 * Unlike the visitor assistant, the secretary may write: update lead
 * status, create reminders, and send quote emails. It still cannot touch
 * the catalog or settings — those stay admin-panel-only on purpose, so a
 * hijacked Telegram account can't silently rewrite the public site.
 */

const MODEL = process.env.ASSISTANT_MODEL ?? "claude-opus-5";
const MAX_TOOL_ROUNDS = 6;
const client = new Anthropic();

export interface SecretaryTurn {
  role: "user" | "assistant";
  content: string;
}

function ilTime(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", {
    timeZone: "Asia/Jerusalem",
    dateStyle: "short",
    timeStyle: "short",
  });
}

function statusHe(s: LeadStatus): string {
  return { new: "חדש — טרם טופל", contacted: "יצרנו קשר", visited: "ביקר במשתלה", planted: "נטע" }[s];
}

function leadLine(lead: Lead): string {
  const bits = [
    `#${lead.id.slice(0, 8)}`,
    lead.name,
    lead.phone,
    lead.email ?? "(אין מייל)",
    statusHe(lead.status),
    ilTime(lead.createdAt),
  ];
  if (lead.interest) bits.push(lead.interest);
  return bits.join(" · ");
}

function findLead(leads: Lead[], ref: string): Lead | undefined {
  const clean = ref.replace(/^#/, "").trim();
  return leads.find((l) => l.id === clean || l.id.startsWith(clean));
}

const tools: Anthropic.Tool[] = [
  {
    name: "list_leads",
    description:
      "רשימת פניות (לידים) מהאתר. סנן לפי סטטוס — 'new' = פניות שטרם טופלו. ממוין מהחדש לישן.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["new", "contacted", "visited", "planted", "all"],
          description: "סטטוס לסינון. ברירת מחדל: all",
        },
        limit: { type: "number", description: "כמה להחזיר (ברירת מחדל 10)" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_lead",
    description: "פרטים מלאים על פנייה לפי מזהה (או תחילתו, למשל '3f2a91').",
    input_schema: {
      type: "object",
      properties: { id: { type: "string", description: "מזהה הפנייה או תחילתו" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "set_lead_status",
    description: "עדכון סטטוס פנייה: contacted (יצרנו קשר) / visited (ביקר) / planted (נטע) / new.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        status: { type: "string", enum: ["new", "contacted", "visited", "planted"] },
      },
      required: ["id", "status"],
      additionalProperties: false,
    },
  },
  {
    name: "lead_stats",
    description:
      "סטטיסטיקת פניות לתקופה: כמה נכנסו, לפי ערוץ (טופס/בחירת עצים/צ'אט) ולפי סטטוס. הערה: אין עדיין נתוני מבקרים באתר (אנליטיקס לא מחובר) — רק פניות.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "כמה ימים אחורה (ברירת מחדל 7)" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_reminder",
    description:
      "קביעת תזכורת. הבוט ישלח את התזכורת בטלגרם כשהזמן מגיע. אפשר לקשר לפנייה.",
    input_schema: {
      type: "object",
      properties: {
        due_in_hours: { type: "number", description: "בעוד כמה שעות (למשל 3 או 0.5)" },
        note: { type: "string", description: "טקסט התזכורת" },
        lead_id: { type: "string", description: "מזהה פנייה לקישור (רשות)" },
      },
      required: ["due_in_hours", "note"],
      additionalProperties: false,
    },
  },
  {
    name: "list_reminders",
    description: "רשימת התזכורות הפתוחות (שטרם נשלחו).",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "send_quote_email",
    description:
      "שליחת הצעת מחיר במייל ללקוח של פנייה. שלח רק אחרי שהצגת לבעלים את נוסח המייל המלא בהודעה קודמת והוא אישר במפורש. נכשל אם לפנייה אין כתובת מייל.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string" },
        subject: { type: "string", description: "נושא המייל" },
        body: { type: "string", description: "גוף המייל המלא בעברית, כפי שאושר" },
      },
      required: ["lead_id", "subject", "body"],
      additionalProperties: false,
    },
  },
  {
    name: "search_trees",
    description:
      "חיפוש בקטלוג העצים — כולל מחירים מלאים ומלאי (תצוגת אדמין). שימושי להרכבת הצעות מחיר.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "מילות חיפוש, ריק = הכול" } },
      additionalProperties: false,
    },
  },
];

async function buildSystemPrompt(): Promise<string> {
  const settings = await repo.getSettings();
  const now = new Date().toLocaleString("he-IL", {
    timeZone: "Asia/Jerusalem",
    dateStyle: "full",
    timeStyle: "short",
  });
  return fillPlaceholders(
    effectivePrompt(settings.aiPrompts.secretarySystem, DEFAULT_SECRETARY_SYSTEM),
    { siteName: settings.siteName, phone: settings.phone, now },
  );
}

async function runTool(name: string, input: Record<string, unknown>): Promise<string> {
  if (name === "list_leads") {
    const leads = await repo.getLeads();
    const status = String(input.status ?? "all");
    const limit = Math.min(Number(input.limit) || 10, 25);
    const filtered = leads
      .filter((l) => status === "all" || l.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
    return JSON.stringify({
      total_matching: filtered.length,
      leads: filtered.map(leadLine),
    });
  }

  if (name === "get_lead") {
    const leads = await repo.getLeads();
    const lead = findLead(leads, String(input.id ?? ""));
    if (!lead) return JSON.stringify({ error: "פנייה לא נמצאה" });
    return JSON.stringify({
      id: `#${lead.id.slice(0, 8)}`,
      name: lead.name,
      phone: lead.phone,
      email: lead.email ?? null,
      status: statusHe(lead.status),
      created: ilTime(lead.createdAt),
      channel: lead.channel,
      interest: lead.interest,
      message: lead.message,
      items: lead.items.map((i) => `${i.treeName} × ${i.qtyRange}`),
      isPro: lead.isPro,
      sourcePage: lead.sourcePage,
    });
  }

  if (name === "set_lead_status") {
    const leads = await repo.getLeads();
    const lead = findLead(leads, String(input.id ?? ""));
    if (!lead) return JSON.stringify({ error: "פנייה לא נמצאה" });
    await repo.setLeadStatus(lead.id, input.status as LeadStatus);
    return JSON.stringify({ ok: true, lead: lead.name, new_status: statusHe(input.status as LeadStatus) });
  }

  if (name === "lead_stats") {
    const days = Math.min(Number(input.days) || 7, 365);
    const since = Date.now() - days * 86_400_000;
    const leads = (await repo.getLeads()).filter(
      (l) => new Date(l.createdAt).getTime() >= since,
    );
    const by = (key: (l: Lead) => string) =>
      leads.reduce<Record<string, number>>((acc, l) => {
        acc[key(l)] = (acc[key(l)] ?? 0) + 1;
        return acc;
      }, {});
    return JSON.stringify({
      period_days: days,
      total: leads.length,
      unanswered: leads.filter((l) => l.status === "new").length,
      by_channel: by((l) => l.channel),
      by_status: by((l) => statusHe(l.status)),
      pro_leads: leads.filter((l) => l.isPro).length,
      note: "נתוני מבקרים באתר אינם זמינים — אנליטיקס טרם חובר",
    });
  }

  if (name === "create_reminder") {
    const hours = Number(input.due_in_hours);
    if (!hours || hours <= 0 || hours > 24 * 90) {
      return JSON.stringify({ error: "מספר שעות לא תקין" });
    }
    let leadId: string | undefined;
    if (input.lead_id) {
      const lead = findLead(await repo.getLeads(), String(input.lead_id));
      leadId = lead?.id;
    }
    const reminder: Reminder = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      dueAt: new Date(Date.now() + hours * 3_600_000).toISOString(),
      noteHe: String(input.note ?? "").slice(0, 500),
      leadId,
      done: false,
    };
    const reminders = await repo.getReminders();
    await repo.saveReminders([...reminders, reminder]);
    return JSON.stringify({ ok: true, due_at_israel_time: ilTime(reminder.dueAt) });
  }

  if (name === "list_reminders") {
    const reminders = (await repo.getReminders()).filter((r) => !r.done);
    return JSON.stringify({
      open: reminders.map((r) => `${ilTime(r.dueAt)} — ${r.noteHe}`),
    });
  }

  if (name === "send_quote_email") {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return JSON.stringify({ error: "שליחת מייל לא מוגדרת עדיין (חסר RESEND_API_KEY)" });
    }
    const leads = await repo.getLeads();
    const lead = findLead(leads, String(input.lead_id ?? ""));
    if (!lead) return JSON.stringify({ error: "פנייה לא נמצאה" });
    if (!lead.email) {
      return JSON.stringify({ error: "לפנייה זו אין כתובת מייל — הצע וואטסאפ או טלפון" });
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.LEAD_EMAIL_FROM ?? "quotes@resend.dev",
        to: lead.email,
        subject: String(input.subject ?? "").slice(0, 200),
        text: String(input.body ?? "").slice(0, 8000),
      }),
    });
    if (!res.ok) {
      console.error("quote email failed:", res.status, await res.text());
      return JSON.stringify({ error: "שליחת המייל נכשלה — נסה שוב מאוחר יותר" });
    }
    return JSON.stringify({ ok: true, sent_to: lead.email });
  }

  if (name === "search_trees") {
    const trees = await repo.getTrees();
    const query = String(input.query ?? "").trim();
    const matches = trees
      .filter((t) => !query || `${t.nameHe} ${t.speciesLatin} ${t.categoryHe}`.includes(query))
      .slice(0, 12)
      .map((t) => ({
        name: t.nameHe,
        code: t.code,
        type: t.saleType === "unique" ? "דייר ותיק" : "מלאי",
        height_m: t.heightM,
        trunk_cm: t.trunkDiameterCm,
        price_from: `₪${t.price.toLocaleString("he-IL")}`,
        availability: t.availability,
        care_notes: t.aiNotesHe || undefined,
      }));
    return JSON.stringify({ trees: matches });
  }

  return JSON.stringify({ error: "unknown tool" });
}

export async function runSecretary(history: SecretaryTurn[]): Promise<string> {
  const system = await buildSystemPrompt();
  const messages: Anthropic.MessageParam[] = history.map((t) => ({
    role: t.role,
    content: t.content,
  }));

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      tools,
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return text || "לא הצלחתי לנסח תשובה — נסה לנסח מחדש.";
    }

    messages.push({ role: "assistant", content: response.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        try {
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: await runTool(block.name, block.input as Record<string, unknown>),
          });
        } catch (e) {
          console.error(`secretary tool ${block.name} failed:`, e);
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify({ error: "הכלי נכשל זמנית" }),
            is_error: true,
          });
        }
      }
    }
    messages.push({ role: "user", content: results });
  }

  return "משהו הסתבך אצלי בדרך — נסה שוב.";
}
