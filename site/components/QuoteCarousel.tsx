"use client";

import { useEffect, useState } from "react";

interface QuoteItem {
  textHe: string;
  citeHe: string;
}

/** Auto-rotating client voices; dots allow manual browsing. */
export function QuoteCarousel({ quotes }: { quotes: QuoteItem[] }) {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive((a) => (a + 1) % quotes.length), 3800);
    return () => clearInterval(t);
  }, [auto]);

  return (
    <div className="relative mx-auto max-w-2xl px-6 pb-14 text-center">
      <div className="relative min-h-44">
        {quotes.map((q, i) => (
          <blockquote
            key={q.citeHe}
            aria-hidden={i !== active}
            className={`absolute inset-x-0 top-0 transition-all duration-700 ${
              i === active
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-5 opacity-0"
            }`}
          >
            <p className="font-display text-lg leading-relaxed md:text-xl">
              {q.textHe}
            </p>
            <cite className="mt-4 block text-sm not-italic text-gold">
              {q.citeHe}
            </cite>
          </blockquote>
        ))}
      </div>
      <div className="mt-6 flex justify-center gap-2">
        {quotes.map((q, i) => (
          <button
            key={q.citeHe}
            aria-label={`המלצה ${i + 1}`}
            onClick={() => {
              setActive(i);
              setAuto(false);
            }}
            className={`size-2.5 rounded-full border transition-colors ${
              i === active
                ? "border-clay bg-clay"
                : "border-line-warm bg-transparent"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
