import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/db";
import { runVisitorAssistant, type ChatTurn } from "@/lib/assistant";

/**
 * Public chat endpoint. Defenses against abuse and cost overrun — the
 * caps are owner-editable in /admin/ai (defaults: 8/min + 60/day per IP,
 * 400/day global); message ≤ 600 chars, history capped at 12 turns.
 */
const perMinute = new Map<string, number[]>();
const perDay = new Map<string, number[]>();
let dayCount = 0;
let dayStamp = "";

interface Limits {
  daily: number;
  ipDaily: number;
  ipMinute: number;
}

function limited(ip: string, limits: Limits): string | null {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  if (dayStamp !== today) {
    dayStamp = today;
    dayCount = 0;
    perDay.clear();
  }
  if (dayCount >= limits.daily) {
    return "העוזר עמוס כרגע — אפשר להתקשר אלינו או לכתוב בוואטסאפ ונחזור מיד.";
  }
  const minute = (perMinute.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (minute.length >= limits.ipMinute) {
    return "רגע אחד בין הודעות 🙂 נסו שוב בעוד דקה.";
  }
  const day = (perDay.get(ip) ?? []).filter((t) => now - t < 86_400_000);
  if (day.length >= limits.ipDaily) {
    return "הגעתם למכסת השיחות היומית — נשמח להמשיך בטלפון או בוואטסאפ!";
  }
  minute.push(now);
  day.push(now);
  perMinute.set(ip, minute);
  perDay.set(ip, day);
  if (perMinute.size > 5000) perMinute.clear();
  dayCount++;
  return null;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "העוזר אינו זמין כרגע" },
      { status: 503 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const s = await repo.getSettings();
  const limitMsg = limited(ip, {
    daily: s.aiDailyLimit || 400,
    ipDaily: s.aiIpDailyLimit || 60,
    ipMinute: s.aiIpMinuteLimit || 8,
  });
  if (limitMsg) return NextResponse.json({ reply: limitMsg, limited: true });

  let body: { messages?: unknown; sourcePage?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const raw = Array.isArray(body.messages) ? body.messages : [];
  const history: ChatTurn[] = raw
    .filter(
      (m): m is { role: string; content: string } =>
        typeof m === "object" &&
        m !== null &&
        ((m as { role?: unknown }).role === "user" ||
          (m as { role?: unknown }).role === "assistant") &&
        typeof (m as { content?: unknown }).content === "string",
    )
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content.slice(0, 600),
    }))
    .slice(-12);

  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  // Server-Sent Events: the reply streams token-by-token, so the visitor
  // sees text within ~a second instead of waiting for the full answer.
  const sourcePage = String(body.sourcePage ?? "/").slice(0, 200);
  const encoder = new TextEncoder();
  const sse = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        const { reply, leadSaved, provider, model } = await runVisitorAssistant(
          history,
          sourcePage,
          {
            onDelta: (v) => send({ t: "delta", v }),
            onReset: () => send({ t: "reset" }),
          },
        );
        send({ t: "done", reply, leadSaved, provider, model });
      } catch (e) {
        console.error("chat failed:", e);
        send({
          t: "done",
          reply: "משהו השתבש אצלי — אפשר להתקשר אלינו ונשמח לעזור!",
          leadSaved: false,
        });
      }
      controller.close();
    },
  });
  return new Response(sse, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
