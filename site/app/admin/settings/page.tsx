import { repo } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";
import { SaveButton } from "@/components/admin/SaveButton";
import { saveSettingsAction } from "../actions";

export default async function AdminSettingsPage() {
  await requireAdminPage();
  const s = await repo.getSettings();

  return (
    <div>
      <h1 className="font-display text-3xl">הגדרות המשתלה</h1>
      {/* key = the data: after a save + revalidation the form remounts with
          the fresh values, instead of React's post-action reset snapping the
          fields back to their stale initial defaults */}
      <form
        key={JSON.stringify(s)}
        action={saveSettingsAction}
        className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-2"
      >
        <label className="block text-xs text-ink-muted">
          שם המשתלה
          <input name="siteName" defaultValue={s.siteName} className="admin-input" />
        </label>
        <label className="block text-xs text-ink-muted">
          סלוגן
          <input name="tagline" defaultValue={s.tagline} className="admin-input" />
        </label>
        <label className="block text-xs text-ink-muted">
          טלפון ראשי
          <input name="phone" defaultValue={s.phone} dir="ltr" className="admin-input" />
          <span className="mt-1 block text-[11px] leading-relaxed">
            מוצג לגולשים בכל האתר (פוטר, עמוד יצירת הקשר) והעוזר החכם מוסר אותו
            למתעניינים. לחיצה עליו בנייד מחייגת.
          </span>
        </label>
        <label className="block text-xs text-ink-muted">
          קו אנשי מקצוע
          <input name="proPhone" defaultValue={s.proPhone} dir="ltr" className="admin-input" />
          <span className="mt-1 block text-[11px] leading-relaxed">
            מוצג רק בעמוד אנשי המקצוע, בפוטר ובעמודי עצים — לגננים, אדריכלים
            ורשויות. יכול להיות זהה לטלפון הראשי.
          </span>
        </label>
        <label className="block text-xs text-ink-muted">
          וואטסאפ (בינלאומי, בלי +, למשל 972501234567)
          <input name="whatsapp" defaultValue={s.whatsapp} dir="ltr" className="admin-input" />
          <span className="mt-1 block text-[11px] leading-relaxed">
            כל כפתורי "שלחו בוואטסאפ" באתר פותחים שיחה למספר הזה, עם הודעה
            מוכנה מראש. זה לא בוט — ההודעות מגיעות לוואטסאפ הרגיל שלכם.
          </span>
        </label>
        <label className="block text-xs text-ink-muted">
          אימייל לפניות
          <input name="email" type="email" defaultValue={s.email} dir="ltr" className="admin-input" />
          <span className="mt-1 block text-[11px] leading-relaxed">
            כתובת ליצירת קשר המוצגת באתר. (התראות על פניות חדשות ושליחת הצעות
            מחיר נשלחות דרך Resend — מוגדר בקובץ הסביבה בשרת, לא כאן.)
          </span>
        </label>
        <label className="block text-xs text-ink-muted sm:col-span-2">
          שעות פתיחה
          <input name="hoursHe" defaultValue={s.hoursHe} className="admin-input" />
        </label>
        <label className="block text-xs text-ink-muted">
          כתובת המשתלה
          <input name="addressHe" defaultValue={s.addressHe} className="admin-input" />
          <span className="mt-1 block text-[11px] leading-relaxed">
            מוצגת באתר ומשמשת לכפתורי הניווט (Waze / Google Maps) בעמוד
            יצירת הקשר ובפוטר. ריק — כפתורי הניווט לא מוצגים.
          </span>
        </label>
        <label className="block text-xs text-ink-muted">
          נקודת ציון מדויקת (רשות)
          <input
            name="navCoords"
            defaultValue={s.navCoords}
            dir="ltr"
            placeholder="32.6543, 35.2901"
            className="admin-input"
          />
          <span className="mt-1 block text-[11px] leading-relaxed">
            לדרכים כפריות שכתובת לא מוצאת: בגוגל מפות — קליק ימני על שער
            המשתלה ← העתקת הקואורדינטות, והדביקו כאן. כשמוגדר, הניווט מכוון
            בדיוק לנקודה הזו.
          </span>
        </label>
        <label className="flex items-center gap-2.5 self-end rounded-xl border-[1.5px] border-line-warm bg-card px-4 py-3 text-sm sm:col-span-2">
          <input type="checkbox" name="showPrices" defaultChecked={s.showPrices} />
          הצגת מחירים באתר
          <span className="text-xs text-ink-muted">
            (בכיבוי — כל המחירים מוסתרים, בכל העמודים)
          </span>
        </label>
        <label className="flex items-center gap-2.5 rounded-xl border-[1.5px] border-line-warm bg-card px-4 py-3 text-sm">
          <input type="checkbox" name="showQuotes" defaultChecked={s.showQuotes} />
          מקטע "מה אומרים עלינו"
        </label>
        <label className="flex items-center gap-2.5 rounded-xl border-[1.5px] border-line-warm bg-card px-4 py-3 text-sm">
          <input type="checkbox" name="showClients" defaultChecked={s.showClients} />
          מקטע "בין לקוחותינו"
        </label>
        <div className="sm:col-span-2">
          <SaveButton className="min-h-11 rounded-full bg-clay px-6 py-2 text-sm font-semibold text-white">
            שמירה
          </SaveButton>
        </div>
      </form>
    </div>
  );
}
