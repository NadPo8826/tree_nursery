import Link from "next/link";
import { site } from "@/lib/site";
import { repo } from "@/lib/db";
import { siteContent } from "@/data/content";
import { HorizonCurve } from "@/components/HorizonCurve";
import { TreeCard } from "@/components/TreeCard";
import { Reveal } from "@/components/Reveal";
import { HeroGallery } from "@/components/HeroGallery";
import { IsraelMap } from "@/components/IsraelMap";
import { QuoteCarousel } from "@/components/QuoteCarousel";
import { hasPromo, isOnSale } from "@/lib/catalog";
import type { Tree } from "@/lib/types";
import type { ClientEntry } from "@/lib/db";

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <Reveal className="mb-10 text-center">
      <h2 className="font-display text-3xl md:text-4xl">{title}</h2>
      <div className="mx-auto mt-3 h-0.5 w-14 rounded bg-gradient-to-l from-clay to-gold" />
      {sub && <p className="mt-3 text-sm text-ink-muted">{sub}</p>}
    </Reveal>
  );
}

function Gateway({
  href,
  title,
  sub,
}: {
  href: string;
  title: string;
  sub: string;
}) {
  return (
    <Reveal>
      <Link
        href={href}
        className="group mx-auto mt-10 flex max-w-3xl items-center justify-between gap-6 rounded-[22px_22px_22px_64px] border-[1.5px] border-line-warm bg-card px-8 py-6 transition-all hover:-translate-y-1 hover:border-clay hover:shadow-xl hover:shadow-clay/10"
      >
        <span>
          <span className="block font-display text-xl">{title}</span>
          <span className="mt-1 block text-sm text-ink-muted">{sub}</span>
        </span>
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-full bg-clay text-lg text-white transition-transform group-hover:-translate-x-1"
        >
          ←
        </span>
      </Link>
    </Reveal>
  );
}

const seasonArt: Record<string, string> = {
  winter: "linear-gradient(165deg,#b9c4a8,#77836a)",
  spring: "linear-gradient(165deg,#c4a4b4,#7a5c6e)",
  summer: "linear-gradient(165deg,#8fa379,#4c5c40)",
  autumn: "linear-gradient(165deg,#b9ae8c,#6e6a50)",
};
const seasonNames: Record<string, string> = {
  winter: "חורף",
  spring: "אביב",
  summer: "קיץ",
  autumn: "סתיו",
};

/** One row of the clients marquee: content duplicated for a seamless loop. */
function ClientsRow({
  clients,
  reverse = false,
}: {
  clients: ClientEntry[];
  reverse?: boolean;
}) {
  // big, airy logo-wall items — no card chrome, generous spacing
  let chipIndex = 0;
  const chip = (client: ClientEntry, ariaHidden: boolean) => (
    <span
      key={`${client.id}-${chipIndex++}`}
      aria-hidden={ariaHidden || undefined}
      className="flex shrink-0 items-center gap-5"
    >
      {client.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={client.logoUrl}
          alt={ariaHidden ? "" : client.nameHe}
          className="h-20 w-auto max-w-48 rounded-xl object-contain md:h-24"
        />
      )}
      {client.nameHe && (
        <span className="whitespace-nowrap font-display text-2xl text-ink-soft md:text-3xl">
          {client.nameHe}
        </span>
      )}
      <span aria-hidden className="ms-9 size-1.5 rounded-full bg-gold/60" />
    </span>
  );

  return (
    <div className="marquee overflow-hidden py-2">
      <div
        className={`marquee-track flex w-max items-center gap-14 pe-14 ${reverse ? "marquee-reverse" : ""}`}
        style={{ animationDuration: `${Math.max(20, clients.length * 9)}s` }}
      >
        {/* six copies keep the track wider than any viewport even with few,
            short client names — the keyframe shifts by exactly one copy (1/6),
            so the loop never exposes an empty edge */}
        {Array.from({ length: 6 }, (_, copy) =>
          clients.map((c) => chip(c, copy > 0)),
        )}
      </div>
    </div>
  );
}

/** Full-width feature card for a lone veteran — a spotlight, not a grid cell. */
function VeteranSpotlight({
  tree,
  showPrices,
}: {
  tree: Tree;
  showPrices: boolean;
}) {
  const specs = [
    tree.ageYears > 0 && `גיל ~${tree.ageYears}`,
    tree.heightM > 0 && `גובה ${tree.heightM} מ׳`,
    tree.trunkDiameterCm > 0 && `גזע Ø${tree.trunkDiameterCm} ס״מ`,
  ].filter(Boolean);
  const promo = hasPromo(tree);

  return (
    <Reveal>
      <Link
        href={`/tree/${tree.slug}`}
        className="group grid overflow-hidden rounded-[24px_24px_24px_84px] border-[1.5px] border-line-sand bg-card transition-all hover:-translate-y-1 hover:border-clay hover:shadow-xl hover:shadow-clay/10 md:grid-cols-2"
      >
        <div
          className="min-h-72 bg-cover bg-center md:min-h-[420px]"
          style={{
            backgroundImage: tree.photos[0]
              ? `url(${tree.photos[0]})`
              : "linear-gradient(170deg,#9aa884,#55614a 70%,#3e4836)",
          }}
        />
        <div className="flex flex-col p-7 md:p-10">
          <span className="self-start rounded-full bg-soil px-3 py-1 text-xs text-gold-bright">
            ✦ דייר ותיק — קיים אחד כזה
          </span>
          <h3 className="mt-4 font-display text-3xl md:text-4xl">{tree.nameHe}</h3>
          {tree.speciesLatin && (
            <p className="mt-1 text-sm italic text-ink-muted" dir="ltr">
              {tree.speciesLatin}
            </p>
          )}
          {tree.storyHe && (
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              {tree.storyHe}
            </p>
          )}
          {specs.length > 0 && (
            <p className="mt-4 text-xs text-ink-muted">{specs.join(" · ")}</p>
          )}
          <div className="mt-auto flex items-center justify-between gap-4 pt-6">
            {showPrices && tree.priceMode !== "hidden" ? (
              <p className="font-display text-2xl font-semibold text-clay-deep tabular-nums">
                {promo && (
                  <span className="me-2 font-body text-base font-normal text-ink-muted line-through">
                    ₪{tree.price.toLocaleString("he-IL")}
                  </span>
                )}
                ₪{(promo ? tree.promoPrice! : tree.price).toLocaleString("he-IL")}
              </p>
            ) : (
              <p className="text-sm text-ink-muted">למחיר — צרו איתנו קשר</p>
            )}
            <span className="flex items-center gap-2 text-sm font-semibold text-clay-deep">
              להכיר את העץ
              <span
                aria-hidden
                className="grid size-9 place-items-center rounded-full bg-clay text-white transition-transform group-hover:-translate-x-0.5"
              >
                ←
              </span>
            </span>
          </div>
        </div>
      </Link>
    </Reveal>
  );
}

const processSteps = [
  "שנתיים של הכנת גוש שורשים, בהדרגה",
  "חגירת הגוש, הרמה במנוף והובלה זהירה",
  "נטיעה בבור מוכן, עם הדרכת השקיה",
  "ביקורת קליטה אחרי חודש — באחריותנו",
];

export const revalidate = 60;

export default async function Home() {
  const [trees, projects, settings, guides, media, clients, quotes] =
    await Promise.all([
      repo.getTrees(),
      repo.getProjects(),
      repo.getSettings(),
      repo.getGuides(),
      repo.getMedia(),
      repo.getClients(),
      repo.getQuotes(),
    ]);
  const content = siteContent;
  // דיירים ותיקים = the unique one-by-one trees; `featured` picks which
  // of them lead when there are more than three. When none exist the
  // section falls back to featured stock trees so the homepage never
  // shows an empty grid.
  const veterans = trees.filter(
    (t) => t.saleType === "unique" && t.availability !== "sold",
  );
  const hasVeterans = veterans.length > 0;
  const featuredPool = hasVeterans
    ? veterans
    : trees.filter((t) => t.availability !== "sold");
  const featured = [
    ...featuredPool.filter((t) => t.featured),
    ...featuredPool.filter((t) => !t.featured),
  ].slice(0, 3);
  const guideTeasers = guides.filter((g) => g.published).slice(0, 3);
  const onSaleTrees = trees.filter(isOnSale);
  const publishedQuotes = quotes.filter((q) => q.published);
  const socialProofVisible =
    (settings.showQuotes && publishedQuotes.length > 0) ||
    (settings.showClients && clients.length > 0);
  const [heroTitleA, heroTitleB] = content.hero_title.split("\n");

  return (
    <>
      {/* HERO — rotating gallery over dark soil */}
      {/* capped below the viewport on every screen so the manifesto text
          peeks above the fold — a natural "there's more" cue without a
          scroll hint label */}
      <section className="grainy relative flex min-h-[68svh] flex-col overflow-hidden bg-soil-deep text-ink-cream md:min-h-[72svh]">
        <HeroGallery slides={media.heroSlides} />
        {/* readability scrim: heavy at the bottom (where the text lives),
            light veil everywhere else — works over any slide, photo or video */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-soil-deep/90 via-soil-deep/35 to-soil-deep/45"
        />
        <div className="relative mx-6 mb-24 mt-auto max-w-xl md:mx-12">
          <h1 className="font-display text-4xl leading-tight drop-shadow-[0_2px_10px_rgba(20,15,5,0.75)] md:text-6xl">
            {heroTitleA}
            {heroTitleB && (
              <>
                <br />
                {heroTitleB}
              </>
            )}
          </h1>
          <p className="mt-4 max-w-md text-lg text-ink-cream-soft drop-shadow-[0_1px_6px_rgba(20,15,5,0.8)]">
            {content.hero_sub}
          </p>
          <Link
            href="/visit"
            className="mt-7 inline-block rounded-full bg-clay px-7 py-3 font-semibold text-white shadow-lg shadow-clay/40 transition-transform hover:-translate-y-0.5"
          >
            דברו איתנו — או קבעו ביקור
          </Link>
        </div>
        <HorizonCurve
          className="absolute bottom-0 left-0 right-0 z-10"
          fill="var(--color-cream)"
        />
      </section>

      {/* MANIFESTO */}
      <section id="story" className="mx-auto max-w-2xl px-6 py-16 text-center">
        <Reveal>
          <p className="font-display text-xl leading-relaxed md:text-2xl">
            {content.manifesto}
          </p>
          <p className="mt-6 text-sm text-gold">{content.manifesto_sig}</p>
        </Reveal>
      </section>

      {/* NUMBERS */}
      <section className="mx-auto flex max-w-4xl flex-wrap justify-center gap-12 px-6 pb-16 text-center">
        {[
          { value: String(site.foundedYear), label: "שנת הנטיעה הראשונה" },
          { value: String(settings.dunams), label: "דונם של שורות" },
          { value: String(settings.speciesCount), label: "מינים וזנים" },
          { value: "2", label: "דורות במשתלה" },
        ].map((n, i) => (
          <Reveal key={n.label} delay={i * 110}>
            <div className="min-w-28 border-t-2 border-clay pt-3">
              <div className="font-display text-2xl text-clay-deep">
                {n.value}
              </div>
              <div className="mt-1 text-xs text-ink-muted">{n.label}</div>
            </div>
          </Reveal>
        ))}
      </section>

      {/* DARK CHAPTER — the rows */}
      <section className="grainy bg-soil text-ink-cream">
        <HorizonCurve flip fill="var(--color-cream)" />
        <Reveal className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-14 md:grid-cols-2 md:px-12">
          <div
            className="h-72 rounded-[24px_24px_24px_84px] bg-cover bg-center md:h-80"
            style={{
              background: media.aerialImage
                ? undefined
                : "linear-gradient(160deg,#7c8b6e,#39462f 70%,#252e1f)",
              backgroundImage: media.aerialImage
                ? `url(${media.aerialImage})`
                : undefined,
            }}
          />
          <div>
            <p className="text-xs tracking-widest text-[#8FA36F]">מבט מלמעלה</p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl">
              מאה ועשרים דונם, שורה אחר שורה
            </h2>
            <p className="mt-3 max-w-md text-sm text-ink-cream-soft">
              מלמעלה זה נראה כמו שטיח. מלמטה — כל נקודה ירוקה היא עץ עם שם, גיל
              ותוכנית גיזום משלו.
            </p>
            <Link
              href="/visit?topic=visit"
              className="mt-5 inline-flex items-center gap-3 text-sm"
            >
              לסיור המצולם המלא
              <span
                aria-hidden
                className="grid size-9 place-items-center rounded-full bg-clay text-white"
              >
                ←
              </span>
            </Link>
          </div>
        </Reveal>
        <HorizonCurve fill="var(--color-sand)" />
      </section>

      {/* SEASONS */}
      <section className="bg-sand px-6 py-16 md:px-12">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            title="שנה במשתלה"
            sub="העבודה לא נגמרת אף פעם — היא רק מחליפה עונה."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(["winter", "spring", "summer", "autumn"] as const).map((key, i) => (
              <Reveal key={key} delay={i * 110}>
                <div
                  className={`h-44 bg-cover bg-center ${
                    i % 2 === 0
                      ? "rounded-[18px_18px_52px_18px]"
                      : "rounded-[18px_18px_18px_52px]"
                  }`}
                  style={{
                    backgroundImage: media.seasonImages[key]
                      ? `url(${media.seasonImages[key]})`
                      : seasonArt[key],
                  }}
                />
                <h3 className="mt-3 font-semibold">{seasonNames[key]}</h3>
                <p className="text-xs text-ink-muted">
                  {content[`season_${key}`]}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <HorizonCurve flip fill="var(--color-sand)" />

      {/* FEATURED TREES */}
      <section id="catalog" className="px-6 py-14 md:px-12">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            title={hasVeterans ? "✦ דיירים ותיקים" : "עצים נבחרים מהקטלוג"}
            sub={
              hasVeterans
                ? "עצים יחידים במינם — כל אחד קיים פעם אחת, עם סיפור משלו, ונמכר אחד־אחד."
                : "מבחר מתוך העצים הבוגרים שגדלים אצלנו בין השורות."
            }
          />
          {/* one veteran deserves a spotlight, not a lonely grid cell;
              two sit as a centered pair; three or more fill the grid */}
          {hasVeterans && featured.length === 1 ? (
            <VeteranSpotlight tree={featured[0]} showPrices={settings.showPrices} />
          ) : (
            <div
              className={`grid gap-8 ${
                featured.length === 2
                  ? "mx-auto max-w-4xl sm:grid-cols-2"
                  : "sm:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {featured.map((tree, i) => (
                <Reveal key={tree.slug} delay={i * 110}>
                  <TreeCard tree={tree} index={i} showPrices={settings.showPrices} />
                </Reveal>
              ))}
            </div>
          )}

          {/* SALES — its own gold-framed shelf, only while promos run */}
          {onSaleTrees.length > 0 && (
            <Reveal className="mt-14">
              <div className="rounded-[24px_24px_24px_84px] border-[1.5px] border-gold/70 bg-gradient-to-l from-gold-bright/12 via-transparent to-transparent p-6 sm:p-8">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="rounded-full bg-gold-bright px-3 py-1 text-xs font-bold text-soil">
                    מבצע
                  </span>
                  <h2 className="font-display text-2xl">מבצעי מכירה</h2>
                  <p className="text-sm text-ink-muted">
                    המלאי מתחלף — מי שמקדים זוכה.
                  </p>
                  <Link
                    href="/sales"
                    className="ms-auto text-sm font-semibold text-clay-deep hover:underline"
                  >
                    לכל המבצעים ←
                  </Link>
                </div>
                <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {onSaleTrees.slice(0, 3).map((tree, i) => (
                    <TreeCard
                      key={tree.slug}
                      tree={tree}
                      index={i}
                      showPrices={settings.showPrices}
                    />
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          <Gateway
            href="/catalog"
            title="כל העצים שלנו מחכים בקטלוג"
            sub="דיירים ותיקים, עצי צל, פרי ונוי — עמוד לכל עץ."
          />
        </div>
      </section>

      {/* DARK CHAPTER — transplant day */}
      <section id="process" className="grainy bg-soil text-ink-cream">
        <HorizonCurve flip fill="var(--color-cream)" />
        <Reveal className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-14 md:grid-cols-2 md:px-12">
          <div>
            <p className="text-xs tracking-widest text-[#8FA36F]">איך זה עובד</p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl">
              איך עץ בוגר עובר דירה
            </h2>
            <p className="mt-3 text-sm text-ink-cream-soft">
              זה השלב שכולם שואלים עליו. ככה זה נעשה, בזהירות של שלושים שנה:
            </p>
            <ol className="mt-4 space-y-2 text-sm text-ink-cream-soft">
              {processSteps.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <b className="text-gold-bright">
                    {["א", "ב", "ג", "ד"][i]}
                  </b>
                  {step}
                </li>
              ))}
            </ol>
            <Link
              href="/process"
              className="mt-5 inline-flex items-center gap-3 text-sm"
            >
              לתהליך המלא, שלב אחר שלב
              <span
                aria-hidden
                className="grid size-9 place-items-center rounded-full bg-clay text-white"
              >
                ←
              </span>
            </Link>
          </div>
          <div
            className="h-72 rounded-[84px_24px_24px_24px] bg-cover bg-center md:h-80"
            style={{
              background: media.transplantImage
                ? undefined
                : "linear-gradient(160deg,#8f9b7c,#4e5b41 70%,#333d2b)",
              backgroundImage: media.transplantImage
                ? `url(${media.transplantImage})`
                : undefined,
            }}
          />
        </Reveal>
        <HorizonCurve fill="var(--color-sand)" />
      </section>

      {/* PROJECTS MAP */}
      <section id="projects" className="bg-sand px-6 py-16 md:px-12">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            title="העצים שלנו, בכל הארץ"
            sub="לחצו על נעץ במפה — מאחורי כל אחד מסתתר עץ שיצא מהשורות שלנו ונקלט בבית חדש."
          />
          <Reveal>
            <IsraelMap projects={projects} />
          </Reveal>
          <Gateway
            href="/projects"
            title="לכל הפרויקטים וההמלצות"
            sub="המפה המלאה — לפי אזור, סוג לקוח ושנת נטיעה."
          />
        </div>
      </section>
      <HorizonCurve flip fill="var(--color-sand)" />

      {/* GUIDES TEASER */}
      <section id="guides" className="px-6 py-14 md:px-12">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            title="מדריכים מבין השורות"
            sub="שלושים שנה של ניסיון, כתובים בגובה העיניים."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {guideTeasers.map((g, i) => (
              <Reveal key={g.slug} delay={i * 110}>
                <Link
                  href={`/guides/${g.slug}`}
                  className="block rounded-[20px_20px_56px_20px] border-[1.5px] border-line-sand bg-card p-6 transition-all hover:-translate-y-1 hover:border-clay hover:shadow-xl hover:shadow-clay/10"
                >
                  <p className="text-xs font-semibold tracking-widest text-gold">
                    {g.categoryHe} · {g.minutes} דק׳
                  </p>
                  <h3 className="mt-2 font-display text-xl">{g.titleHe}</h3>
                  <p className="mt-2 text-sm text-ink-muted">{g.excerptHe}</p>
                </Link>
              </Reveal>
            ))}
          </div>
          <Gateway
            href="/guides"
            title="לכל המדריכים"
            sub="איך בוחרים, מתי נוטעים ואיך מטפלים — בלי ז'רגון."
          />
        </div>
      </section>

      {/* SAND FINALE — social proof (client voices + clients strip) and the
          closing invitation share one distinct band */}
      {socialProofVisible && <HorizonCurve fill="var(--color-sand)" />}
      {socialProofVisible && (
        <section className="bg-sand pb-4 pt-12">
          {settings.showQuotes && publishedQuotes.length > 0 && (
            <>
              <SectionHead title="מה אומרים עלינו" />
              <QuoteCarousel quotes={publishedQuotes} />
            </>
          )}
          {settings.showClients && clients.length > 0 && (
            <div className={settings.showQuotes && publishedQuotes.length > 0 ? "mt-14" : ""}>
              <SectionHead title="בין לקוחותינו" />
              <div className="space-y-6">
                {clients.length >= 6 ? (
                  <>
                    <ClientsRow clients={clients.filter((_, i) => i % 2 === 0)} />
                    <ClientsRow clients={clients.filter((_, i) => i % 2 === 1)} reverse />
                  </>
                ) : (
                  <ClientsRow clients={clients} />
                )}
              </div>
            </div>
          )}
        </section>
      )}
      {/* CLOSING — its own dark chapter, the visit invitation as finale */}
      <section className="grainy bg-soil text-ink-cream">
        <HorizonCurve
          flip
          fill={socialProofVisible ? "var(--color-sand)" : "var(--color-cream)"}
        />
        <Reveal className="px-6 pb-16 pt-10 text-center">
          <h2 className="font-display text-3xl">{content.close_title}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-ink-cream-soft">
            {content.close_sub}
          </p>
          <div className="mt-7 flex items-center justify-center gap-8 text-sm">
            <Link
              href="/visit"
              className="rounded-full bg-clay px-6 py-2.5 font-semibold text-white shadow-lg shadow-clay/30 transition-transform hover:-translate-y-0.5"
            >
              צרו קשר
            </Link>
            <a
              href={`tel:${settings.phone}`}
              className="border-b border-gold-bright pb-0.5 text-gold-bright"
            >
              {settings.phone}
            </a>
          </div>
        </Reveal>
      </section>
    </>
  );
}
