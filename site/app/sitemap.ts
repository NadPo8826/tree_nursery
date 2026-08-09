import type { MetadataRoute } from "next";
import { repo } from "@/lib/db";
import { VETERANS_CATEGORY, categorySlug, stockCategories } from "@/lib/catalog";
import { siteUrl } from "@/lib/seo";

const BASE = siteUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [trees, guides] = await Promise.all([repo.getTrees(), repo.getGuides()]);

  const statics = ["", "/catalog", "/sales", "/about", "/process", "/projects", "/guides", "/visit", "/pro", "/accessibility"];
  const cats = stockCategories(trees);
  if (trees.some((t) => t.saleType === "unique")) cats.push(VETERANS_CATEGORY);

  return [
    ...statics.map((path) => ({
      url: `${BASE}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
    })),
    ...cats.map((c) => ({
      url: `${BASE}/catalog/${encodeURIComponent(categorySlug(c))}`,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...trees
      .filter((t) => t.saleType !== "unique" || t.availability !== "sold")
      .map((t) => ({
        url: `${BASE}/tree/${t.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ...guides
      .filter((g) => g.published)
      .map((g) => ({
        url: `${BASE}/guides/${g.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
  ];
}
