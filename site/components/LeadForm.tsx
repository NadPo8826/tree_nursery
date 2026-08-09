"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LEAD_TOPICS, type LeadTopicKey } from "@/lib/types";

type FormState = "idle" | "sending" | "sent" | "error";

/**
 * The lead form (name, phone, free text — plus an optional topic dropdown
 * on the contact page) posting to /api/leads. Includes a honeypot field;
 * shows inline validation errors from the server.
 */
export interface LeadFormItem {
  treeSlug: string;
  treeName: string;
  qtyRange: string;
}

export function LeadForm({
  interest = "",
  topicPicker = false,
  defaultTopic = "callback",
  isPro = false,
  submitLabel = "שליחה — נחזור אליכם",
  channel = "form",
  items = [],
  withEmail,
  messageLabel,
  onSuccess,
}: {
  /** Fixed interest text — for flows without the topic dropdown (RFQ, pro). */
  interest?: string;
  /** Show the topic dropdown (contact page); the server derives interest from it. */
  topicPicker?: boolean;
  defaultTopic?: LeadTopicKey;
  isPro?: boolean;
  submitLabel?: string;
  channel?: "form" | "rfq";
  items?: LeadFormItem[];
  /** Optional email input — on by default for quote requests, where the quote can arrive by mail. */
  withEmail?: boolean;
  /** Label for the free-text field; override where "מה מעניין אתכם" makes no sense (e.g. RFQ). */
  messageLabel?: string;
  onSuccess?: () => void;
}) {
  const showEmail = withEmail ?? channel === "rfq";
  const pathname = usePathname();
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState("");
  const [topic, setTopic] = useState<LeadTopicKey>(defaultTopic);

  // links like /visit?topic=quote preselect the dropdown — read after mount
  // (not useSearchParams) so the page can stay statically rendered
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("topic");
    if (fromUrl && LEAD_TOPICS.some((t) => t.key === fromUrl)) {
      setTopic(fromUrl as LeadTopicKey);
    }
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          phone: data.get("phone"),
          email: data.get("email") ?? "",
          message: data.get("message"),
          website: data.get("website"), // honeypot
          topic: topicPicker ? data.get("topic") : "",
          interest,
          channel,
          items,
          sourcePage: pathname,
          isPro,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "משהו השתבש — נסו שוב או התקשרו");
        setState("error");
        return;
      }
      setState("sent");
      onSuccess?.();
    } catch {
      setError("משהו השתבש — נסו שוב או התקשרו");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-2xl border-[1.5px] border-leaf bg-[#F1EFDC] p-6 text-center">
        <p className="font-display text-xl text-[#3E6231]">קיבלנו! ✓</p>
        <p className="mt-1 text-sm text-ink-soft">
          נחזור אליכם בהקדם. מחכים לראותכם בין השורות.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 text-start">
      {topicPicker && (
        <label className="block text-sm">
          במה נוכל לעזור?
          <select
            name="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value as LeadTopicKey)}
            className="admin-input"
          >
            {LEAD_TOPICS.map((t) => (
              <option key={t.key} value={t.key}>
                {t.labelHe}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block text-sm">
        שם
        <input
          name="name"
          required
          minLength={2}
          autoComplete="name"
          className="admin-input"
        />
      </label>
      <label className="block text-sm">
        טלפון
        <input
          name="phone"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          className="admin-input"
        />
      </label>
      {showEmail && (
        <label className="block text-sm">
          מייל <span className="text-ink-muted">(לא חובה — לקבלת הצעת המחיר גם במייל)</span>
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            className="admin-input"
          />
        </label>
      )}
      <label className="block text-sm">
        {messageLabel ?? (
          <>
            מה מעניין אתכם? <span className="text-ink-muted">(לא חובה)</span>
          </>
        )}
        <textarea name="message" rows={2} className="admin-input" />
      </label>
      {/* honeypot — hidden from humans, tempting to bots */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        disabled={state === "sending"}
        className="min-h-11 w-full rounded-full bg-clay px-6 py-2.5 font-semibold text-white shadow-lg shadow-clay/30 transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {state === "sending" ? "שולח…" : submitLabel}
      </button>
    </form>
  );
}
