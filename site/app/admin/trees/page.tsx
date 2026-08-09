import { repo } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";
import { SaveButton } from "@/components/admin/SaveButton";
import {
  deleteTreeAction,
  removeTreePhotoAction,
  saveTreeAction,
  uploadTreePhotoAction,
} from "../actions";

export default async function AdminTreesPage() {
  await requireAdminPage();
  const trees = await repo.getTrees();
  // existing categories feed the datalist — pick one or type a new group
  const categories = [...new Set(trees.map((t) => t.categoryHe).filter(Boolean))];

  return (
    <div>
      <h1 className="font-display text-3xl">הקטלוג</h1>
      <p className="mt-1 text-sm text-ink-muted">
        כל שמירה עולה לאתר מיד. פתחו שורה לעריכה מלאה.
      </p>

      <datalist id="tree-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div className="mt-6 space-y-3">
        {trees.map((tree) => (
          <details
            key={tree.slug}
            className="rounded-2xl border-[1.5px] border-line-sand bg-card"
          >
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5">
              <b className="font-display text-lg">{tree.nameHe}</b>
              {tree.categoryHe && (
                <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs">
                  {tree.categoryHe}
                </span>
              )}
              <span className="ms-auto flex items-center gap-3 text-xs text-ink-muted">
                <span className="tabular-nums">₪{tree.price.toLocaleString("he-IL")}</span>
                {tree.saleType === "unique" ? (
                  <span
                    className={`rounded-full px-2.5 py-0.5 ${
                      tree.availability === "sold"
                        ? "bg-sand"
                        : "bg-soil text-gold-bright"
                    }`}
                  >
                    {tree.availability === "sold" ? "מוסתר" : "✦ דייר ותיק"}
                  </span>
                ) : (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-white ${
                      tree.availability === "sold" ? "bg-ink-muted" : "bg-leaf"
                    }`}
                  >
                    {tree.availability === "sold" ? "אזל מהמלאי" : "במלאי"}
                  </span>
                )}
              </span>
            </summary>
            <form
              key={JSON.stringify(tree)}
              action={saveTreeAction}
              className="grid gap-4 border-t border-line-sand px-5 py-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              <input type="hidden" name="slug" value={tree.slug} />
              <label className="block text-xs text-ink-muted">
                שם העץ
                <input name="nameHe" defaultValue={tree.nameHe} className="admin-input" />
              </label>
              <label className="block text-xs text-ink-muted">
                קטגוריה בקטלוג (למשל עצי זית / עצי הדר)
                <input
                  name="categoryHe"
                  defaultValue={tree.categoryHe}
                  list="tree-categories"
                  className="admin-input"
                />
              </label>
              <label className="block text-xs text-ink-muted">
                אופן מכירה
                <select name="saleType" defaultValue={tree.saleType} className="admin-input">
                  <option value="stock">עץ מלאי — נמכר בכמויות</option>
                  <option value="unique">✦ דייר ותיק — עץ יחיד, נמכר אחד־אחד</option>
                </select>
              </label>
              <label className="block text-xs text-ink-muted">
                {tree.saleType === "unique"
                  ? "מחיר (₪) — מוצג כמחיר מדויק"
                  : "מחיר (החל מ־₪)"}
                <input name="price" type="number" defaultValue={tree.price} className="admin-input" />
              </label>
              <label className="block text-xs text-ink-muted">
                הצגת מחיר לעץ זה
                <select name="priceMode" defaultValue={tree.priceMode} className="admin-input">
                  <option value="from">מוצג — "החל מ־"</option>
                  <option value="hidden">מוסתר — "למחיר צרו קשר"</option>
                </select>
              </label>
              <label className="block text-xs text-ink-muted">
                מחיר מבצע (רשות — מציג את העץ בעמוד המבצעים)
                <input
                  name="promoPrice"
                  type="number"
                  defaultValue={tree.promoPrice || ""}
                  className="admin-input"
                />
              </label>
              {tree.saleType === "unique" ? (
                <label className="flex items-center gap-2 self-end pb-2 text-xs text-ink-muted">
                  <input
                    type="checkbox"
                    name="displayed"
                    defaultChecked={tree.availability !== "sold"}
                  />
                  מוצג בקטלוג (בטלו את הסימון אחרי שנמכר)
                </label>
              ) : (
                <label className="block text-xs text-ink-muted">
                  זמינות
                  <select name="availability" defaultValue={tree.availability} className="admin-input">
                    <option value="available">במלאי</option>
                    <option value="sold">אזל מהמלאי</option>
                  </select>
                </label>
              )}
              {/* detailed specs are a veteran's story — stock varieties stay lean.
                  empty values are simply not shown on the site */}
              {tree.saleType === "unique" && (
                <>
                  <label className="block text-xs text-ink-muted">
                    גובה (מ׳)
                    <input name="heightM" type="number" step="0.1" defaultValue={tree.heightM || ""} className="admin-input" />
                  </label>
                  <label className="block text-xs text-ink-muted">
                    קוטר גזע (ס״מ)
                    <input name="trunkDiameterCm" type="number" defaultValue={tree.trunkDiameterCm || ""} className="admin-input" />
                  </label>
                  <label className="block text-xs text-ink-muted">
                    גיל (שנים)
                    <input name="ageYears" type="number" defaultValue={tree.ageYears || ""} className="admin-input" />
                  </label>
                  <label className="block text-xs text-ink-muted">
                    משקל גוש (ק״ג, רשות)
                    <input name="rootBallWeightKg" type="number" defaultValue={tree.rootBallWeightKg || ""} className="admin-input" />
                  </label>
                  <label className="block text-xs text-ink-muted">
                    שם בוטני (רשות)
                    <input name="speciesLatin" defaultValue={tree.speciesLatin} dir="ltr" className="admin-input" />
                  </label>
                  <label className="block text-xs text-ink-muted">
                    דרישות (רשות, למשל "שמש מלאה · השקיה מתונה")
                    <input name="requirementsHe" defaultValue={tree.requirementsHe ?? ""} className="admin-input" />
                  </label>
                </>
              )}
              <label className="block text-xs text-ink-muted sm:col-span-2 lg:col-span-3">
                {tree.saleType === "unique"
                  ? "הסיפור של העץ (מוצג בעמוד העץ)"
                  : "תיאור קצר (משפט אחד לעמוד העץ, רשות)"}
                <textarea
                  name="storyHe"
                  defaultValue={tree.storyHe}
                  rows={tree.saleType === "unique" ? 3 : 2}
                  className="admin-input"
                />
              </label>
              <label className="block text-xs text-ink-muted sm:col-span-2 lg:col-span-3">
                מידע לעוזר החכם (לא מוצג באתר) — השקיה, צל, קצב גדילה, גיזום,
                התאמה לאזורים וכו׳. העוזר יענה לפי זה על שאלות טיפול.
                <textarea
                  name="aiNotesHe"
                  defaultValue={tree.aiNotesHe}
                  rows={2}
                  placeholder="לדוגמה: השקיה מתונה פעמיים בשבוע בקיץ · מתאים לשמש מלאה · גיזום עיצוב בסוף החורף"
                  className="admin-input"
                />
              </label>
              {tree.saleType === "unique" && (
                <label className="flex items-center gap-2 text-xs text-ink-muted">
                  <input type="checkbox" name="featured" defaultChecked={tree.featured} />
                  מוצג ראשון בעמוד הבית
                </label>
              )}
              <div className="flex items-center gap-4 sm:col-span-2">
                <SaveButton className="min-h-11 rounded-full bg-clay px-6 py-2 text-sm font-semibold text-white">
                  שמירה
                </SaveButton>
                <SaveButton
                  toast="העץ נמחק"
                  formAction={deleteTreeAction}
                  className="text-xs text-red-700 hover:underline"
                >
                  מחיקת העץ
                </SaveButton>
              </div>
            </form>

            {/* photos — separate multipart form */}
            <div className="border-t border-line-sand px-5 py-4">
              <p className="text-xs font-semibold text-ink-muted">תמונות העץ</p>
              {tree.photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {tree.photos.map((photo) => (
                    <div key={photo} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo}
                        alt=""
                        className="h-20 w-28 rounded-lg object-cover"
                      />
                      <form action={removeTreePhotoAction} className="absolute -end-1.5 -top-1.5">
                        <input type="hidden" name="slug" value={tree.slug} />
                        <input type="hidden" name="photo" value={photo} />
                        <SaveButton
                          toast="התמונה הוסרה"
                          aria-label="הסרת תמונה"
                          className="grid size-6 place-items-center rounded-full bg-soil text-xs text-white"
                        >
                          ✕
                        </SaveButton>
                      </form>
                    </div>
                  ))}
                </div>
              )}
              <form action={uploadTreePhotoAction} className="mt-3 flex flex-wrap items-center gap-3">
                <input type="hidden" name="slug" value={tree.slug} />
                <input
                  type="file"
                  name="photo"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  className="text-xs"
                />
                <SaveButton
                  toast="התמונה הועלתה"
                  className="rounded-full border-[1.5px] border-clay px-4 py-1.5 text-xs font-semibold text-clay-deep hover:bg-clay hover:text-white"
                >
                  העלאת תמונה
                </SaveButton>
                <span className="text-xs text-ink-muted">JPG/PNG/WebP · עד 5MB · הראשונה מוצגת בכרטיס</span>
              </form>
            </div>
          </details>
        ))}
      </div>

      <details className="mt-8 rounded-2xl border-[1.5px] border-dashed border-line-warm bg-card">
        <summary className="cursor-pointer px-5 py-4 font-semibold text-clay-deep">
          + הוספת עץ חדש
        </summary>
        <form
          action={saveTreeAction}
          className="grid gap-4 border-t border-line-sand px-5 py-5 sm:grid-cols-2"
        >
          <label className="block text-xs text-ink-muted">
            מזהה באנגלית (slug, למשל olive-350)
            <input name="slug" required dir="ltr" className="admin-input" />
          </label>
          <label className="block text-xs text-ink-muted">
            שם העץ
            <input name="nameHe" required className="admin-input" />
          </label>
          <label className="block text-xs text-ink-muted">
            קטגוריה בקטלוג
            <input name="categoryHe" list="tree-categories" className="admin-input" />
          </label>
          <label className="block text-xs text-ink-muted">
            אופן מכירה
            <select name="saleType" defaultValue="stock" className="admin-input">
              <option value="stock">עץ מלאי — נמכר בכמויות</option>
              <option value="unique">✦ דייר ותיק — עץ יחיד</option>
            </select>
          </label>
          <label className="block text-xs text-ink-muted">
            מחיר (החל מ־₪)
            <input name="price" type="number" className="admin-input" />
          </label>
          <label className="block text-xs text-ink-muted">
            גובה (מ׳)
            <input name="heightM" type="number" step="0.1" className="admin-input" />
          </label>
          <p className="text-xs text-ink-muted sm:col-span-2">
            את שאר הפרטים והתמונות משלימים אחרי ההוספה.
          </p>
          <div className="sm:col-span-2">
            <SaveButton
              toast="העץ נוסף לקטלוג"
              className="min-h-11 rounded-full bg-clay px-6 py-2 text-sm font-semibold text-white"
            >
              הוספה לקטלוג
            </SaveButton>
          </div>
        </form>
      </details>
    </div>
  );
}
