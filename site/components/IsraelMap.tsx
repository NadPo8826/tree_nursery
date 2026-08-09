"use client";

import { useRef, useState } from "react";
import type { Project } from "@/lib/types";

/**
 * Clickable Israel map — pins open success stories beside it.
 * The outline is generated from real boundary data (geo-countries, admin-0),
 * Douglas-Peucker simplified and projected to this viewBox; pin positions are
 * projected from true city coordinates with the same transform.
 */
const ISRAEL_PATH =
  "M14 290.2 L 25.2 280.3 L 24.6 271.5 L 27 267.1 L 47.5 248.3 L 39.4 242.8 L 53.3 219.5 L 64.5 195.7 L 78.2 153.7 L 89.5 97.1 L 90.1 85.6 L 92.6 82.2 L 98.9 84.1 L 102.7 80 L 106.7 50.7 L 126.7 49 L 133.4 54.8 L 148.1 50.8 L 155.7 26 L 161.6 31.3 L 171.9 20.7 L 179.6 18.2 L 185.3 10 L 184.1 16 L 179 19.2 L 183.2 22 L 179.6 27.1 L 183.4 30.2 L 183.8 36.2 L 186.3 37.7 L 184.2 47.6 L 188.3 49.3 L 189.4 63.2 L 192.6 68.9 L 188.4 75.2 L 186.7 83.9 L 178.4 94.6 L 165.1 102.9 L 162.5 102.5 L 156.9 107.8 L 159 118 L 156 122.5 L 159 126 L 155.2 137.3 L 156.9 140.5 L 140.2 136.6 L 138.6 126.4 L 135.4 124.5 L 125.3 124.4 L 116.6 120.4 L 102.9 130.4 L 98.2 145.6 L 95.9 146.7 L 94.8 154 L 96.9 155.4 L 96.7 158.4 L 91.3 165.8 L 96.6 186.9 L 94.4 193.7 L 100.1 201.2 L 99.6 207.3 L 93.4 210.8 L 104.2 208.2 L 108.1 212 L 116.1 214 L 115.8 211.9 L 119.3 212.5 L 118.2 205.2 L 120 205 L 121.3 209.7 L 124.7 211.7 L 124.5 221.7 L 121.8 226.7 L 109.5 223.6 L 93 236.7 L 89 242.9 L 87.9 254.1 L 81.4 266.6 L 82.7 270.9 L 87.9 273.2 L 113.8 271 L 138.3 255 L 145.8 254.5 L 145.2 266 L 138.9 284.3 L 143.4 296.8 L 143.6 304 L 138.5 314.2 L 137.8 321.9 L 130.9 331.3 L 130.3 339.8 L 126.3 345.3 L 118.2 366.1 L 111.1 389.9 L 113.5 398.7 L 109.5 413.6 L 111.7 429.1 L 105.2 440.5 L 101.2 465 L 90.6 502.9 L 85.3 510 L 83.5 510 L 80.1 502.8 L 76.7 477.8 L 67.7 452.5 L 66.8 443.3 L 52.2 400.9 L 44.3 392.6 L 45.3 383.3 L 41.9 377.2 L 39.3 361.7Z";

/* יו"ש — same dataset, same projection; drawn as part of one silhouette. */
const WEST_BANK_PATH =
  "M94.4 193.7 L 96.6 186.9 L 91.3 165.8 L 96.7 158.4 L 96.9 155.4 L 94.8 154 L 95.5 148.3 L 98.2 145.6 L 102.9 130.4 L 118.6 120.3 L 125.3 124.4 L 138.6 126.4 L 140.2 136.6 L 156.9 140.5 L 158.2 157.4 L 156.8 159.2 L 158.2 159.2 L 154.1 175.4 L 155.2 178.5 L 152.8 182.2 L 155.3 196.6 L 153 199.9 L 156.8 219.5 L 148.1 235.4 L 145.9 254.4 L 138.3 255 L 132 258.6 L 120.2 268.6 L 113.8 271 L 87.9 273.2 L 82.7 270.9 L 81.4 266.6 L 87.9 254.1 L 89 242.9 L 93 236.7 L 109.5 223.6 L 121.8 226.7 L 124.5 221.7 L 124.7 211.7 L 121.3 209.7 L 120 205 L 118.2 205.2 L 119.3 212.5 L 115.8 211.9 L 116.1 214 L 108.1 212 L 104.2 208.2 L 93.4 210.8 L 99.6 207.3 L 100.1 201.2Z";

const SILHOUETTE = `${ISRAEL_PATH} ${WEST_BANK_PATH}`;

export function IsraelMap({ projects }: { projects: Project[] }) {
  const [active, setActive] = useState(0);
  const storyRef = useRef<HTMLElement>(null);
  const story = projects[active];

  /** On mobile the story sits below the map — bring it into view on tap. */
  function activate(i: number) {
    setActive(i);
    if (window.matchMedia("(max-width: 767px)").matches) {
      requestAnimationFrame(() => {
        storyRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }

  return (
    <div className="grid items-start gap-10 md:grid-cols-[300px_1fr]">
      <svg
        viewBox="0 0 207 520"
        role="group"
        aria-label="מפת ישראל עם פרויקטים"
        className="mx-auto w-full max-w-[300px]"
      >
        {/* stroke pass first, fill pass on top — hides the internal seam so
            the country renders as one continuous shape */}
        <path
          className="fill-none stroke-[#B59A6B]"
          strokeWidth="2.4"
          strokeLinejoin="round"
          d={SILHOUETTE}
        />
        <path className="fill-[#EAD9B5]" d={SILHOUETTE} />
        {/* Kinneret + Dead Sea (both basins) — real shorelines from Natural
            Earth 10m lakes, projected with the same transform as the border */}
        <g
          className="fill-[#A9C6CE] stroke-[#7FA6B0]"
          strokeWidth="0.7"
          strokeLinejoin="round"
        >
          <path d="M165.5 81.1 L 165.2 83.3 L 165.6 84.8 L 165 88.2 L 165.6 91 L 165 91.3 L 164.9 93.5 L 161.1 97.9 L 158.7 97.6 L 157.9 95.4 L 157.5 92.9 L 155.7 91.3 L 152.2 84.8 L 152.9 80.8 L 156.3 77.2 L 160.3 74.9 L 162.7 75.2 L 164.5 76.9 L 165.6 79.2Z" />
          <path d="M156.7 219.5 L 159.7 221.1 L 159.9 224 L 158.8 227.7 L 156.3 248.5 L 157.8 253.8 L 158.1 257.4 L 155.2 272 L 155.5 274.8 L 152.9 277.6 L 151.7 278.3 L 150.7 278.1 L 150.4 276.6 L 151.7 272 L 151.4 270.3 L 149.4 270.4 L 144 276.1 L 141 275.5 L 140.1 273.2 L 138.7 261.6 L 139.5 256.9 L 138.6 251.6 L 141 244.9 L 140.3 238.7 L 147.8 224 L 151.1 220.7Z" />
          <path d="M151.5 291.8 L 153.2 293.1 L 153.7 295.5 L 150.7 299.5 L 152.2 303.1 L 147.7 306.2 L 141.2 305.2 L 139.5 304.3 L 138.7 302.8 L 138.1 299.1 L 135.4 294.8 L 134.9 290.4 L 136.1 287.2 L 139.5 287.8 L 141.7 285.1 L 147.7 290.3Z" />
        </g>
        {projects.map((p, i) => {
          const labelStart = p.mapX > 120; // eastern pins get labels on their west side
          return (
            <g
              key={p.slug}
              role="button"
              tabIndex={0}
              aria-label={p.cityHe}
              className="cursor-pointer outline-none"
              onClick={() => activate(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  activate(i);
                }
              }}
            >
              {i === active && (
                <circle
                  cx={p.mapX}
                  cy={p.mapY}
                  r="7"
                  className="animate-ping fill-none stroke-clay"
                  style={{ transformOrigin: `${p.mapX}px ${p.mapY}px` }}
                />
              )}
              <circle
                cx={p.mapX}
                cy={p.mapY}
                r="4.5"
                strokeWidth="1.5"
                className={`stroke-cream transition-colors ${
                  i === active ? "fill-clay-deep" : "fill-clay"
                }`}
              />
              <text
                x={labelStart ? p.mapX - 9 : p.mapX + 9}
                y={p.mapY + 3}
                textAnchor={labelStart ? "end" : "start"}
                className={`text-[10px] ${
                  i === active ? "fill-ink font-semibold" : "fill-ink-muted"
                }`}
              >
                {p.cityHe.split(" · ")[0]}
              </text>
            </g>
          );
        })}
      </svg>

      <article
        ref={storyRef}
        key={story.slug}
        className="grid scroll-mt-24 animate-[storyfade_.45s_ease] items-center gap-6 md:grid-cols-2"
      >
        <div
          className="h-72 rounded-[20px_20px_68px_20px] bg-cover bg-center"
          style={{
            backgroundImage: story.imageUrl
              ? `url(${story.imageUrl})`
              : "linear-gradient(170deg,#9aa884,#55614a 70%,#3e4836)",
          }}
        />
        <div>
          <p className="text-xs font-semibold tracking-widest text-gold">
            {story.cityHe}
          </p>
          <h3 className="mt-1 font-display text-2xl">{story.titleHe}</h3>
          <p className="mt-2 max-w-md text-sm text-ink-soft">{story.storyHe}</p>
          <p className="mt-3 text-xs text-gold">{story.metaHe}</p>
        </div>
      </article>
    </div>
  );
}
