import { redirect } from "next/navigation";
import { isAuthenticated, isConfigured, isTotpEnabled } from "@/lib/auth";
import { loginAction } from "../actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; setup?: string }>;
}) {
  if (await isAuthenticated()) redirect("/admin");
  const params = await searchParams;

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-[20px_20px_56px_20px] border-[1.5px] border-line-sand bg-card p-8">
      <h1 className="font-display text-2xl">כניסת מנהל</h1>
      {!isConfigured() ? (
        <p className="mt-4 text-sm text-clay-deep">
          עדיין לא הוגדרה סיסמה. הוסיפו <code dir="ltr">ADMIN_PASSWORD=...</code>{" "}
          לקובץ <code dir="ltr">site/.env.local</code> והפעילו מחדש את השרת.
        </p>
      ) : (
        <form action={loginAction} className="mt-6 space-y-4">
          <label className="block text-sm">
            סיסמה
            <input
              type="password"
              name="password"
              required
              autoFocus
              className="mt-1 w-full rounded-xl border-[1.5px] border-line-warm bg-cream px-4 py-2.5"
            />
          </label>
          {isTotpEnabled() && (
            <label className="block text-sm">
              קוד מאפליקציית האימות
              <input
                type="text"
                name="otp"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                dir="ltr"
                className="mt-1 w-full rounded-xl border-[1.5px] border-line-warm bg-cream px-4 py-2.5 tracking-[0.4em]"
              />
            </label>
          )}
          {params.error === "locked" ? (
            <p className="text-sm text-red-700">
              יותר מדי ניסיונות — נסו שוב בעוד רבע שעה.
            </p>
          ) : params.error ? (
            <p className="text-sm text-red-700">פרטי הכניסה שגויים — נסו שוב.</p>
          ) : null}
          <button className="min-h-11 w-full rounded-full bg-clay px-6 py-2.5 font-semibold text-white">
            כניסה
          </button>
        </form>
      )}
    </div>
  );
}
