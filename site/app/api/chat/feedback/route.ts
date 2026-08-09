import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/db";
import { isValidAiChoice } from "@/lib/ai-models";

/** Like/dislike on an AI reply — aggregated per provider/model for /admin. */
const hits = new Map<string, number[]>();

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  if (recent.length > 20) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: { vote?: unknown; provider?: unknown; model?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const vote = body.vote === "up" || body.vote === "down" ? body.vote : null;
  const provider = String(body.provider ?? "");
  const model = String(body.model ?? "");
  if (!vote || !isValidAiChoice(provider, model)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await repo.addAiFeedbackVote(`${provider}/${model}`, vote);
  return NextResponse.json({ ok: true });
}
