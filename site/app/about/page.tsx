import type { Metadata } from "next";
import Link from "next/link";
import { milestones } from "@/data/milestones";

export const metadata: Metadata = { title: "הסיפור" };
export const revalidate = 60;

export default function AboutPage() {

  return (
    <div className="mx-auto max-w-3xl px-6 pb-16 pt-10">
      <h1 className="font-display text-4xl">שלושים שנה של שורות</h1>
      <ol className="mt-10 space-y-9">
        {milestones.map((m) => (
          <li key={m.id} className="flex gap-5">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-soil text-xs font-bold text-ink-cream">
              {m.yearHe}
            </span>
            <div>
              <h2 className="font-display text-2xl">{m.titleHe}</h2>
              <p className="mt-1 max-w-lg text-sm text-ink-soft">{m.textHe}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-10 text-center">
        <Link
          href="/visit"
          className="rounded-full bg-clay px-6 py-2.5 font-semibold text-white shadow-lg shadow-clay/30"
        >
          בואו להכיר — תיאום ביקור
        </Link>
      </div>
    </div>
  );
}
