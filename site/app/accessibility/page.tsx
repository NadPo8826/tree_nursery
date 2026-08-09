import type { Metadata } from "next";
import { repo } from "@/lib/db";

export const metadata: Metadata = { title: "הצהרת נגישות" };
export const revalidate = 60;

export default async function AccessibilityPage() {
  const settings = await repo.getSettings();

  return (
    <article className="mx-auto max-w-2xl px-6 pb-16 pt-10">
      <h1 className="font-display text-4xl">הצהרת נגישות</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-ink-soft">
        <p>
          אנו ב{settings.siteName} רואים חשיבות רבה במתן שירות שוויוני לכלל
          הגולשים ובשיפור נגישות האתר לאנשים עם מוגבלות, ברוח חוק שוויון
          זכויות לאנשים עם מוגבלות ותקן ישראלי 5568 (המבוסס על הנחיות
          WCAG&nbsp;2.1 ברמה AA).
        </p>
        <h2 className="pt-2 font-display text-2xl text-ink">מה יש באתר</h2>
        <ul className="list-disc space-y-1 ps-5">
          <li>
            רכיב נגישות (הכפתור העגול בפינת המסך) המאפשר: הגדלת טקסט, ניגודיות
            גבוהה, הדגשת קישורים, ריווח טקסט, הגדלת גובה שורה, ביטול הנפשות,
            הסתרת תמונות, גופן קריא, סמן מוגדל, יישור טקסט, גווני אפור והגדלת
            חלון הרכיב עצמו. ההעדפות נשמרות בין ביקורים.
          </li>
          <li>ניווט מלא במקלדת, כולל טפסים וכפתורים.</li>
          <li>מבנה כותרות תקין, טקסט חלופי לתמונות ותוויות לשדות טופס.</li>
          <li>האתר מכבד את הגדרת "הפחתת תנועה" של מערכת ההפעלה.</li>
          <li>אזורי מגע גדולים בנייד ותצוגה מותאמת לכל גודל מסך.</li>
        </ul>
        <h2 className="pt-2 font-display text-2xl text-ink">נתקלתם בבעיה?</h2>
        <p>
          אנו פועלים לשפר את הנגישות באופן שוטף, וייתכן שחלקים מסוימים טרם
          הונגשו במלואם. אם נתקלתם בקושי בגלישה — נשמח שתספרו לנו ונטפל בהקדם:
        </p>
        <ul className="list-disc space-y-1 ps-5">
          <li>
            טלפון: <a href={`tel:${settings.phone}`} className="text-clay-deep underline" dir="ltr">{settings.phone}</a>
          </li>
          <li>
            דוא״ל: <a href={`mailto:${settings.email}`} className="text-clay-deep underline" dir="ltr">{settings.email}</a>
          </li>
        </ul>
        <p className="pt-2 text-xs text-ink-muted">
          ההצהרה עודכנה לאחרונה: אוגוסט 2026.
        </p>
      </div>
    </article>
  );
}
