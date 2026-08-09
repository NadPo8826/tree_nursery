"use client";

import { useEffect, useState } from "react";
import type { Tree } from "@/lib/types";
import { whatsappLink } from "@/lib/site";
import { TreeCard } from "@/components/TreeCard";
import { LeadForm } from "@/components/LeadForm";

interface RfqItem {
  slug: string;
  qty: number; // exact unit count — the nursery quotes real numbers, not ranges
}

type BarPanel = "closed" | "details" | "quote";

// v2: qty became an exact number (was a range string)
const RFQ_STORAGE_KEY = "rfq-v2";

export function CatalogExplorer({
  trees,
  showPrices = true,
  whatsapp,
}: {
  trees: Tree[];
  showPrices?: boolean;
  whatsapp: string;
}) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [rfq, setRfq] = useState<RfqItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [panel, setPanel] = useState<BarPanel>("closed");
  const [quoteSent, setQuoteSent] = useState(false);
  // categories start collapsed — the header cards themselves are the map
  const [openCats, setOpenCats] = useState<string[]>([]);

  const toggleCat = (category: string) =>
    setOpenCats((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RFQ_STORAGE_KEY);
      if (saved) {
        const parsed = (JSON.parse(saved) as RfqItem[]).filter(
          (i) => typeof i.qty === "number" && i.qty >= 1,
        );
        setRfq(parsed);
      }
    } catch {
      /* corrupt storage — start fresh */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(RFQ_STORAGE_KEY, JSON.stringify(rfq));
  }, [rfq, loaded]);

  const veterans = trees.filter((t) => t.saleType === "unique");
  const stock = trees.filter((t) => t.saleType !== "unique");
  // Stock grouped by the owner's category (עצי זית / עצי הדר…), in order of
  // first appearance; uncategorized trees gather at the end.
  const stockGroups: { category: string; trees: Tree[] }[] = [];
  for (const tree of stock) {
    const category = tree.categoryHe || "עוד עצים";
    const group = stockGroups.find((g) => g.category === category);
    if (group) group.trees.push(tree);
    else stockGroups.push({ category, trees: [tree] });
  }
  stockGroups.sort((a, b) =>
    a.category === "עוד עצים" ? 1 : b.category === "עוד עצים" ? -1 : 0,
  );

  const inRfq = (slug: string) => rfq.some((i) => i.slug === slug);

  function toggleRfq(tree: Tree) {
    setRfq((prev) =>
      prev.some((i) => i.slug === tree.slug)
        ? prev.filter((i) => i.slug !== tree.slug)
        : [...prev, { slug: tree.slug, qty: qty[tree.slug] ?? 1 }],
    );
  }

  const rfqTrees = rfq
    .map((item) => ({ item, tree: trees.find((t) => t.slug === item.slug) }))
    .filter((x): x is { item: RfqItem; tree: Tree } => Boolean(x.tree));

  const rfqMessage =
    "שלום, בחרתי עצים באתר ואשמח להצעת מחיר:\n" +
    rfqTrees
      .map(({ item, tree }) =>
        tree.saleType === "unique"
          ? `- ${tree.nameHe}${tree.code ? ` (עץ ${tree.code})` : ""}`
          : `- ${tree.nameHe} × ${item.qty}`,
      )
      .join("\n");

  function cardActions(tree: Tree) {
    const added = inRfq(tree.slug);
    if (tree.saleType !== "unique" && tree.availability === "sold") {
      return (
        <div className="flex items-center justify-between gap-3 border-t border-line-sand pt-3">
          <span className="text-xs text-ink-muted">
            אזל מהמלאי — רוצים שנעדכן כשיחזור? צרו קשר
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between gap-3 border-t border-line-sand pt-3">
        {tree.saleType === "unique" ? (
          <span className="text-xs text-ink-muted">
            עץ אחד ויחיד — נמכר כמו שהוא
          </span>
        ) : (
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            כמות
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              value={qty[tree.slug] ?? 1}
              onChange={(e) => {
                const value = Math.max(1, Math.min(999, Number(e.target.value) || 1));
                setQty((p) => ({ ...p, [tree.slug]: value }));
                setRfq((prev) =>
                  prev.map((item) =>
                    item.slug === tree.slug ? { ...item, qty: value } : item,
                  ),
                );
              }}
              className="w-16 rounded-full border-[1.5px] border-line-warm bg-card px-3 py-1.5 text-center text-xs tabular-nums"
            />
          </label>
        )}
        <button
          onClick={() => toggleRfq(tree)}
          aria-pressed={added}
          className={`flex min-h-11 items-center gap-2 rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold transition-colors ${
            added
              ? "border-clay bg-clay text-white"
              : "border-clay bg-transparent text-clay-deep hover:bg-clay hover:text-white"
          }`}
        >
          {added ? "✓ במריצה" : "+ הוספה למריצה"}
        </button>
      </div>
    );
  }

  return (
    <div className={rfq.length > 0 ? "pb-32" : ""}>
      {/* One uniform list of collapsible groups; veterans are simply the
          first group (with a gold ✦), not a special block */}
      {(veterans.length > 0 || stock.length > 0) && (
        <section className="mt-8">
          {[
            ...(veterans.length > 0
              ? [{ category: "דיירים ותיקים", trees: veterans, isVeterans: true }]
              : []),
            ...stockGroups.map((g) => ({ ...g, isVeterans: false })),
          ].map((group) => {
            const open = openCats.includes(group.category);
            return (
              <div key={group.category} id={`cat-${group.category}`} className="mt-6 scroll-mt-28">
                <button
                  onClick={() => toggleCat(group.category)}
                  aria-expanded={open}
                  className={`flex min-h-14 w-full items-center gap-4 rounded-[18px_18px_18px_48px] border-[1.5px] px-5 text-start transition-colors ${
                    open
                      ? "border-clay/50 bg-card"
                      : "border-line-sand bg-card hover:border-clay/50"
                  }`}
                >
                  <span>
                    <span className="font-display text-xl">
                      {group.isVeterans && <span className="text-gold">✦ </span>}
                      {group.category}
                    </span>
                    <span className="mt-1 block h-0.5 w-9 rounded bg-gradient-to-l from-clay to-gold" />
                  </span>
                  {group.isVeterans && (
                    <span className="hidden text-xs text-ink-muted sm:inline">
                      עצים יחידים — כל אחד קיים פעם אחת
                    </span>
                  )}
                  <span className="ms-auto text-xs text-ink-muted tabular-nums">
                    {group.trees.length} {group.isVeterans ? "עצים" : "זנים"}
                  </span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                    className={`shrink-0 text-clay-deep transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {open && (
                  <div className="mt-5 grid gap-8 pb-2 sm:grid-cols-2 lg:grid-cols-3">
                    {group.trees.map((tree, i) => (
                      <TreeCard
                        key={tree.slug}
                        tree={tree}
                        index={i}
                        showPrices={showPrices}
                        actions={cardActions(tree)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Success confirmation after an in-app quote request */}
      {quoteSent && (
        <div className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-full border-[1.5px] border-leaf bg-[#F1EFDC] px-6 py-3.5 shadow-2xl shadow-soil/30">
          <span className="text-sm text-[#3E6231]">
            <b>הבקשה נשלחה ✓</b> — נחזור אליכם עם הצעת מחיר בהקדם.
          </span>
          <button
            onClick={() => setQuoteSent(false)}
            aria-label="סגירה"
            className="grid size-8 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-sand"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sticky selection bar — compact count only; panels open on demand */}
      {rfq.length > 0 && !quoteSent && (
        <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-xl">
          {panel === "details" && (
            <div className="mb-2 max-h-64 overflow-y-auto rounded-3xl border-[1.5px] border-line-sand bg-card p-4 shadow-2xl shadow-soil/30">
              <ul className="divide-y divide-line-sand text-sm">
                {rfqTrees.map(({ item, tree }) => (
                  <li
                    key={item.slug}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span>
                      {tree.nameHe}
                      <span className="ms-2 text-xs text-ink-muted">
                        {tree.saleType === "unique" ? "עץ יחיד" : `× ${item.qty}`}
                      </span>
                    </span>
                    <button
                      onClick={() =>
                        setRfq((prev) => prev.filter((i) => i.slug !== item.slug))
                      }
                      aria-label={`הסרת ${tree.nameHe}`}
                      className="grid size-8 place-items-center rounded-full text-ink-muted hover:bg-sand hover:text-ink"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setRfq([])}
                className="mt-2 text-xs text-ink-muted hover:text-ink"
              >
                ניקוי הכול
              </button>
            </div>
          )}
          {panel === "quote" && (
            <div className="mb-2 max-h-[70vh] overflow-y-auto rounded-3xl border-[1.5px] border-line-sand bg-card p-5 shadow-2xl shadow-soil/30">
              <p className="font-display text-lg">בקשת הצעת מחיר</p>
              <p className="mb-4 mt-0.5 text-xs text-ink-muted">
                {rfqTrees
                  .map(({ item, tree }) =>
                    tree.saleType === "unique"
                      ? tree.nameHe
                      : `${tree.nameHe} ×${item.qty}`,
                  )
                  .join(" · ")}
              </p>
              <LeadForm
                interest="בקשת הצעת מחיר לעצים שנבחרו"
                channel="rfq"
                messageLabel="הערות (לא חובה) — גישה לשטח, מועד רצוי, או כל דבר שכדאי שנדע"
                items={rfqTrees.map(({ item, tree }) => ({
                  treeSlug: tree.slug,
                  treeName: tree.nameHe,
                  qtyRange: tree.saleType === "unique" ? "עץ יחיד" : String(item.qty),
                }))}
                submitLabel="שליחת הבקשה"
                onSuccess={() => {
                  setRfq([]);
                  setPanel("closed");
                  setQuoteSent(true);
                }}
              />
              <p className="mt-3 text-center text-xs text-ink-muted">
                מעדיפים לדבר?{" "}
                <a href={whatsappLink(whatsapp, rfqMessage)} className="border-b border-gold">
                  שלחו את הרשימה בוואטסאפ
                </a>
              </p>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 rounded-full bg-soil/95 px-5 py-3 text-ink-cream shadow-2xl shadow-soil/50">
            <button
              onClick={() => setPanel(panel === "details" ? "closed" : "details")}
              aria-expanded={panel === "details"}
              className="flex min-h-11 items-center gap-2 text-sm"
            >
              <b className="text-gold-bright">
                {rfq.length === 1 ? "עץ אחד במריצה" : `${rfq.length} עצים במריצה`}
              </b>
              <span
                aria-hidden
                className={`text-xs transition-transform ${panel === "details" ? "rotate-180" : ""}`}
              >
                ▲
              </span>
            </button>
            <button
              onClick={() => setPanel(panel === "quote" ? "closed" : "quote")}
              aria-expanded={panel === "quote"}
              className="rounded-full bg-clay px-5 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              לקבלת הצעת מחיר
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
