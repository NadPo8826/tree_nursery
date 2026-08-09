import type { Metadata } from "next";
import { repo } from "@/lib/db";
import { LeadForm } from "@/components/LeadForm";

export const metadata: Metadata = { title: "לאנשי מקצוע ורשויות" };

const audiences = [
  {
    title: "גננים ואדריכלי נוף",
    items: [
      "מחירון אנשי מקצוע והנחות כמות",
      "דפי מפרט PDF לכל עץ — לתוכניות וללקוח",
      "שמירת עץ ללקוח עד 14 יום",
      "ליווי אגרונום בבחירה ובנטיעה",
    ],
  },
  {
    title: "קבלני פיתוח",
    items: [
      "אספקה לפי לוח גאנט — גם 20 עצים בשבוע",
      "מנופים עד 60 טון וצוותי נטיעה שלנו",
      "תיאום מלא מול מנהל העבודה באתר",
      "חשבוניות מסודרות ותנאי שוטף",
    ],
  },
  {
    title: "עיריות ורשויות",
    items: [
      "ניסיון במכרזים ובהסכמי מסגרת",
      "עמידה במפרט הבין־משרדי לעצים בוגרים",
      "דיווח קליטה שנתי — אפס הפתעות בשטח",
      "אחריות ותחזוקה לשנתיים ומעלה",
    ],
  },
];

export default async function ProPage() {
  const settings = await repo.getSettings();
  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-10 md:px-12">
      <h1 className="font-display text-4xl">גננים, אדריכלים, קבלנים ורשויות</h1>
      <p className="mt-2 text-sm text-ink-muted">
        ספק אחד לכל שרשרת העץ הבוגר — מהקטלוג ועד אחריות הקליטה.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {audiences.map((a) => (
          <div
            key={a.title}
            className="rounded-[20px_20px_56px_20px] border-[1.5px] border-line-sand bg-card p-6"
          >
            <h2 className="font-display text-2xl">{a.title}</h2>
            <ul className="mt-4 space-y-2 text-sm text-ink-soft">
              {a.items.map((item) => (
                <li key={item} className="flex items-baseline gap-2">
                  <span className="size-1.5 shrink-0 translate-y-[-2px] rounded-full bg-clay" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-10 max-w-xl rounded-[22px_22px_22px_64px] border-[1.5px] border-line-warm bg-card p-8">
        <p className="text-center font-display text-2xl">
          פתיחת תיק ספק / הסכם מסגרת
        </p>
        <p className="mb-5 mt-2 text-center text-sm text-ink-muted">
          טופס קצר — ונחזור אליכם עם מחירון אנשי מקצוע תוך יום עסקים.
        </p>
        <LeadForm
          interest="אנשי מקצוע — פתיחת תיק ספק / הסכם מסגרת"
          isPro
          withEmail
          submitLabel="שליחה — נחזור עם מחירון"
        />
        <p className="mt-5 border-t border-line-sand pt-4 text-center text-sm">
          מעדיפים לדבר? קו ישיר לאנשי מקצוע:{" "}
          <a
            href={`tel:${settings.proPhone}`}
            className="font-semibold text-clay-deep"
          >
            {settings.proPhone}
          </a>
        </p>
      </div>
    </div>
  );
}
