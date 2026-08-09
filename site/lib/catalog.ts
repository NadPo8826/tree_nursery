import type { Tree } from "@/lib/types";

/** The veterans pseudo-category — gets a landing page like real categories. */
export const VETERANS_CATEGORY = "דיירים ותיקים";

/** URL segment for a category: spaces → hyphens (Hebrew is URL-safe). */
export function categorySlug(category: string): string {
  return category.trim().replaceAll(" ", "-");
}

/**
 * Resolve a URL segment back to the real category name by comparing slugs —
 * never by reversing the transform (names may themselves contain hyphens,
 * which would make the round-trip lossy and publish dead URLs).
 */
export function categoryFromSlug(
  slug: string,
  categories: string[],
): string | undefined {
  const decoded = decodeURIComponent(slug);
  return categories.find((c) => categorySlug(c) === decoded);
}

/** Distinct stock categories in display order (first appearance). */
export function stockCategories(trees: Tree[]): string[] {
  return [
    ...new Set(
      trees
        .filter((t) => t.saleType !== "unique")
        .map((t) => t.categoryHe)
        .filter(Boolean),
    ),
  ];
}

/** A tree's promo is active only when it actually undercuts the price. */
export function hasPromo(t: Tree): boolean {
  return typeof t.promoPrice === "number" && t.promoPrice > 0 && t.promoPrice < t.price;
}

/** On sale AND actually purchasable — the single source for nav/homepage/sales/AI. */
export function isOnSale(t: Tree): boolean {
  return hasPromo(t) && (t.saleType !== "unique" || t.availability !== "sold");
}
