import type { Metadata } from "next";
import Link from "next/link";
import { repo } from "@/lib/db";

export const metadata: Metadata = { title: "מדריכים" };
export const revalidate = 60;

export default async function GuidesPage() {
  const guides = (await repo.getGuides()).filter((g) => g.published);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-10 md:px-12">
      <h1 className="font-display text-4xl">מדריכים מבין השורות</h1>
      <p className="mt-2 text-sm text-ink-muted">
        שלושים שנה של ניסיון, כתובים בגובה העיניים — בלי ז'רגון.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((g) => (
          <Link
            key={g.slug}
            href={`/guides/${g.slug}`}
            className="block rounded-[20px_20px_56px_20px] border-[1.5px] border-line-sand bg-card p-6 transition-all hover:-translate-y-1 hover:border-clay hover:shadow-xl hover:shadow-clay/10"
          >
            <p className="text-xs font-semibold tracking-widest text-gold">
              {g.categoryHe} · {g.minutes} דק׳
            </p>
            <h2 className="mt-2 font-display text-xl">{g.titleHe}</h2>
            <p className="mt-2 text-sm text-ink-muted">{g.excerptHe}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
