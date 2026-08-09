/** Data model — mirrors the planned Supabase schema (PLAN.md §2). */

export type Availability = "available" | "reserved" | "preorder" | "sold";
export type PriceMode = "hidden" | "from" | "visible";

/**
 * unique — a specific individual tree (exists once, sold one-by-one,
 *          e.g. an ancient olive with its own story and tag number).
 * stock  — a variety grown in quantity, sold by units/ranges.
 */
export type SaleType = "unique" | "stock";


export interface Tree {
  slug: string;
  code: string; // physical tag number in the nursery, e.g. "214"
  nameHe: string;
  speciesLatin: string;
  /** Catalog group set by the owner, e.g. "עצי זית" / "עצי הדר" / "עצי נוי". */
  categoryHe: string;
  storyHe: string;
  /**
   * Owner's notes for the AI assistant only (irrigation, shade, growth
   * rate, pruning…). Never rendered on the site — served to the AI through
   * the search_trees tool so it can answer care questions accurately.
   */
  aiNotesHe: string;
  /** Detailed specs — meaningful mainly for veterans; 0/empty = not shown. */
  heightM: number;
  trunkDiameterCm: number;
  ageYears: number;
  rootBallWeightKg?: number;
  requirementsHe?: string;
  price: number;
  /** Sale price — when set and lower than price, the tree shows on /sales with the old price struck through. */
  promoPrice?: number;
  priceMode: PriceMode;
  availability: Availability;
  saleType: SaleType;
  featured: boolean;
  /** Paths under /public or Supabase Storage URLs; empty → placeholder art. */
  photos: string[];
}

export interface Guide {
  slug: string;
  titleHe: string;
  categoryHe: string;
  minutes: number;
  excerptHe: string;
  bodyMd: string;
  published: boolean;
}

export interface Project {
  slug: string;
  titleHe: string;
  cityHe: string;
  /** Position on the site's stylized Israel map (SVG viewBox coords). */
  mapX: number;
  mapY: number;
  year: number;
  storyHe: string;
  metaHe: string;
  /** Uploaded photo shown beside the map; empty → placeholder art. */
  imageUrl?: string;
  published: boolean;
}
