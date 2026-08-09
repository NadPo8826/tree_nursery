"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Accessibility controls (IS 5568 / WCAG-oriented), matching the option set
 * Israeli visitors know from standard widgets: text size, contrast, links,
 * spacing, line height, stop animations, hide images, readable font, big
 * cursor, text alignment, grayscale — plus an enlarge-panel control.
 * Preferences persist in localStorage as classes on <html>.
 */
type ToggleKey =
  | "contrast"
  | "links"
  | "spacing"
  | "lineheight"
  | "noanim"
  | "noimg"
  | "readable"
  | "cursor"
  | "align"
  | "gray";

interface Prefs extends Record<ToggleKey, boolean> {
  font: 0 | 1 | 2;
  bigPanel: boolean;
}

const DEFAULT_PREFS: Prefs = {
  font: 0,
  contrast: false,
  links: false,
  spacing: false,
  lineheight: false,
  noanim: false,
  noimg: false,
  readable: false,
  cursor: false,
  align: false,
  gray: false,
  bigPanel: false,
};

const CLASS_MAP: Record<ToggleKey, string> = {
  contrast: "a11y-contrast",
  links: "a11y-links",
  spacing: "a11y-spacing",
  lineheight: "a11y-lineheight",
  noanim: "a11y-noanim",
  noimg: "a11y-noimg",
  readable: "a11y-readable",
  cursor: "a11y-cursor",
  align: "a11y-align",
  gray: "a11y-gray",
};

function applyPrefs(p: Prefs) {
  const c = document.documentElement.classList;
  c.toggle("a11y-font-lg", p.font === 1);
  c.toggle("a11y-font-xl", p.font === 2);
  for (const key of Object.keys(CLASS_MAP) as ToggleKey[]) {
    c.toggle(CLASS_MAP[key], p[key]);
  }
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICONS: Record<ToggleKey, ReactNode> = {
  contrast: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18A9 9 0 0 0 12 3Z" fill="currentColor" stroke="none" />
    </svg>
  ),
  links: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
      <path d="M9 12h6" />
      <path d="M9.5 8H7a4 4 0 1 0 0 8h2.5" />
      <path d="M14.5 8H17a4 4 0 1 1 0 8h-2.5" />
    </svg>
  ),
  spacing: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
      <path d="M4 12h16M4 12l3-3M4 12l3 3M20 12l-3-3M20 12l-3 3" />
    </svg>
  ),
  lineheight: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
      <path d="M11 6h9M11 12h9M11 18h9" />
      <path d="M5 5v14M5 5 3 7.5M5 5l2 2.5M5 19l-2-2.5M5 19l2-2.5" />
    </svg>
  ),
  noanim: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9v6M14 9v6" />
    </svg>
  ),
  noimg: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 16 5-5 4 4M14 13l2-2 5 5" />
      <path d="M4 3l17 18" />
    </svg>
  ),
  readable: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
      <path d="M5 18 10 6l5 12M6.7 14h6.6" />
      <path d="M17 18v-7m0 0a2.5 2.5 0 1 1 2.5 2.5" />
    </svg>
  ),
  cursor: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
      <path d="M6 3l12 10h-7l-2.5 7z" />
    </svg>
  ),
  align: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
      <path d="M4 6h16M8 12h12M6 18h14" />
    </svg>
  ),
  gray: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
      <path d="M12 3s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11Z" />
      <path d="M12 3v17" />
    </svg>
  ),
};

const TOGGLES: { key: ToggleKey; label: string }[] = [
  { key: "contrast", label: "ניגודיות גבוהה" },
  { key: "links", label: "הדגשת קישורים" },
  { key: "spacing", label: "ריווח טקסט" },
  { key: "lineheight", label: "גובה שורה" },
  { key: "noanim", label: "ביטול הנפשות" },
  { key: "noimg", label: "הסתרת תמונות" },
  { key: "readable", label: "גופן קריא" },
  { key: "cursor", label: "סמן מוגדל" },
  { key: "align", label: "יישור טקסט" },
  { key: "gray", label: "גווני אפור" },
];

export function AccessibilityWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  // dialog keyboard contract: focus moves in on open, Escape closes and
  // returns focus to the launcher, Tab cycles inside the panel
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = [
        ...panelRef.current.querySelectorAll<HTMLElement>("button, a"),
      ];
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("a11y-prefs");
      if (saved) {
        const p = { ...DEFAULT_PREFS, ...JSON.parse(saved) } as Prefs;
        setPrefs(p);
        applyPrefs(p);
      }
    } catch {
      /* corrupt storage — defaults */
    }
  }, []);

  function update(patch: Partial<Prefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    applyPrefs(next);
    localStorage.setItem("a11y-prefs", JSON.stringify(next));
  }

  if (pathname.startsWith("/admin")) return null;

  const big = prefs.bigPanel;

  return (
    <>
      <button
        ref={launcherRef}
        onClick={() => setOpen(!open)}
        aria-label="אפשרויות נגישות"
        aria-expanded={open}
        className="fixed bottom-5 end-5 z-50 grid size-12 place-items-center rounded-full bg-soil text-ink-cream shadow-2xl shadow-black/35 ring-[2.5px] ring-cream/90 transition-transform hover:-translate-y-0.5"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="12" cy="4.5" r="2.2" />
          <path d="M12 8c-2.8 0-5.2-.6-6.9-1.2a1 1 0 0 0-.7 1.9c1.5.55 3.5 1 5.6 1.2v3.3l-2.2 6.4a1 1 0 0 0 1.9.7l2.1-6h.4l2.1 6a1 1 0 0 0 1.9-.7L14 13.2V9.9c2.1-.2 4.1-.65 5.6-1.2a1 1 0 1 0-.7-1.9C17.2 7.4 14.8 8 12 8Z" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-label="אפשרויות נגישות"
          className={`fixed bottom-20 end-3 z-50 flex max-h-[75dvh] flex-col rounded-3xl border-[1.5px] border-line-sand bg-cream shadow-2xl shadow-soil/40 sm:end-5 ${
            big ? "w-[26rem] max-w-[calc(100vw-1.5rem)]" : "w-80 max-w-[calc(100vw-1.5rem)]"
          }`}
        >
          <div className="flex items-center gap-1 border-b border-line-sand px-4 py-3">
            <p className={`font-display ${big ? "text-2xl" : "text-lg"}`}>נגישות</p>
            <button
              onClick={() => update({ bigPanel: !big })}
              aria-pressed={big}
              aria-label={big ? "הקטנת החלון" : "הגדלת החלון"}
              className="ms-auto grid size-10 place-items-center rounded-full text-ink-muted hover:bg-sand hover:text-ink"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
                {big ? (
                  <path d="M9 15 4 20m0 0v-5m0 5h5M15 9l5-5m0 0v5m0-5h-5" />
                ) : (
                  <path d="M4 9V4m0 0h5M4 4l6 6M20 15v5m0 0h-5m5 0-6-6" />
                )}
              </svg>
            </button>
            <button
              onClick={() => setOpen(false)}
              aria-label="סגירה"
              className="grid size-10 place-items-center rounded-full hover:bg-sand"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <p className={`text-ink-muted ${big ? "text-sm" : "text-xs"}`}>גודל טקסט</p>
            <div className="mt-1.5 grid grid-cols-3 gap-2" role="group" aria-label="גודל טקסט">
              {([0, 1, 2] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => update({ font: size })}
                  aria-pressed={prefs.font === size}
                  className={`min-h-11 rounded-xl border-[1.5px] font-semibold transition-colors ${
                    prefs.font === size
                      ? "border-clay bg-clay text-white"
                      : "border-line-warm bg-card hover:border-clay"
                  }`}
                  style={{ fontSize: (big ? 16 : 14) + size * 3 }}
                >
                  א
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {TOGGLES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => update({ [t.key]: !prefs[t.key] } as Partial<Prefs>)}
                  aria-pressed={prefs[t.key]}
                  className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] px-2 py-2.5 transition-colors ${
                    prefs[t.key]
                      ? "border-clay bg-clay/10 text-clay-deep"
                      : "border-line-warm bg-card text-ink-soft hover:border-clay"
                  }`}
                >
                  <span aria-hidden>{ICONS[t.key]}</span>
                  <span className={big ? "text-sm" : "text-xs"}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={`flex items-center justify-between border-t border-line-sand px-4 py-3 ${big ? "text-sm" : "text-xs"}`}>
            <Link
              href="/accessibility"
              className="text-clay-deep underline"
              onClick={() => setOpen(false)}
            >
              הצהרת נגישות
            </Link>
            <button
              onClick={() => update({ ...DEFAULT_PREFS, bigPanel: big })}
              className="text-ink-muted hover:text-ink"
            >
              איפוס הכול
            </button>
          </div>
        </div>
      )}
    </>
  );
}
