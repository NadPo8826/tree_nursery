import type { Metadata } from "next";
import { repo } from "@/lib/db";
import { CatalogExplorer } from "@/components/CatalogExplorer";

export const metadata: Metadata = { title: "קטלוג העצים" };
export const revalidate = 60;

export default async function CatalogPage() {
  const [trees, settings] = await Promise.all([
    repo.getTrees(),
    repo.getSettings(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-10 md:px-12">
      <h1 className="font-display text-4xl">קטלוג העצים</h1>
      <CatalogExplorer
        trees={trees.filter(
          // veterans are cherry-picked: shown only while offered;
          // stock varieties stay visible even when out of stock
          (t) => t.saleType !== "unique" || t.availability !== "sold",
        )}
        showPrices={settings.showPrices}
        whatsapp={settings.whatsapp}
      />
    </div>
  );
}
