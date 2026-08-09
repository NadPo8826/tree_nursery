import Link from "next/link";
import type { ReactNode } from "react";
import type { Tree } from "@/lib/types";

/** Stock trees: in stock / out of stock. Veterans show no availability at all. */
function stockLabel(a: Tree["availability"]): string {
  return a === "sold" ? "אזל מהמלאי" : "במלאי";
}

/** Placeholder art until real photos are uploaded via /admin. */
const placeholderGradients = [
  "linear-gradient(170deg,#9aa884,#55614a 70%,#3e4836)",
  "linear-gradient(170deg,#8ca06e,#485840 70%,#333f2c)",
  "linear-gradient(170deg,#a8a87e,#5e5e44 70%,#434332)",
];

export function TreeCard({
  tree,
  index = 0,
  actions,
  showPrices = true,
}: {
  tree: Tree;
  index?: number;
  /** Optional interactive footer (e.g. RFQ controls) — rendered outside the link. */
  actions?: ReactNode;
  /** Global settings switch; combined with the tree's own priceMode. */
  showPrices?: boolean;
}) {
  const art = tree.photos[0]
    ? `url(${tree.photos[0]})`
    : placeholderGradients[index % placeholderGradients.length];

  return (
    <div className="group overflow-hidden rounded-[20px_20px_56px_20px] border-[1.5px] border-line-sand bg-card transition-all hover:-translate-y-1 hover:border-clay hover:shadow-xl hover:shadow-clay/10">
      <Link href={`/tree/${tree.slug}`} className="block">
        <div
          className="relative h-52 bg-cover bg-center"
          style={{ backgroundImage: art }}
        >
          {tree.saleType === "unique" ? (
            <span className="absolute end-3 top-3 rounded-full bg-soil/85 px-3 py-0.5 text-xs text-gold-bright">
              ✦ דייר ותיק
            </span>
          ) : (
            <span
              className={`absolute start-3 top-3 rounded-full px-3 py-0.5 text-xs text-white ${
                tree.availability === "sold" ? "bg-ink-muted" : "bg-leaf"
              }`}
            >
              {stockLabel(tree.availability)}
            </span>
          )}
        </div>
        <div className="px-5 pt-5">
          <h3 className="font-display text-xl">{tree.nameHe}</h3>
          {tree.speciesLatin && (
            <p className="text-xs italic text-ink-muted" dir="ltr">
              {tree.speciesLatin}
            </p>
          )}
          {(() => {
            // only specs that actually have data make it onto the card
            const specs = [
              tree.ageYears > 0 && `גיל ~${tree.ageYears}`,
              tree.heightM > 0 && `גובה ${tree.heightM} מ׳`,
              tree.trunkDiameterCm > 0 && `גזע Ø${tree.trunkDiameterCm} ס״מ`,
            ].filter(Boolean);
            return specs.length > 0 ? (
              <p className="mt-2 text-xs text-ink-muted">{specs.join(" · ")}</p>
            ) : null;
          })()}
          {showPrices && tree.priceMode !== "hidden" ? (
            <p className="mt-2 text-sm font-semibold text-clay-deep tabular-nums">
              {/* a veteran is one specific tree — its price is exact */}
              {tree.saleType === "unique" ? "" : "החל מ־"}₪
              {tree.price.toLocaleString("he-IL")}
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">למחיר — צרו איתנו קשר</p>
          )}
        </div>
      </Link>
      <div className={actions ? "px-5 pb-5 pt-3" : "pb-5"}>{actions}</div>
    </div>
  );
}
