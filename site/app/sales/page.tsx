import type { Metadata } from "next";
import Link from "next/link";
import { repo } from "@/lib/db";
import { TreeCard } from "@/components/TreeCard";
import { isOnSale } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "מבצעים והצעות מיוחדות — עצים בוגרים",
  description: "עצים בוגרים במחיר מיוחד לתקופה מוגבלת — כל עץ עם עמוד ייעודי ואפשרות לבקשת הצעת מחיר.",
};
export const revalidate = 60;

export default async function SalesPage() {
  const [trees, settings] = await Promise.all([
    repo.getTrees(),
    repo.getSettings(),
  ]);
  const onSale = trees.filter(isOnSale);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-10 md:px-12">
      <h1 className="font-display text-4xl">מבצעים והצעות מיוחדות</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-muted">
        עצים בוגרים במחיר מיוחד, לתקופה מוגבלת. לכל עץ עמוד ייעודי — ונשמח
        ללוות אתכם בבחירה.
      </p>

      {onSale.length === 0 ? (
        <div className="mt-10 rounded-[22px_22px_22px_64px] border-[1.5px] border-line-warm bg-card p-10 text-center">
          <p className="font-display text-2xl">אין מבצעים פעילים כרגע</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            שווה לחזור לכאן מדי פעם — או פשוט לבוא לבקר במשתלה ולשמוע מאיתנו
            ישירות מה מיוחד עכשיו.
          </p>
          <Link
            href="/catalog"
            className="mt-6 inline-block rounded-full bg-clay px-7 py-3 font-semibold text-white shadow-lg shadow-clay/30"
          >
            לקטלוג המלא
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {onSale.map((tree, i) => (
            <TreeCard
              key={tree.slug}
              tree={tree}
              index={i}
              showPrices={settings.showPrices}
            />
          ))}
        </div>
      )}
    </div>
  );
}
