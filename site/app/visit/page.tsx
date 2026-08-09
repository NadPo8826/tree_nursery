import type { Metadata } from "next";
import { repo } from "@/lib/db";
import { whatsappLink } from "@/lib/site";
import { LeadForm } from "@/components/LeadForm";

export const metadata: Metadata = { title: "תיאום ביקור" };

export default async function VisitPage() {
  const settings = await repo.getSettings();

  return (
    <div className="mx-auto max-w-2xl px-6 pb-16 pt-10 text-center">
      <h1 className="font-display text-4xl">בואו לבקר בין השורות</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-ink-muted">
        המשתלה פתוחה למבקרים בתיאום מראש. מחכים לכם קפה, סיור בין השורות ותשובות
        לכל שאלה — בלי לחץ ובלי התחייבות.
      </p>
      <p className="mt-2 text-xs text-ink-muted">{settings.hoursHe}</p>

      <div className="mx-auto mt-8 rounded-[22px_22px_22px_64px] border-[1.5px] border-line-warm bg-card p-8">
        <p className="font-display text-xl">תיאום ביקור</p>
        <p className="mb-5 mt-1 text-sm text-ink-muted">
          שלושה שדות — ונחזור אליכם לתיאום.
        </p>
        <LeadForm
          interest="תיאום ביקור במשתלה"
          submitLabel="לתיאום ביקור — נחזור אליכם"
        />
        <div className="mt-6 flex items-center justify-center gap-6 border-t border-line-sand pt-5 text-sm">
          <a
            href={whatsappLink(settings.whatsapp, "שלום, אשמח לתאם ביקור במשתלה")}
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
