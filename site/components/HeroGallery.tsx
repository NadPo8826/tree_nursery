"use client";

import { useEffect, useState } from "react";
import type { MediaSlide } from "@/lib/db/store";

/** Fallback art until the owner uploads media in /admin/media. */
const fallbackSlides = [
  {
    id: "f1",
    labelHe: "שורות בזריחה",
    style:
      "radial-gradient(ellipse 120% 60% at 50% 108%, rgba(200,170,90,.4), transparent 60%), linear-gradient(178deg, #2a3627 0%, #1e2418 45%, #171b10 100%)",
  },
  {
    id: "f2",
    labelHe: "פריחת האביב",
    style:
      "radial-gradient(ellipse 90% 60% at 30% 20%, rgba(190,120,160,.30), transparent 60%), linear-gradient(178deg, #303a26 0%, #232a18 50%, #171b10 100%)",
  },
  {
    id: "f3",
    labelHe: "המבט מלמעלה",
    style:
      "radial-gradient(ellipse 100% 70% at 70% 30%, rgba(140,170,110,.28), transparent 65%), linear-gradient(178deg, #26301f 0%, #1d2415 50%, #151910 100%)",
  },
];

function isEmbedUrl(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com/.test(url);
}

function toEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  if (yt) {
    return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&mute=1&loop=1&playlist=${yt[1]}&controls=0&playsinline=1`;
  }
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) {
    return `https://player.vimeo.com/video/${vm[1]}?background=1`;
  }
  return url;
}

export function HeroGallery({ slides }: { slides: MediaSlide[] }) {
  const items = slides.length > 0 ? slides : fallbackSlides;
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      return;
    }
    if (items.length < 2) return;
    const t = setInterval(() => setActive((a) => (a + 1) % items.length), 4200);
    return () => clearInterval(t);
  }, [items.length]);

  return (
    <>
      {items.map((s, i) => {
        const on = i === active;
        const cls = `absolute inset-0 transition-opacity duration-1000 ${
          on ? "opacity-100" : "opacity-0"
        }`;
        if ("style" in s) {
          return (
            <div key={s.id} aria-hidden className={cls} style={{ background: s.style }} />
          );
        }
        if (s.kind === "image") {
          return (
            <div
              key={s.id}
              aria-hidden
              className={`${cls} bg-cover bg-center`}
              style={{ backgroundImage: `url(${s.url})` }}
            />
          );
        }
        if (reduced) {
          return <div key={s.id} aria-hidden className={`${cls} bg-soil-deep`} />;
        }
        return (
          <div key={s.id} aria-hidden className={cls}>
            {isEmbedUrl(s.url) ? (
              <iframe
                src={toEmbedUrl(s.url)}
                title={s.labelHe}
                allow="autoplay"
                className="pointer-events-none size-full scale-[1.35] object-cover"
              />
            ) : (
              <video
                src={s.url}
                autoPlay
                muted
                loop
                playsInline
                className="size-full object-cover"
              />
            )}
          </div>
        );
      })}
      {!reduced && items.length > 1 && (
        <div className="absolute bottom-10 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {items.map((s, i) => (
            <button
              key={s.id}
              aria-label={s.labelHe || `שקופית ${i + 1}`}
              onClick={() => setActive(i)}
              className={`size-2.5 rounded-full border transition-colors ${
                i === active
                  ? "border-clay bg-clay"
                  : "border-line-warm bg-transparent"
              }`}
            />
          ))}
        </div>
      )}
    </>
  );
}
