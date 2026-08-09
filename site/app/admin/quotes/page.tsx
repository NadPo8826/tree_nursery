import { repo } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";
import { SaveButton } from "@/components/admin/SaveButton";
import { deleteQuoteAction, saveQuoteAction } from "../actions";

export default async function AdminQuotesPage() {
  await requireAdminPage();
  const quotes = await repo.getQuotes();

  return (
    <div>
      <h1 className="font-display text-3xl">המלצות לקוחות</h1>
      <p className="mt-1 text-sm text-ink-muted">
        הציטוטים שמתחלפים במקטע "מה אומרים עלינו" בעמוד הבית. את הצגת המקטע
        כולו מדליקים/מכבים בעמוד "הגדרות".
      </p>

      <div className="mt-6 max-w-2xl space-y-3">
        {quotes.map((q) => (
          <details key={q.id} className="rounded-2xl border-[1.5px] border-line-sand bg-card">
            <summary className="flex cursor-pointer items-center gap-3 px-5 py-3.5">
              <span className="min-w-0 flex-1 truncate text-sm">{q.textHe}</span>
              {!q.published && (
                <span className="shrink-0 rounded-full bg-sand px-2.5 py-0.5 text-xs">
                  מוסתר
                </span>
              )}
            </summary>
            <form
              key={JSON.stringify(q)}
              action={saveQuoteAction}
              className="grid gap-3 border-t border-line-sand px-5 py-4"
            >
              <input type="hidden" name="id" value={q.id} />
              <label className="block text-xs text-ink-muted">
                הציטוט
                <textarea name="textHe" defaultValue={q.textHe} rows={3} className="admin-input" />
              </label>
              <label className="block text-xs text-ink-muted">
                מי אמר (שם · תפקיד/עיר)
                <input name="citeHe" defaultValue={q.citeHe} className="admin-input" />
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                <input type="checkbox" name="published" defaultChecked={q.published} />
                מוצג באתר
              </label>
              <div className="flex items-center gap-4">
                <SaveButton className="min-h-11 rounded-full bg-clay px-5 py-2 text-sm font-semibold text-white">
                  שמירה
                </SaveButton>
                <SaveButton
                  toast="ההמלצה נמחקה"
                  formAction={deleteQuoteAction}
                  className="text-xs text-red-700 hover:underline"
                >
                  מחיקה
                </SaveButton>
              </div>
            </form>
          </details>
        ))}

        <details className="rounded-2xl border-[1.5px] border-dashed border-line-warm bg-card">
          <summary className="cursor-pointer px-5 py-4 font-semibold text-clay-deep">
            + המלצה חדשה
          </summary>
          <form action={saveQuoteAction} className="grid gap-3 border-t border-line-sand px-5 py-4">
            <label className="block text-xs text-ink-muted">
              הציטוט
              <textarea name="textHe" rows={3} required className="admin-input" />
            </label>
            <label className="block text-xs text-ink-muted">
              מי אמר (שם · תפקיד/עיר)
              <input name="citeHe" className="admin-input" />
            </label>
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              <input type="checkbox" name="published" defaultChecked />
              מוצג באתר
            </label>
            <div>
              <SaveButton toast="ההמלצה נוספה" className="min-h-11 rounded-full bg-clay px-5 py-2 text-sm font-semibold text-white">
                הוספה
              </SaveButton>
            </div>
          </form>
        </details>
      </div>
    </div>
  );
}
