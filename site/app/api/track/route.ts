import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { repo } from "@/lib/db";

/**
 * First-party pageview beacon. Privacy-light by construction:
 * - no cookies, nothing stored client-side
 * - visitor identity = sha256(ip + user-agent + day + server secret),
 *   so raw IPs are never persisted and hashes can't be linked across days
 * - bots with obvious UAs are skipped; per-IP rate limited
 */
const hits = new Map<string, number[]>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) hits.clear();
  if (recent.length > 60) return new Response(null, { status: 204 });

  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || /bot|crawl|spider|preview|lighthouse|headless/i.test(ua)) {
    return new Response(null, { status: 204 });
  }

  let path = "";
  try {
    path = String(((await req.json()) as { path?: unknown }).path ?? "");
  } catch {
    return new Response(null, { status: 204 });
  }
  if (
    !path.startsWith("/") ||
    path.length > 200 ||
    path.startsWith("/admin") ||
    path.startsWith("/api")
  ) {
    return new Response(null, { status: 204 });
  }

  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
  }).format(new Date());
  const salt = process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "";
  const visitorHash = createHash("sha256")
    .update(`${ip}|${ua}|${day}|${salt}`)
    .digest("hex")
    .slice(0, 16);

  try {
    await repo.trackPageview(day, path, visitorHash);
  } catch (e) {
    console.error("track failed:", e);
  }
  return new Response(null, { status: 204 });
}
