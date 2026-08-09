import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/lib/db";

export const revalidate = 60;

/**
 * Minimal renderer for the admin's guide text: blank line = paragraph,
 * "## " prefix = subheading. Deliberately simple — upgraded to full
 * markdown when guides start using richer formatting.
 */
function renderBody(body: string) {
  return body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, i) =>
      block.startsWith("## ") ? (
        <h2 key={i} className="mt-8 font-display text-2xl">
          {block.slice(3)}
        </h2>
      ) : (
        <p key={i} className="mt-4 leading-relaxed text-ink-soft">
          {block}
        </p>
      ),
    );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guides = await repo.getGuides();
  const guide = guides.find((g) => g.slug === slug);
  return { title: guide ? guide.titleHe : "מדריך" };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guides = await repo.getGuides();
  const found = guides.find((g) => g.slug === slug && g.published);
  if (!found) notFound();

  return (
    <article className="mx-auto max-w-2xl px-6 pb-16 pt-10">
      <nav className="text-xs text-ink-muted">
        <Link href="/guides" className="hover:text-ink">
          מדריכים
        </Link>{" "}
        / {found.categoryHe}
      </nav>
      <h1 className="mt-3 font-display text-4xl">{found.titleHe}</h1>
      <p className="mt-2 text-xs text-gold">
        {found.categoryHe} · {found.minutes} דקות קריאה
      </p>
      <div className="mt-4 text-[0.95rem]">{renderBody(found.bodyMd)}</div>

      <div className="mt-12 rounded-[20px_20px_20px_56px] border-[1.5px] border-line-warm bg-card p-6 text-center">
        <p className="font-display text-xl">נשארתם עם שאלה?</p>
        <p className="mt-1 text-sm text-ink-muted">
          בואו לשאול אותה בין השורות — קפה עלינו.
        </p>
        <Link
          href="/visit"
          className="mt-4 inline-block rounded-full bg-clay px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-clay/30"
        >
          לתיאום ביקור
        </Link>
      </div>
    </article>
  );
}
