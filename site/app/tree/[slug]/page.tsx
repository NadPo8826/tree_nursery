import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/lib/db";
import { whatsappLink } from "@/lib/site";
import { hasPromo } from "@/lib/catalog";
import { safeJsonLd } from "@/lib/seo";
import { TreeGallery } from "@/components/TreeGallery";

export const revalidate = 60;

export async function generateStaticParams() {
  const trees = await repo.getTrees();
  return trees.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const tree = await repo.getTree((await params).slug);
  return { title: tree ? tree.nameHe : "עץ" };
}

export default async function TreePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [tree, settings] = await Promise.all([
    repo.getTree((await params).slug),
    repo.getSettings(),
  ]);
  if (!tree) notFound();

  // per-specimen specs are shown for veterans only (stock trees may carry
  // values in the DB — e.g. after a type switch — but never display them);
  // within that, only specs with actual data are rendered
  const specs: [string, string][] = [];
  if (tree.saleType === "unique") {
    if (tree.ageYears > 0) specs.push(["גיל משוער", `~${tree.ageYears} שנה`]);
    if (tree.heightM > 0) specs.push(["גובה נוכחי", `${tree.heightM} מ׳`]);
    if (tree.trunkDiameterCm > 0) specs.push(["קוטר גזע", `${tree.trunkDiameterCm} ס״מ`]);
    if (tree.rootBallWeightKg) {
      specs.push(["משקל גוש", `~${(tree.rootBallWeightKg / 1000).toFixed(1)} טון`]);
    }
    if (tree.requirementsHe) specs.push(["דרישות", tree.requirementsHe]);
  }

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: tree.nameHe,
    ...(tree.saleType === "unique" &&
      tree.speciesLatin && { alternateName: tree.speciesLatin }),
    ...(tree.storyHe && { description: tree.storyHe }),
    ...(tree.photos[0] && { image: tree.photos[0] }),
    ...(settings.showPrices &&
      tree.priceMode !== "hidden" && {
        offers: {
          "@type": "Offer",
          priceCurrency: "ILS",
          price: hasPromo(tree) ? tree.promoPrice : tree.price,
          availability:
            tree.availability === "sold"
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
        },
      }),
  };

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-8 md:px-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(productJsonLd) }}
      />
      <nav className="text-xs text-ink-muted">
        <Link href="/catalog" className="hover:text-ink">
          קטלוג העצים
        </Link>{" "}
        /{" "}
        <b className="text-ink">
          {tree.nameHe}
          {tree.saleType === "unique" && tree.code ? ` · עץ ${tree.code}` : ""}
        </b>
      </nav>

      <div className="mt-6 grid items-start gap-10 md:grid-cols-2">
        <TreeGallery photos={tree.photos} nameHe={tree.nameHe} />

        <div>
          <span className="flex flex-wrap items-center gap-2">
            {tree.saleType === "unique" ? (
              <span className="inline-block rounded-full bg-soil px-3 py-0.5 text-xs text-gold-bright">
                ✦ דייר ותיק — עץ יחיד במינו, קיים אחד כזה
              </span>
            ) : (
              <span
                className={`inline-block rounded-full px-3 py-0.5 text-xs text-white ${
                  tree.availability === "sold" ? "bg-ink-muted" : "bg-leaf"
                }`}
              >
                {tree.availability === "sold" ? "אזל מהמלאי" : "במלאי"}
              </span>
            )}
          </span>
          <h1 className="mt-3 font-display text-4xl">{tree.nameHe}</h1>
          {tree.saleType === "unique" && (tree.speciesLatin || tree.code) && (
            <p className="text-sm italic text-ink-muted" dir="ltr">
              {[tree.speciesLatin, tree.code && `#${tree.code}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {tree.storyHe && (
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              {tree.storyHe}
            </p>
          )}

          {specs.length > 0 && (
            <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 border-y border-line-sand py-5 text-sm">
              {specs.map(([dt, dd]) => (
                <div key={dt} className="contents">
                  <dt className="text-ink-muted">{dt}</dt>
                  <dd className="font-semibold tabular-nums">{dd}</dd>
                </div>
              ))}
            </dl>
          )}

          {settings.showPrices && tree.priceMode !== "hidden" ? (
            <p className="mt-5 font-display text-2xl font-semibold text-clay-deep tabular-nums">
              {hasPromo(tree) && (
                <>
                  <span className="me-3 rounded-full bg-gold-bright px-3 py-0.5 align-middle font-body text-xs font-semibold text-soil">
                    מבצע
                  </span>
                  <span className="me-2 font-body text-base font-normal text-ink-muted line-through">
                    ₪{tree.price.toLocaleString("he-IL")}
                  </span>
                </>
              )}
              {tree.saleType === "unique" ? "" : "החל מ־"}₪
              {(hasPromo(tree) ? tree.promoPrice! : tree.price).toLocaleString("he-IL")}
              <span className="mt-1 block font-body text-xs font-normal text-ink-muted">
                להצעת מחיר מסודרת — דברו איתנו.
              </span>
            </p>
          ) : (
            <p className="mt-5 text-sm text-ink-muted">
              למחיר — צרו איתנו קשר ונחזור אליכם עם הצעה מסודרת.
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-6">
            <Link
              href="/visit?topic=quote"
              className="rounded-full bg-clay px-6 py-2.5 font-semibold text-white shadow-lg shadow-clay/30 transition-transform hover:-translate-y-0.5"
            >
              בקשו הצעת מחיר לעץ הזה
            </Link>
            <a
              href={whatsappLink(
                settings.whatsapp,
                `שלום, ראיתי באתר את ${tree.nameHe}${
                  tree.saleType === "unique" && tree.code ? ` (עץ ${tree.code})` : ""
                } ורציתי לשאול…`,
              )}
              className="border-b border-gold pb-0.5 text-sm"
            >
              שאלו עליו בוואטסאפ
            </a>
          </div>
          <p className="mt-5 text-xs text-ink-muted">
            אנשי מקצוע: דף מפרט PDF יהיה זמין להורדה · קו ישיר {settings.proPhone}
          </p>
        </div>
      </div>
    </div>
  );
}
