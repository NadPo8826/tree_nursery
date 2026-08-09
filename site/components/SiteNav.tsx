"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { site } from "@/lib/site";

const links = [
  { href: "/about", label: "הסיפור" },
  { href: "/catalog", label: "קטלוג העצים" },
  { href: "/process", label: "איך זה עובד" },
  { href: "/projects", label: "פרויקטים" },
  { href: "/guides", label: "מדריכים" },
] as const;

export function SiteNav({ hasSales = false }: { hasSales?: boolean }) {
  const pathname = usePathname();
  const overHero = pathname === "/"; // homepage: nav floats over the dark hero
  const [scrolled, setScrolled] = useState(false);
  const [hasLogo, setHasLogo] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // navigating closes the drawer; also lock body scroll while it's open
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const solid = scrolled || !overHero;

  return (
    <header
      className={`sticky top-0 z-50 flex flex-nowrap items-center gap-x-4 px-5 md:px-10 transition-all duration-300 ${
        overHero ? "-mb-[76px]" : ""
      } ${
        solid
          ? "bg-soil/95 py-2.5 shadow-lg shadow-soil/40"
          : // floating over the hero: a top-down scrim keeps links readable
            // no matter how bright the current slide is
            "bg-gradient-to-b from-black/60 via-black/30 to-transparent py-4"
      }`}
    >
      {/* hamburger sits at the start edge — the right side in RTL */}
      <button
        onClick={() => setMenuOpen(true)}
        aria-label="פתיחת תפריט"
        aria-expanded={menuOpen}
        className="grid size-11 shrink-0 place-items-center rounded-full text-ink-cream hover:bg-white/10 lg:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <Link href="/" className="flex shrink-0 items-center text-ink-cream">
        {hasLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/logo.png"
            alt={site.name}
            className="h-11 w-auto drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)] md:h-13"
            onError={() => setHasLogo(false)}
          />
        ) : (
          <span className="font-display text-xl">{site.name}</span>
        )}
      </Link>

      {/* desktop nav — only from lg, so tablet widths never wrap to a second line */}
      <nav className="ms-auto hidden items-center gap-5 text-sm text-ink-cream-soft lg:flex xl:gap-6">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap border-b-2 pb-1 pt-1.5 transition-colors hover:text-ink-cream ${
              pathname.startsWith(l.href)
                ? "border-gold-bright text-ink-cream"
                : "border-transparent"
            }`}
          >
            {l.label}
          </Link>
        ))}
        {hasSales && (
          <Link
            href="/sales"
            className={`whitespace-nowrap border-b-2 pb-1 pt-1.5 font-semibold text-gold-bright transition-colors hover:text-gold-bright ${
              pathname.startsWith("/sales")
                ? "border-gold-bright"
                : "border-transparent"
            }`}
          >
            מבצעים
          </Link>
        )}
        <Link
          href="/pro"
          className="whitespace-nowrap rounded-full border border-dashed border-line-warm/60 px-3 py-1 text-xs text-line-warm hover:border-gold-bright hover:text-gold-bright"
        >
          לאנשי מקצוע ורשויות
        </Link>
      </nav>

      <Link
        href="/visit"
        className="ms-auto shrink-0 whitespace-nowrap rounded-full bg-clay px-4 py-1.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 lg:ms-0"
      >
        צרו קשר
      </Link>

      {/* drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="סגירת תפריט"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/55"
          />
          <div className="grainy absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col bg-soil text-ink-cream shadow-2xl">
            <div className="flex shrink-0 items-center justify-between px-5 py-4">
              {hasLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/logo.png" alt={site.name} className="h-11 w-auto" />
              ) : (
                <span className="font-display text-lg">{site.name}</span>
              )}
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="סגירת תפריט"
                className="grid size-11 place-items-center rounded-full hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            {/* scrollable middle — on short screens the links scroll instead
                of compressing into the CTA below */}
            <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4 pt-2">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-xl px-4 py-3 text-base ${
                    pathname.startsWith(l.href)
                      ? "bg-white/10 text-gold-bright"
                      : "text-ink-cream-soft hover:bg-white/5 hover:text-ink-cream"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              {hasSales && (
                <Link
                  href="/sales"
                  className={`rounded-xl px-4 py-3 text-base font-semibold text-gold-bright ${
                    pathname.startsWith("/sales")
                      ? "bg-white/10"
                      : "hover:bg-white/5"
                  }`}
                >
                  מבצעים
                </Link>
              )}
              <Link
                href="/pro"
                className={`mt-2 rounded-xl border border-dashed border-line-warm/50 px-4 py-3 text-sm ${
                  pathname.startsWith("/pro")
                    ? "text-gold-bright"
                    : "text-line-warm hover:text-gold-bright"
                }`}
              >
                לאנשי מקצוע ורשויות
              </Link>
            </nav>
            <Link
              href="/visit"
              className="mx-5 mb-8 mt-4 shrink-0 rounded-full bg-clay px-6 py-3 text-center font-semibold text-white shadow-lg shadow-clay/30"
            >
              צרו קשר — או קבעו ביקור
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
