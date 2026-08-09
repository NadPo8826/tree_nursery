import { repo } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";
import { SaveButton } from "@/components/admin/SaveButton";
import {
  addClientAction,
  addHeroSlideAction,
  deleteClientAction,
  removeHeroSlideAction,
  setSectionImageAction,
} from "../actions";

function SectionImage({
  title,
  section,
  current,
}: {
  title: string;
  section: string;
  current: string;
}) {
  return (
    <div className="rounded-2xl border-[1.5px] border-line-sand bg-card p-5">
      <p className="text-sm font-semibold">{title}</p>
      {current ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current} alt="" className="mt-3 h-32 w-full rounded-xl object-cover" />
      ) : (
        <p className="mt-3 text-xs text-ink-muted">
          אין תמונה — האתר מציג רקע צבעוני זמני.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <form action={setSectionImageAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="section" value={section} />
          <input type="file" name="image" accept="image/jpeg,image/png,image/webp" required className="text-xs" />
          <SaveButton toast="התמונה נשמרה" className="rounded-full border-[1.5px] border-clay px-4 py-1.5 text-xs font-semibold text-clay-deep hover:bg-clay hover:text-white">
            {current ? "החלפה" : "העלאה"}
          </SaveButton>
        </form>
        {current && (
          <form action={setSectionImageAction}>
            <input type="hidden" name="section" value={section} />
            <input type="hidden" name="clear" value="1" />
            <SaveButton toast="התמונה הוסרה" className="text-xs text-red-700 hover:underline">
              הסרה
            </SaveButton>
          </form>
        )}
      </div>
    </div>
  );
}

export default async function AdminMediaPage() {
  await requireAdminPage();
  const [media, clients] = await Promise.all([
    repo.getMedia(),
    repo.getClients(),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl">מדיה — תמונות ווידאו</h1>

      <h2 className="mt-6 font-display text-2xl">גלריית הפתיחה (עמוד הבית)</h2>
      <p className="mt-1 text-sm text-ink-muted">
        השקופיות שמתחלפות ברקע הכותרת הראשית. אפשר תמונות שאתם מעלים, או וידאו
        (קישור YouTube / Vimeo / קובץ mp4). בלי שקופיות — האתר מציג רקע זמני.
      </p>
      <div className="mt-4 max-w-2xl space-y-3">
        {media.heroSlides.map((slide) => (
          <div
            key={slide.id}
            className="flex items-center gap-4 rounded-2xl border-[1.5px] border-line-sand bg-card p-4"
          >
            {slide.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slide.url} alt="" className="h-16 w-24 rounded-lg object-cover" />
            ) : (
              <span className="grid h-16 w-24 place-items-center rounded-lg bg-soil text-xs text-ink-cream">
                ▶ וידאו
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{slide.labelHe || "(ללא שם)"}</p>
              <p className="truncate text-xs text-ink-muted" dir="ltr">
                {slide.url}
              </p>
            </div>
            <form action={removeHeroSlideAction}>
              <input type="hidden" name="id" value={slide.id} />
              <SaveButton toast="השקופית הוסרה" className="text-xs text-red-700 hover:underline">
                הסרה
              </SaveButton>
            </form>
          </div>
        ))}

        <form
          action={addHeroSlideAction}
          className="grid gap-3 rounded-2xl border-[1.5px] border-dashed border-line-warm bg-card p-5"
        >
          <p className="font-semibold text-clay-deep">+ הוספת שקופית</p>
          <label className="block text-xs text-ink-muted">
            שם (לתיאור בלבד)
            <input name="labelHe" className="admin-input" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-ink-muted">
              תמונה להעלאה
              <input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="mt-1 block text-xs" />
            </label>
            <label className="block text-xs text-ink-muted">
              או קישור וידאו (YouTube / mp4)
              <input name="videoUrl" dir="ltr" className="admin-input" />
            </label>
          </div>
          <div>
            <SaveButton toast="השקופית נוספה" className="min-h-11 rounded-full bg-clay px-5 py-2 text-sm font-semibold text-white">
              הוספה
            </SaveButton>
          </div>
        </form>
      </div>

      <h2 className="mt-10 font-display text-2xl">תמונות המקטעים הכהים</h2>
      <div className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
        <SectionImage
          title='מקטע "מאה ועשרים דונם" (תצלום אוויר)'
          section="aerialImage"
          current={media.aerialImage}
        />
        <SectionImage
          title='מקטע "איך עץ עובר דירה" (יום העתקה)'
          section="transplantImage"
          current={media.transplantImage}
        />
      </div>

      <h2 className="mt-10 font-display text-2xl">שנה במשתלה — תמונות העונות</h2>
      <p className="mt-1 text-sm text-ink-muted">
        הטקסטים של העונות נערכים בעמוד "טקסטים".
      </p>
      <div className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
        <SectionImage title="חורף" section="season_winter" current={media.seasonImages.winter} />
        <SectionImage title="אביב" section="season_spring" current={media.seasonImages.spring} />
        <SectionImage title="קיץ" section="season_summer" current={media.seasonImages.summer} />
        <SectionImage title="סתיו" section="season_autumn" current={media.seasonImages.autumn} />
      </div>

      <h2 className="mt-10 font-display text-2xl">בין לקוחותינו</h2>
      <p className="mt-1 text-sm text-ink-muted">
        הרצועה הנעה בעמוד הבית. לכל לקוח אפשר לוגו, שם, או שניהם. את הצגת
        המקטע כולו מדליקים/מכבים בעמוד "הגדרות".
      </p>
      <div className="mt-4 max-w-2xl space-y-3">
        {clients.map((client) => (
          <div
            key={client.id}
            className="flex items-center gap-4 rounded-2xl border-[1.5px] border-line-sand bg-card p-4"
          >
            {client.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={client.logoUrl}
                alt=""
                className="h-10 w-16 rounded-lg bg-white object-contain"
              />
            ) : (
              <span className="grid h-10 w-16 place-items-center rounded-lg bg-sand text-xs text-ink-muted">
                טקסט
              </span>
            )}
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">
              {client.nameHe || "(לוגו בלבד)"}
            </p>
            <form action={deleteClientAction}>
              <input type="hidden" name="id" value={client.id} />
              <SaveButton toast="הלקוח הוסר" className="text-xs text-red-700 hover:underline">
                הסרה
              </SaveButton>
            </form>
          </div>
        ))}

        <form
          action={addClientAction}
          className="grid gap-3 rounded-2xl border-[1.5px] border-dashed border-line-warm bg-card p-5"
        >
          <p className="font-semibold text-clay-deep">+ הוספת לקוח</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-ink-muted">
              שם הלקוח (רשות אם יש לוגו)
              <input name="nameHe" className="admin-input" />
            </label>
            <label className="block text-xs text-ink-muted">
              לוגו (רשות אם יש שם)
              <input
                type="file"
                name="logo"
                accept="image/jpeg,image/png,image/webp"
                className="mt-1 block text-xs"
              />
            </label>
          </div>
          <div>
            <SaveButton toast="הלקוח נוסף" className="min-h-11 rounded-full bg-clay px-5 py-2 text-sm font-semibold text-white">
              הוספה
            </SaveButton>
          </div>
        </form>
      </div>

      <p className="mt-8 max-w-2xl text-xs text-ink-muted">
        תמונות של עצים בקטלוג מעלים בעמוד "קטלוג" (בתוך כל עץ) · תמונות
        פרויקטים — בעמוד "פרויקטים".
      </p>
    </div>
  );
}
