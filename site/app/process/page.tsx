import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "איך זה עובד" };
export const revalidate = 60;

const steps = [
  {
    title: "ביקור ובחירה",
    text: "מגיעים למשתלה, הולכים בין השורות ובוחרים את העץ שלכם — ליד הגזע, לא מתמונה.",
  },
  {
    title: "הכנת גוש השורשים",
    text: "עץ המיועד להעתקה עובר הכנה הדרגתית, כדי שיעבור את המעבר בשלום. אצלנו לא מדלגים על השלב הזה.",
  },
  {
    title: "חגירה, מנוף והובלה",
    text: "צוות קבוע, ציוד ייעודי ומנופים עד 60 טון. תיאום מלא מול האתר — גם ברחוב צר, גם מעל גג.",
  },
  {
    title: "נטיעה מקצועית",
    text: "בור מוכן מראש, ניקוז נכון, תמיכה וקשירה — והדרכת השקיה מסודרת לשנה הראשונה.",
  },
  {
    title: "מעקב ואחריות קליטה",
    text: "חוזרים לבדוק את העץ, עונים לכל שאלה ואחראים לקליטה מלאה. העץ שלנו — עד שהוא לגמרי שלכם.",
  },
];

export default function ProcessPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-16 pt-10">
      <h1 className="font-display text-4xl">מעץ בשורה — לעץ בגינה שלכם</h1>
      <ol className="mt-10 space-y-9">
        {steps.map((s, i) => (
          <li key={s.title} className="relative flex gap-5 ps-0">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-clay font-bold text-white">
              {i + 1}
            </span>
            <div>
              <h2 className="font-display text-2xl">{s.title}</h2>
              <p className="mt-1 max-w-lg text-sm text-ink-soft">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-12 flex items-center gap-4 rounded-[20px_20px_20px_56px] border-[1.5px] border-leaf bg-[#F1EFDC] px-7 py-5">
        <p className="text-sm text-ink-soft">
          <b className="text-[#3E6231]">אחריות קליטה מלאה.</b> אם עץ שנטענו לא
          נקלט — אנחנו מחליפים אותו. פשוט כך. זו הסיבה שאנחנו מקפידים על כל שלב
          בדרך.
        </p>
      </div>
      <div className="mt-10 text-center">
        <Link
          href="/visit"
          className="rounded-full bg-clay px-6 py-2.5 font-semibold text-white shadow-lg shadow-clay/30"
        >
          מתחילים בשיחה או בביקור — צרו קשר
        </Link>
      </div>
    </div>
  );
}
