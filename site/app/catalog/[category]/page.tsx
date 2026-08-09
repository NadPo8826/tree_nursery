import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/lib/db";
import { TreeCard } from "@/components/TreeCard";
import {
  VETERANS_CATEGORY,
  categoryFromSlug,
  categorySlug,
  stockCategories,
} from "@/lib/catalog";
import { safeJsonLd } from "@/lib/seo";

/**
 * SEO landing page per catalog category (עצי-זית, עצי-צל…), generated from
 * the same admin data as the catalog. The in-catalog sections serve
 * browsing; these pages serve search engines and direct links.
 */
export const revalidate = 60;
export const dynamicParams = true; // new admin categories work without rebuild

export async function generateStaticParams() {
  const trees = await repo.getTrees();
  const cats = stockCategories(trees);
  if (trees.some((t) => t.saleType === "unique")) cats.push(VETERANS_CATEGORY);
  return cats.map((c) => ({ category: categorySlug(c) }));
}

async function loadCategory(slug: string) {
  const [trees, settings] = await Promise.all([
    repo.getTrees(),
    repo.getSettings(),
  ]);
  // resolve by slug comparison (never by reversing the transform — category
  // names may themselves contain hyphens)
  const name = categoryFromSlug(slug, [
    ...stockCategories(trees),
    VETERANS_CATEGORY,
  ]);
  const isVeterans = name === VETERANS_CATEGORY;
  const shown = name
    ? trees.filter((t) =>
        isVeterans
          ? t.saleType === "unique" && t.availability !== "sold"
          : t.saleType !== "unique" && t.categoryHe === name,
      )
    : [];
  return { name: name ?? "", isVeterans, shown, settings };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { name, shown, settings } = await loadCategory((await params).category);
  if (shown.length === 0) return { title: "קטלוג העצים" };
  return {
    title: `${name} — עצים בוגרים למכירה`,
    description: `${name} במשתלת ${settings.siteName}: עצים בוגרים עם עמוד ייעודי לכל עץ — מידות, תמונות ובקשת הצעת מחיר.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { name, isVeterans, shown, settings } = await loadCategory(
    (await params).category,
  );
  if (shown.length === 0) notFound();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${name} — ${settings.siteName}`,
    itemListElement: shown.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.nameHe,
      url: `/tree/${t.slug}`,
    })),
  };

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-10 md:px-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListJsonLd) }}
      />
      <nav className="text-xs text-ink-muted">
        <Link href="/catalog" className="hover:text-ink">
          קטלוג העצים
        </Link>{" "}
        / <b className="text-ink">{name}</b>
      </nav>
      <h1 className="mt-3 font-display text-4xl">
        {isVeterans ? `✦ ${name}` : name}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-ink-muted">
        {isVeterans
          ? "עצים יחידים במינם — כל אחד קיים פעם אחת, עם סיפור משלו, ונמכר אחד־אחד."
          : `${shown.length} זנים של ${name} שגדלים אצלנו בשורות — עמוד ייעודי לכל עץ.`}
      </p>

      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((tree, i) => (
          <TreeCard
            key={tree.slug}
            tree={tree}
            index={i}
            showPrices={settings.showPrices}
          />
        ))}
      </div>

      <div className="mt-12 text-center">
        <Link
          href="/catalog"
          className="rounded-full bg-clay px-7 py-3 font-semibold text-white shadow-lg shadow-clay/30 transition-transform hover:-translate-y-0.5"
        >
          לקטלוג המלא — לבחירה ולהצעת מחיר
        </Link>
      </div>
    </div>
  );
}
