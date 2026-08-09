"use client";

import { useState } from "react";

/**
 * Tree-page photo gallery: the strip shows every photo (including the
 * primary), and clicking a thumbnail brings it to the main stage.
 */
export function TreeGallery({
  photos,
  nameHe,
}: {
  photos: string[];
  nameHe: string;
}) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div
        role="img"
        aria-label={`${nameHe} — תמונה ${active + 1} מתוך ${Math.max(photos.length, 1)}`}
        className="h-[420px] rounded-[24px_24px_24px_84px] bg-cover bg-center"
        style={{
          backgroundImage: photos[active]
            ? `url(${photos[active]})`
            : "linear-gradient(170deg,#9aa884,#55614a 70%,#3e4836)",
        }}
      />
      {photos.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-3">
          {photos.map((photo, i) => (
            <button
              key={photo}
              onClick={() => setActive(i)}
              aria-label={`הצגת תמונה ${i + 1}`}
              aria-pressed={i === active}
              className={`overflow-hidden rounded-xl transition-all ${
                i === active
                  ? "ring-2 ring-clay ring-offset-2 ring-offset-cream"
                  : "opacity-80 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt=""
                loading="lazy"
                className="h-20 w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
