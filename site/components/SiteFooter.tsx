import Link from "next/link";
import { repo } from "@/lib/db";
import { whatsappLink } from "@/lib/site";

/**
 * SEO-rich footer: four link columns (pages, popular trees, guides, contact)
 * give crawlers and visitors a path to every important page from anywhere.
 * Everything renders from the repo so admin edits show up here too.
 */
export async function SiteFooter() {
  const [settings, trees, guides] = await Promise.all([
    repo.getSettings(),
    repo.getTrees(),
    repo.getGuides(),
  ]);
  const available = trees.filter((t) => t.availability !== "sold");
  // Mirror the catalog's two groups: a couple of veterans (✦) lead, stock fills the rest.
  const veterans = available.filter((t) => t.saleType === "unique").slice(0, 2);
  const stock = available
    .filter((t) => t.saleType !== "unique")
    .slice(0, 5 - veterans.length);
  const popularTrees = [...veterans, ...stock];
  const footerGuides = guides.filter((g) => g.published).slice(0, 5);

  const colTitle = "mb-3 text-xs font-semibold tracking-widest text-gold-bright";
  const link = "block py-1 text-sm hover:text-ink-cream";

  return (
    <footer className="grainy bg-soil-deep px-6 py-12 text-ink-cream-soft md:px-12">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt={settings.siteName}
            className="h-16 w-auto"
          />
          <p className="mt-2 max-w-xs text-sm">{settings.tagline}</p>
          <p className="mt-4 text-xs">{settings.hoursHe}</p>
        </div>

        <nav aria-label="עמודי האתר">
          <p className={colTitle}>המשתלה</p>
          <Link href="/catalog" className={link}>קטלוג העצים</Link>
          <Link href="/about" className={link}>הסיפור שלנו</Link>
          <Link href="/process" className={link}>איך עובדת העתקת עץ בוגר</Link>
          <Link href="/projects" className={link}>פרויקטים בכל הארץ</Link>
          <Link href="/visit" className={link}>תיאום ביקור במשתלה</Link>
          <Link href="/pro" className={link}>לאנשי מקצוע ורשויות</Link>
        </nav>

        <nav aria-label="עצים בוגרים למכירה">
          <p className={colTitle}>עצים בוגרים למכירה</p>
          {popularTrees.map((t) => (
            <Link key={t.slug} href={`/tree/${t.slug}`} className={link}>
              {t.saleType === "unique" ? `✦ ${t.nameHe}` : t.nameHe}
            </Link>
          ))}
          <Link href="/catalog" className={`${link} text-gold-bright`}>
            לכל העצים ←
          </Link>
        </nav>

        <nav aria-label="מדריכים">
          <p className={colTitle}>מדריכים</p>
          {footerGuides.map((g) => (
            <Link key={g.slug} href={`/guides/${g.slug}`} className={link}>
              {g.titleHe}
            </Link>
          ))}
          <Link href="/guides" className={`${link} text-gold-bright`}>
            לכל המדריכים ←
          </Link>
        </nav>
      </div>

      <div className="mx-auto mt-10 flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/10 pt-5 text-sm">
        <a href={`tel:${settings.phone}`} className="hover:text-ink-cream">
          טלפון: <span dir="ltr">{settings.phone}</span>
        </a>
        <a
          href={whatsappLink(settings.whatsapp, "שלום, הגעתי מהאתר ויש לי שאלה")}
          className="hover:text-ink-cream"
        >
          וואטסאפ
        </a>
        <a href={`tel:${settings.proPhone}`} className="hover:text-ink-cream">
          קו אנשי מקצוע: <span dir="ltr">{settings.proPhone}</span>
        </a>
        <span className="ms-auto text-xs">
          © {new Date().getFullYear()} {settings.siteName} · עצים בוגרים מאז{" "}
          1994
        </span>
      </div>
    </footer>
  );
}
