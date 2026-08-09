import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { repo } from "@/lib/db";
import type { Lead, LeadItem } from "@/lib/db";
import { leadTopicLabel } from "@/lib/types";
import { notifyNewLead } from "@/lib/notify";

/**
 * Public lead intake — every channel (visit form, RFQ, AI chat) posts here.
 * Defenses: honeypot field, per-IP rate limit, strict validation, length caps.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) hits.clear(); // memory backstop
  return recent.length > MAX_PER_WINDOW;
}

const ISRAELI_PHONE = /^0(?:[23489]|5[0-9]|7[2-9])-?\d{7}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "יותר מדי בקשות — נסו שוב בעוד דקה" },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  // Honeypot: a hidden "website" field humans never fill.
  if (str(body.website, 100)) {
    return NextResponse.json({ ok: true }); // pretend success to bots
  }

  const name = str(body.name, 80);
  const phone = str(body.phone, 20).replace(/\s/g, "");
  const email = str(body.email, 120);
  const message = str(body.message, 1000);
  const channel = str(body.channel, 20);
  // topic (contact-form dropdown) is server-validated against the known
  // keys; its label becomes the interest text so every downstream surface
  // (admin cards, Telegram alert, email subject) reads the same words
  const topic = leadTopicLabel(str(body.topic, 20)) ? str(body.topic, 20) : "";
  const interest = topic ? leadTopicLabel(topic)! : str(body.interest, 200);

  if (name.length < 2) {
    return NextResponse.json({ error: "נשמח לשם מלא" }, { status: 400 });
  }
  if (!ISRAELI_PHONE.test(phone)) {
    return NextResponse.json(
      { error: "מספר הטלפון לא נראה תקין" },
      { status: 400 },
    );
  }
  if (!["form", "rfq", "ai_chat"].includes(channel)) {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }
  // Email is optional everywhere, but if given it must look like one.
  if (email && !EMAIL.test(email)) {
    return NextResponse.json(
      { error: "כתובת המייל לא נראית תקינה" },
      { status: 400 },
    );
  }

  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 40) : [];
  const items: LeadItem[] = rawItems
    .map((item) => {
      const rec = item as Record<string, unknown>;
      return {
        treeSlug: str(rec.treeSlug, 80),
        treeName: str(rec.treeName, 80),
        qtyRange: str(rec.qtyRange, 10),
      };
    })
    .filter((item) => item.treeSlug && item.treeName);

  const lead: Lead = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    name,
    phone,
    email: email || undefined,
    message,
    interest,
    topic: topic || undefined,
    items,
    channel: channel as Lead["channel"],
    sourcePage: str(body.sourcePage, 200),
    isPro: Boolean(body.isPro),
    status: "new",
  };

  await repo.addLead(lead);
  // Notify in the background; the visitor's confirmation never waits on it.
  notifyNewLead(lead).catch((e) => console.error("notify failed:", e));

  return NextResponse.json({ ok: true });
}
