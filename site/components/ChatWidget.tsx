"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Bold segments: **כך** → <b>כך</b>. Built as React nodes — never raw HTML. */
function inlineMd(text: string): ReactNode[] {
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : part));
}

/** Minimal markdown for AI replies: bold, bullet lists, numbered lists. */
function ChatText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => {
        const bullet = line.match(/^\s*[*•-]\s+(.*)/);
        if (bullet) {
          return (
            <span key={i} className="flex gap-2">
              <span aria-hidden className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-clay" />
              <span>{inlineMd(bullet[1])}</span>
            </span>
          );
        }
        const num = line.match(/^\s*(\d+)[.)]\s+(.*)/);
        if (num) {
          return (
            <span key={i} className="flex gap-2">
              <span className="shrink-0 font-semibold text-clay-deep tabular-nums">
                {num[1]}.
              </span>
              <span>{inlineMd(num[2])}</span>
            </span>
          );
        }
        if (line.trim() === "") return <span key={i} className="block h-2" />;
        return (
          <span key={i} className="block">
            {inlineMd(line)}
          </span>
        );
      })}
    </>
  );
}

interface Turn {
  role: "user" | "assistant";
  content: string;
  /** Which AI engine produced this reply — attached to feedback votes. */
  engine?: { provider: string; model: string };
}

function ThumbIcon({ down = false }: { down?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={down ? "rotate-180" : undefined}
    >
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

const OPENERS = [
  "איזה עץ צל מתאים לגינה קטנה?",
  "איך עובדת העתקה של עץ בוגר?",
  "אפשר לבוא לבקר?",
];

/** The nursery's little tree — drawn to match the design system, not an emoji. */
function BotAvatar({ size = 28, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full ${
        onDark ? "bg-clay" : "border border-line-sand bg-sand"
      }`}
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24">
        <circle cx="12" cy="8.6" r="5.2" fill={onDark ? "#F1EFDC" : "#4F7A3D"} />
        <circle cx="7.8" cy="11" r="3.6" fill={onDark ? "#F1EFDC" : "#5D8A48"} />
        <circle cx="16.2" cy="11" r="3.6" fill={onDark ? "#F1EFDC" : "#5D8A48"} />
        <path
          d="M11.1 13.5h1.8V20a.9.9 0 0 1-1.8 0z"
          fill={onDark ? "#8a4a28" : "#6B4A2B"}
        />
        <path
          d="M5 20.6c2.2-.9 11.8-.9 14 0"
          stroke={onDark ? "#8a4a28" : "#6B4A2B"}
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </span>
  );
}

/** Visitor silhouette in warm clay. */
function UserAvatar() {
  return (
    <span
      aria-hidden
      className="grid size-7 shrink-0 place-items-center rounded-full border border-clay/30 bg-clay/15"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#A85A32">
        <circle cx="12" cy="8" r="4.2" />
        <path d="M4.5 20.5c.6-4.1 3.7-6.3 7.5-6.3s6.9 2.2 7.5 6.3a.8.8 0 0 1-.8.9H5.3a.8.8 0 0 1-.8-.9z" />
      </svg>
    </span>
  );
}

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [votes, setVotes] = useState<Record<number, "up" | "down">>({});
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [turns, busy, open]);

  // On phones the panel is a full-width bottom sheet, and the accessibility
  // launcher (fixed bottom-end) lands exactly on the send button. This class
  // lets globals.css hide the launcher while the chat is open (mobile only).
  useEffect(() => {
    document.documentElement.classList.toggle("chat-open", open);
    return () => document.documentElement.classList.remove("chat-open");
  }, [open]);

  if (pathname.startsWith("/admin")) return null;

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: message }];
    setTurns(next);
    setInput("");
    setBusy(true);
    const setReply = (content: string, engine?: Turn["engine"]) =>
      setTurns([...next, { role: "assistant", content, engine }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, sourcePage: pathname }),
      });
      // rate-limit / validation errors still answer as plain JSON
      if (res.headers.get("content-type")?.includes("application/json")) {
        const data = await res.json();
        setReply(data.reply ?? data.error ?? "משהו השתבש — נסו שוב או התקשרו.");
        return;
      }
      // SSE stream: append deltas into a live assistant bubble
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep;
        while ((sep = buffer.indexOf("\n\n")) >= 0) {
          const line = buffer.slice(0, sep).trim();
          buffer = buffer.slice(sep + 2);
          if (!line.startsWith("data: ")) continue;
          const ev = JSON.parse(line.slice(6));
          if (ev.t === "delta") {
            acc += ev.v;
            setReply(acc);
          } else if (ev.t === "reset") {
            acc = "";
            setReply("");
          } else if (ev.t === "done") {
            setReply(
              ev.reply || acc,
              ev.provider && ev.model
                ? { provider: ev.provider, model: ev.model }
                : undefined,
            );
          }
        }
      }
    } catch {
      setReply("אין חיבור כרגע — נסו שוב בעוד רגע.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* floating bubble — clay + cream ring stays visible on light pages
          AND on the dark footer/soil sections */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="chat-launcher fixed bottom-5 start-5 z-50 flex min-h-12 items-center gap-2.5 rounded-full bg-clay px-5 py-3 text-sm font-semibold text-white shadow-2xl shadow-black/35 ring-[2.5px] ring-cream/90 transition-transform hover:-translate-y-0.5"
        >
          <BotAvatar size={26} onDark />
          יש שאלה על עץ?
        </button>
      )}

      {/* panel */}
      {open && (
        <div
          dir="rtl"
          className="fixed bottom-3 end-3 start-3 z-50 flex h-[68dvh] max-h-[560px] flex-col overflow-hidden rounded-3xl bg-cream shadow-2xl shadow-soil/40 sm:bottom-5 sm:end-auto sm:start-5 sm:h-[520px] sm:w-[380px]"
        >
          <div className="flex items-center gap-3 bg-soil px-4 py-3 text-ink-cream">
            <BotAvatar size={34} onDark />
            <div className="flex-1">
              <p className="text-sm font-semibold">העוזר של המשתלה</p>
              <p className="text-xs text-ink-cream-soft">
                עונה מיד · הצוות זמין בשעות הפעילות
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="סגירת הצ'אט"
              className="grid size-9 place-items-center rounded-full hover:bg-white/10"
            >
              ✕
            </button>
          </div>

          <div ref={bodyRef} className="flex-1 space-y-2.5 overflow-y-auto p-4">
            <div className="flex items-end gap-2">
              <BotAvatar />
              <div className="max-w-[85%] rounded-2xl rounded-se-sm border border-line-sand bg-card px-3.5 py-2.5 text-sm">
                שלום! אני העוזר הדיגיטלי של המשתלה. אפשר לשאול אותי על עצים,
                העתקות או ביקור אצלנו 🌳
              </div>
            </div>
            {turns.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {OPENERS.map((o) => (
                  <button
                    key={o}
                    onClick={() => send(o)}
                    className="rounded-full border border-line-warm bg-card px-3 py-1.5 text-xs text-ink-soft hover:border-clay"
                  >
                    {o}
                  </button>
                ))}
              </div>
            )}
            {turns.map((t, i) =>
              t.role === "assistant" && t.content === "" ? null : t.role ===
                "user" ? (
                <div key={i} className="flex flex-row-reverse items-end gap-2">
                  <UserAvatar />
                  <div className="max-w-[85%] rounded-2xl rounded-ss-sm bg-clay px-3.5 py-2.5 text-sm text-white">
                    {t.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-end gap-2">
                  <BotAvatar />
                  <div className="max-w-[85%]">
                    <div className="rounded-2xl rounded-se-sm border border-line-sand bg-card px-3.5 py-2.5 text-sm">
                      <ChatText text={t.content} />
                    </div>
                    {t.engine && !busy && (
                      <div className="mt-1 flex gap-1">
                        {(["up", "down"] as const).map((vote) => (
                          <button
                            key={vote}
                            disabled={votes[i] !== undefined}
                            aria-label={vote === "up" ? "תשובה טובה" : "תשובה לא טובה"}
                            onClick={() => {
                              setVotes((p) => ({ ...p, [i]: vote }));
                              fetch("/api/chat/feedback", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ vote, ...t.engine }),
                              }).catch(() => {});
                            }}
                            className={`grid size-7 place-items-center rounded-full transition-colors ${
                              votes[i] === vote
                                ? vote === "up"
                                  ? "bg-leaf/15 text-leaf"
                                  : "bg-clay/15 text-clay-deep"
                                : votes[i] !== undefined
                                  ? "text-line-warm"
                                  : "text-ink-muted hover:bg-sand hover:text-ink"
                            }`}
                          >
                            <ThumbIcon down={vote === "down"} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}
            {busy &&
              (turns[turns.length - 1]?.role !== "assistant" ||
                turns[turns.length - 1]?.content === "") && (
                <div className="flex items-end gap-2">
                  <BotAvatar />
                  <div className="max-w-[85%] rounded-2xl rounded-se-sm border border-line-sand bg-card px-3.5 py-2.5 text-sm text-ink-muted">
                    <span className="inline-block animate-pulse">כותב…</span>
                  </div>
                </div>
              )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-line-sand bg-cream p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={600}
              placeholder="כתבו הודעה…"
              className="min-h-11 flex-1 rounded-full border-[1.5px] border-line-warm bg-card px-4 text-sm outline-none focus:border-clay"
            />
            <button
              disabled={busy || !input.trim()}
              aria-label="שליחה"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-clay text-white disabled:opacity-50"
            >
              ←
            </button>
          </form>
        </div>
      )}
    </>
  );
}
