import { repo } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";
import { SaveButton } from "@/components/admin/SaveButton";
import { deleteGuideAction, saveGuideAction } from "../actions";

function GuideFields({
  guide,
}: {
  guide?: {
    slug: string;
    titleHe: string;
    categoryHe: string;
    minutes: number;
    excerptHe: string;
    bodyMd: string;
    published: boolean;
  };
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-ink-muted">
          מזהה באנגלית (slug)
          <input
            name="slug"
            defaultValue={guide?.slug}
            readOnly={Boolean(guide)}
            required
            dir="ltr"
            className={`admin-input ${guide ? "opacity-60" : ""}`}
          />
        </label>
        <label className="block text-xs text-ink-muted">
          כותרת
          <input name="titleHe" defaultValue={guide?.titleHe} required className="admin-input" />
        </label>
        <label className="block text-xs text-ink-muted">
          קטגוריה
          <input name="categoryHe" defaultValue={guide?.categoryHe} className="admin-input" />
        </label>
        <label className="block text-xs text-ink-muted">
          דקות קריאה
          <input name="minutes" type="number" defaultValue={guide?.minutes ?? 5} className="admin-input" />
        </label>
      </div>
      <label className="block text-xs text-ink-muted">
        תקציר (מוצג בכרטיס)
        <textarea name="excerptHe" defaultValue={guide?.excerptHe} rows={2} className="admin-input" />
      </label>
      <label className="block text-xs text-ink-muted">
        תוכן המדריך (שורה ריקה = פסקה חדשה; שורה שמתחילה ב-## = כותרת ביניים)
        <textarea name="bodyMd" defaultValue={guide?.bodyMd} rows={10} className="admin-input" />
      </label>
      <label className="flex items-center gap-2 text-xs text-ink-muted">
        <input type="checkbox" name="published" defaultChecked={guide?.published ?? false} />
        מפורסם באתר
      </label>
    </>
  );
}

export default async function AdminGuidesPage() {
  await requireAdminPage();
  const guides = await repo.getGuides();

  return (
    <div>
      <h1 className="font-display text-3xl">מדריכים</h1>
      <p className="mt-1 text-sm text-ink-muted">
        כתיבה ועריכה של המדריכים — מנוע ה-SEO והאמון של האתר.
      </p>
      <div className="mt-6 space-y-3">
        {guides.map((g) => (
          <details key={g.slug} className="rounded-2xl border-[1.5px] border-line-sand bg-card">
            <summary className="flex cursor-pointer items-center gap-3 px-5 py-3.5">
              <b className="font-display">{g.titleHe}</b>
              <span className="text-xs text-ink-muted">{g.categoryHe}</span>
              {!g.published && (
                <span className="ms-auto shrink-0 rounded-full bg-sand px-2.5 py-0.5 text-xs">
                  טיוטה
                </span>
              )}
            </summary>
            <form key={JSON.stringify(g)} action={saveGuideAction} className="grid gap-3 border-t border-line-sand px-5 py-4">
              <GuideFields guide={g} />
              <div className="flex items-center gap-4">
                <SaveButton className="min-h-11 rounded-full bg-clay px-5 py-2 text-sm font-semibold text-white">
                  שמירה
                </SaveButton>
                <SaveButton toast="המדריך נמחק" formAction={deleteGuideAction} className="text-xs text-red-700 hover:underline">
                  מחיקת המדריך
                </SaveButton>
              </div>
            </form>
          </details>
        ))}
        <details className="rounded-2xl border-[1.5px] border-dashed border-line-warm bg-card">
          <summary className="cursor-pointer px-5 py-3.5 font-semibold text-clay-deep">
            + מדריך חדש
          </summary>
          <form action={saveGuideAction} className="grid gap-3 border-t border-line-sand px-5 py-4">
            <GuideFields />
            <div>
              <SaveButton toast="המדריך נוצר" className="min-h-11 rounded-full bg-clay px-5 py-2 text-sm font-semibold text-white">
                יצירת המדריך
              </SaveButton>
            </div>
          </form>
        </details>
      </div>
    </div>
  );
}
