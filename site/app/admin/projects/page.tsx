import { repo } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";
import { SaveButton } from "@/components/admin/SaveButton";
import {
  deleteProjectAction,
  saveProjectAction,
  uploadProjectPhotoAction,
} from "../actions";

function ProjectFields({
  project,
}: {
  project?: {
    slug: string;
    titleHe: string;
    cityHe: string;
    mapX: number;
    mapY: number;
    year: number;
    storyHe: string;
    metaHe: string;
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
            defaultValue={project?.slug}
            readOnly={Boolean(project)}
            required
            dir="ltr"
            className={`admin-input ${project ? "opacity-60" : ""}`}
          />
        </label>
        <label className="block text-xs text-ink-muted">
          כותרת הסיפור
          <input name="titleHe" defaultValue={project?.titleHe} required className="admin-input" />
        </label>
        <label className="block text-xs text-ink-muted">
          עיר · סוג לקוח (למשל "חיפה · עירייה")
          <input name="cityHe" defaultValue={project?.cityHe} className="admin-input" />
        </label>
        <label className="block text-xs text-ink-muted">
          שנה
          <input name="year" type="number" defaultValue={project?.year} className="admin-input" />
        </label>
        <label className="block text-xs text-ink-muted">
          מיקום על המפה — X (0–207, ימין=מזרח)
          <input name="mapX" type="number" step="0.1" defaultValue={project?.mapX ?? 100} className="admin-input" />
        </label>
        <label className="block text-xs text-ink-muted">
          מיקום על המפה — Y (0–520, למעלה=צפון)
          <input name="mapY" type="number" step="0.1" defaultValue={project?.mapY ?? 200} className="admin-input" />
        </label>
      </div>
      <label className="block text-xs text-ink-muted">
        הסיפור
        <textarea name="storyHe" defaultValue={project?.storyHe} rows={3} className="admin-input" />
      </label>
      <label className="block text-xs text-ink-muted">
        שורת סיכום (למשל "נשתל 2024 · 8 עצים")
        <input name="metaHe" defaultValue={project?.metaHe} className="admin-input" />
      </label>
      <label className="flex items-center gap-2 text-xs text-ink-muted">
        <input type="checkbox" name="published" defaultChecked={project?.published ?? true} />
        מוצג באתר
      </label>
    </>
  );
}

export default async function AdminProjectsPage() {
  await requireAdminPage();
  const projects = await repo.getProjects();

  return (
    <div>
      <h1 className="font-display text-3xl">פרויקטים על המפה</h1>
      <p className="mt-1 text-sm text-ink-muted">
        סיפורי ההצלחה שמוצגים על מפת ישראל. ערכי המיקום מגדירים את הנעץ (טיפ:
        התחילו מערך של פרויקט קיים באזור דומה וכוונו).
      </p>
      <div className="mt-6 space-y-3">
        {projects.map((p) => (
          <details key={p.slug} className="rounded-2xl border-[1.5px] border-line-sand bg-card">
            <summary className="flex cursor-pointer items-center gap-3 px-5 py-3.5">
              <b className="font-display">{p.titleHe}</b>
              <span className="text-xs text-ink-muted">{p.cityHe}</span>
              {!p.published && (
                <span className="ms-auto shrink-0 rounded-full bg-sand px-2.5 py-0.5 text-xs">
                  מוסתר
                </span>
              )}
            </summary>
            <form key={JSON.stringify(p)} action={saveProjectAction} className="grid gap-3 border-t border-line-sand px-5 py-4">
              <ProjectFields project={p} />
              <div className="flex items-center gap-4">
                <SaveButton className="min-h-11 rounded-full bg-clay px-5 py-2 text-sm font-semibold text-white">
                  שמירה
                </SaveButton>
                <SaveButton toast="הפרויקט נמחק" formAction={deleteProjectAction} className="text-xs text-red-700 hover:underline">
                  מחיקה
                </SaveButton>
              </div>
            </form>
            <div className="flex flex-wrap items-center gap-4 border-t border-line-sand px-5 py-4">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="" className="h-16 w-24 rounded-lg object-cover" />
              ) : (
                <span className="text-xs text-ink-muted">אין תמונה לפרויקט</span>
              )}
              <form action={uploadProjectPhotoAction} className="flex flex-wrap items-center gap-3">
                <input type="hidden" name="slug" value={p.slug} />
                <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required className="text-xs" />
                <SaveButton toast="התמונה נשמרה" className="rounded-full border-[1.5px] border-clay px-4 py-1.5 text-xs font-semibold text-clay-deep hover:bg-clay hover:text-white">
                  {p.imageUrl ? "החלפת תמונה" : "העלאת תמונה"}
                </SaveButton>
              </form>
            </div>
          </details>
        ))}
        <details className="rounded-2xl border-[1.5px] border-dashed border-line-warm bg-card">
          <summary className="cursor-pointer px-5 py-3.5 font-semibold text-clay-deep">
            + פרויקט חדש
          </summary>
          <form action={saveProjectAction} className="grid gap-3 border-t border-line-sand px-5 py-4">
            <ProjectFields />
            <div>
              <SaveButton toast="הפרויקט נוסף" className="min-h-11 rounded-full bg-clay px-5 py-2 text-sm font-semibold text-white">
                הוספה
              </SaveButton>
            </div>
          </form>
        </details>
      </div>
    </div>
  );
}
