import type { Metadata } from "next";
import { repo } from "@/lib/db";
import { googleMapsLink, wazeLink, whatsappLink } from "@/lib/site";
import { LeadForm } from "@/components/LeadForm";

export const metadata: Metadata = { title: "צרו קשר" };
export const revalidate = 60;

export default async function VisitPage() {
  const settings = await repo.getSettings();
  const waze = wazeLink(settings.addressHe, settings.navCoords);
  const gmaps = googleMapsLink(settings.addressHe, settings.navCoords);

  return (
    <div className="mx-auto max-w-2xl px-6 pb-16 pt-10 text-center">
      <h1 className="font-display text-4xl">דברו איתנו</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-ink-muted">
        שאלה, הצעת מחיר או סתם להתייעץ — השאירו פרטים ונחזור אליכם. ומי
        שרוצה לראות מקרוב: המשתלה פתוחה למבקרים בתיאום מראש — מחכים לכם קפה,
        סיור בין השורות ותשובות לכל שאלה, בלי לחץ ובלי התחייבות.
      </p>
      <p className="mt-2 text-xs text-ink-muted">{settings.hoursHe}</p>

      {/* navigation — rendered only once the owner sets an address in /admin */}
      {(waze || gmaps) && (
        <div className="mx-auto mt-6 max-w-md rounded-[18px_18px_18px_48px] border-[1.5px] border-line-sand bg-card p-5">
          {settings.addressHe && (
            <p className="text-sm font-semibold">{settings.addressHe}</p>
          )}
          <div className="mt-3 flex items-center justify-center gap-3">
            {waze && (
              <a
                href={waze}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-line-warm bg-cream px-5 text-sm font-semibold transition-colors hover:border-clay"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 21c-4.97 0-8-3.58-8-8a8 8 0 1 1 16 0c0 4.42-3.03 8-8 8Z" />
                  <circle cx="9" cy="11" r="1" fill="currentColor" stroke="none" />
                  <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" />
                  <path d="M9 14.5c.8.9 1.8 1.4 3 1.4s2.2-.5 3-1.4" />
                </svg>
                ניווט ב־Waze
              </a>
            )}
            {gmaps && (
              <a
                href={gmaps}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-line-warm bg-cream px-5 text-sm font-semibold transition-colors hover:border-clay"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                Google Maps
              </a>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto mt-8 rounded-[22px_22px_22px_64px] border-[1.5px] border-line-warm bg-card p-8">
        <p className="font-display text-xl">צרו קשר</p>
        <p className="mb-5 mt-1 text-sm text-ink-muted">
          בחרו במה נוכל לעזור, השאירו פרטים — ונחזור אליכם.
        </p>
        <LeadForm topicPicker submitLabel="שליחה — נחזור אליכם" />
        <div className="mt-6 flex items-center justify-center gap-6 border-t border-line-sand pt-5 text-sm">
          <a
            href={whatsappLink(settings.whatsapp, "שלום, אשמח שתחזרו אליי")}
            className="border-b border-gold pb-0.5"
          >
            או בוואטסאפ
          </a>
          <a href={`tel:${settings.phone}`} className="border-b border-gold pb-0.5">
            {settings.phone}
          </a>
        </div>
      </div>

      <p className="mt-8 text-xs text-ink-muted">
        הסיור הווירטואלי — סרט הרחפן ופרקי ההליכה — יעלה לעמוד הזה אחרי יום
        הצילומים.
      </p>
    </div>
  );
}
