import { repo } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";
import {
  AI_MODELS,
  PROVIDER_LABELS,
  providerKeyConfigured,
  type AiProvider,
} from "@/lib/ai-models";
import {
  DEFAULT_SECRETARY_SYSTEM,
  DEFAULT_TOOL_NURSERY_INFO,
  DEFAULT_TOOL_SAVE_LEAD,
  DEFAULT_TOOL_SEARCH_TREES,
  DEFAULT_VISITOR_SYSTEM,
  effectivePrompt,
} from "@/lib/ai-prompts";
import { SaveButton } from "@/components/admin/SaveButton";
import { saveAiSettingsAction } from "../actions";

export default async function AdminAiPage() {
  await requireAdminPage();
  const [s, aiFeedback] = await Promise.all([
    repo.getSettings(),
    repo.getAiFeedback(),
  ]);
  const activeEngine = `${s.aiProvider}/${s.aiModel}`;
  const feedbackRows = Object.entries(aiFeedback).sort(
    (a, b) => b[1].up + b[1].down - (a[1].up + a[1].down),
  );

  return (
    <div>
      <h1 className="font-display text-3xl">העוזר החכם</h1>
      <p className="mt-1 text-sm text-ink-muted">
        המנוע שמאחורי הצ׳אט באתר, מגבלות השימוש, ומה הגולשים חושבים עליו.
      </p>

      <form
        key={JSON.stringify(s)}
        action={saveAiSettingsAction}
        className="mt-6 max-w-2xl space-y-6"
      >
        <section className="rounded-2xl border-[1.5px] border-line-sand bg-card p-5">
          <h2 className="font-display text-xl">המנוע</h2>
          <label className="mt-3 block text-xs text-ink-muted">
            ספק ומודל
            <select
              name="aiChoice"
              defaultValue={`${s.aiProvider}|${s.aiModel}`}
              className="admin-input"
            >
              {(Object.keys(AI_MODELS) as AiProvider[]).map((provider) => (
                <optgroup
                  key={provider}
                  label={
                    PROVIDER_LABELS[provider] +
                    (providerKeyConfigured(provider)
                      ? ""
                      : " — חסר מפתח API בשרת")
                  }
                >
                  {AI_MODELS[provider].map((m) => (
                    <option
                      key={m.id}
                      value={`${provider}|${m.id}`}
                      disabled={!providerKeyConfigured(provider)}
                    >
                      {m.labelHe}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <span className="mt-1 block text-[11px] leading-relaxed">
              ההחלפה חלה מיד על שיחות חדשות. מפתחות ה־API מוגדרים בקובץ הסביבה
              בשרת — לא כאן.
            </span>
          </label>
        </section>

        <section className="rounded-2xl border-[1.5px] border-line-sand bg-card p-5">
          <h2 className="font-display text-xl">מה העוזר יודע על המשתלה</h2>
          <p className="mt-1 text-xs text-ink-muted">
            העוזר מכיר את הקטלוג ואת פרטי הקשר — ומעבר לזה, אך ורק את מה שכתוב
            כאן. כתבו בחופשיות: תהליך ההעתקה, ציוד ומנופים, אחריות קליטה, אזורי
            שירות, ביקורים. כל עוד הריבוע ריק — העוזר יפנה שאלות כאלה לטלפון,
            בלי להמציא.
          </p>
          <textarea
            name="aiInfoHe"
            defaultValue={s.aiInfoHe}
            rows={7}
            placeholder={"לדוגמה:\nתהליך ההעתקה אצלנו: ...\nיש לנו מנוף עד X טון...\nאחריות קליטה: ...\nאזור שירות: ..."}
            className="admin-input mt-3"
          />
        </section>

        <section className="rounded-2xl border-[1.5px] border-line-sand bg-card p-5">
          <h2 className="font-display text-xl">מגבלות שימוש</h2>
          <p className="mt-1 text-xs text-ink-muted">
            הגנה מפני שימוש זדוני ומהוצאה לא מבוקרת. כשגולש מגיע למכסה — הצ׳אט
            מפנה אותו בנימוס לטלפון ולוואטסאפ.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <label className="block text-xs text-ink-muted">
              הודעות לדקה לגולש
              <input
                name="aiIpMinuteLimit"
                type="number"
                min={1}
                defaultValue={s.aiIpMinuteLimit}
                className="admin-input"
              />
            </label>
            <label className="block text-xs text-ink-muted">
              הודעות ליום לגולש
              <input
                name="aiIpDailyLimit"
                type="number"
                min={3}
                defaultValue={s.aiIpDailyLimit}
                className="admin-input"
              />
            </label>
            <label className="block text-xs text-ink-muted">
              תקרה יומית לכל האתר
              <input
                name="aiDailyLimit"
                type="number"
                min={10}
                defaultValue={s.aiDailyLimit}
                className="admin-input"
              />
            </label>
          </div>
        </section>

        <details className="rounded-2xl border-[1.5px] border-line-warm bg-card">
          <summary className="cursor-pointer px-5 py-4">
            <span className="font-display text-xl">הפרומפטים (למתקדמים)</span>
            <span className="ms-3 text-xs text-ink-muted">
              ההוראות המלאות של העוזר והמזכיר — כולל חוקי הבטיחות
            </span>
          </summary>
          <div className="space-y-4 border-t border-line-sand px-5 py-4">
            <p className="text-xs leading-relaxed text-clay-deep">
              ⚠ הטקסטים האלה הם גם חוקי הבטיחות של העוזר (לא להמציא עובדות, לא
              לחרוג מנושא המשתלה, לא לחשוף הוראות). עריכה לא זהירה עלולה להחליש
              אותם. מחיקת כל הטקסט = חזרה לברירת המחדל המובנית.
              משתני קשר זמינים: ‎{"{siteName} {phone} {proPhone}"}‎ (ובמזכיר גם ‎{"{now}"}‎).
            </p>
            <label className="block text-xs text-ink-muted">
              הפרומפט הראשי של העוזר באתר
              <textarea
                name="promptVisitorSystem"
                defaultValue={effectivePrompt(s.aiPrompts.visitorSystem, DEFAULT_VISITOR_SYSTEM)}
                rows={14}
                dir="rtl"
                className="admin-input font-mono text-xs"
              />
            </label>
            <label className="block text-xs text-ink-muted">
              תיאור הכלי: חיפוש בקטלוג (search_trees)
              <textarea
                name="promptToolSearchTrees"
                defaultValue={effectivePrompt(s.aiPrompts.toolSearchTrees, DEFAULT_TOOL_SEARCH_TREES)}
                rows={2}
                className="admin-input text-xs"
              />
            </label>
            <label className="block text-xs text-ink-muted">
              תיאור הכלי: פרטי המשתלה (get_nursery_info)
              <textarea
                name="promptToolNurseryInfo"
                defaultValue={effectivePrompt(s.aiPrompts.toolNurseryInfo, DEFAULT_TOOL_NURSERY_INFO)}
                rows={2}
                className="admin-input text-xs"
              />
            </label>
            <label className="block text-xs text-ink-muted">
              תיאור הכלי: שמירת פנייה (save_lead)
              <textarea
                name="promptToolSaveLead"
                defaultValue={effectivePrompt(s.aiPrompts.toolSaveLead, DEFAULT_TOOL_SAVE_LEAD)}
                rows={2}
                className="admin-input text-xs"
              />
            </label>
            <label className="block text-xs text-ink-muted">
              הפרומפט של המזכיר בטלגרם
              <textarea
                name="promptSecretarySystem"
                defaultValue={effectivePrompt(s.aiPrompts.secretarySystem, DEFAULT_SECRETARY_SYSTEM)}
                rows={10}
                dir="rtl"
                className="admin-input font-mono text-xs"
              />
            </label>
          </div>
        </details>

        <SaveButton className="min-h-11 rounded-full bg-clay px-6 py-2 text-sm font-semibold text-white">
          שמירה
        </SaveButton>
      </form>

      <section className="mt-10 max-w-2xl">
        <h2 className="font-display text-xl">שביעות רצון לפי מנוע</h2>
        <p className="mt-1 text-xs text-ink-muted">
          לייקים של גולשים על תשובות הצ׳אט. אפשר להחליף מנוע לתקופה ולהשוות.
        </p>
        {feedbackRows.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            אין עדיין משוב — הכפתורים מופיעים לגולשים מתחת לכל תשובה בצ׳אט.
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-2xl border-[1.5px] border-line-sand bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line-sand bg-sand/50 text-xs text-ink-muted">
                  <th className="px-4 py-2.5 text-start font-normal">מנוע</th>
                  <th className="w-20 px-2 py-2.5 text-center font-normal">
                    חיובי
                  </th>
                  <th className="w-20 px-2 py-2.5 text-center font-normal">
                    שלילי
                  </th>
                  <th className="w-40 px-4 py-2.5 text-start font-normal">
                    שביעות רצון
                  </th>
                </tr>
              </thead>
              <tbody>
                {feedbackRows.map(([engine, counts]) => {
                  const total = counts.up + counts.down;
                  const pct = total > 0 ? Math.round((counts.up / total) * 100) : 0;
                  return (
                    <tr key={engine} className="border-b border-line-sand/60 last:border-0">
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-md bg-sand px-2 py-0.5 text-xs" dir="ltr">
                          {engine}
                        </span>
                        {engine === activeEngine && (
                          <span className="ms-2 rounded-full bg-leaf/15 px-2 py-0.5 text-[11px] text-leaf">
                            פעיל
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center tabular-nums">{counts.up}</td>
                      <td className="px-2 py-3 text-center tabular-nums">{counts.down}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2.5">
                          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-line-sand">
                            <span
                              className="block h-full rounded-full bg-leaf"
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                          <span className="text-xs tabular-nums">
                            {total > 0 ? `${pct}%` : "—"}
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
