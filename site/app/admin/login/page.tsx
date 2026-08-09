import { redirect } from "next/navigation";
import {
  getPendingLogin,
  isAuthenticated,
  isConfigured,
  isTelegramLoginAvailable,
} from "@/lib/auth";
import { loginAction } from "../actions";

/**
 * Two-screen login:
 *   1. username + password → a one-time code is pushed to that admin's
 *      own Telegram chat (identified by the signed pending cookie)
 *   2. code entry
 * Without a configured bot / named admins, screen 1 is password-only and
 * logs straight in.
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; step?: string; tg?: string }>;
}) {
  if (await isAuthenticated()) redirect("/admin");
  const params = await searchParams;
  const tgAvailable = await isTelegramLoginAvailable();
  const pendingUser = tgAvailable ? await getPendingLogin() : null;
  const screen = params.step === "otp" && pendingUser ? "otp" : "password";

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-[20px_20px_56px_20px] border-[1.5px] border-line-sand bg-card p-8">
      <h1 className="font-display text-2xl">כניסת מנהל</h1>
      {!isConfigured() ? (
        <p className="mt-4 text-sm text-clay-deep">
          עדיין לא הוגדרה סיסמה. הוסיפו <code dir="ltr">ADMIN_PASSWORD=...</code>{" "}
          לקובץ <code dir="ltr">site/.env.local</code> והפעילו מחדש את השרת.
        </p>
      ) : screen === "otp" ? (
        <form action={loginAction} className="mt-6 space-y-4">
          <p className="text-sm text-ink-soft">
            שלחנו קוד חד־פעמי לטלגרם של <b>{pendingUser}</b>.
          </p>
          {params.tg === "sent" && (
            <p className="rounded-xl bg-leaf/10 px-4 py-2.5 text-sm text-leaf">
              קוד חדש נשלח — בדקו את הטלגרם.
            </p>
          )}
          <label className="block text-sm">
            הקוד מטלגרם
            <input
              type="text"
              name="otp"
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              dir="ltr"
              className="mt-1 w-full rounded-xl border-[1.5px] border-line-warm bg-cream px-4 py-2.5 text-center text-lg tracking-[0.4em]"
            />
          </label>
          {params.error === "locked" ? (
            <p className="text-sm text-red-700">
              יותר מדי ניסיונות — נסו שוב בעוד רבע שעה.
            </p>
          ) : params.error ? (
            <p className="text-sm text-red-700">הקוד שגוי או שפג תוקפו — נסו שוב.</p>
          ) : null}
          <button
            name="step"
            value="otp"
            className="min-h-11 w-full rounded-full bg-clay px-6 py-2.5 font-semibold text-white"
          >
            כניסה
          </button>
          <div className="flex items-center justify-between text-xs">
            <button
              name="step"
              value="resend"
              formNoValidate
              className="min-h-11 text-clay-deep hover:underline"
            >
              שלחו קוד חדש
            </button>
            <button
              name="step"
              value="restart"
              formNoValidate
              className="min-h-11 text-ink-muted hover:underline"
            >
              ← חזרה להתחלה
            </button>
          </div>
        </form>
      ) : (
        <form action={loginAction} className="mt-6 space-y-4">
          {tgAvailable && (
            <label className="block text-sm">
              שם משתמש
              <input
                type="text"
                name="username"
                required
                autoFocus
                autoComplete="username"
                autoCapitalize="off"
                className="mt-1 w-full rounded-xl border-[1.5px] border-line-warm bg-cream px-4 py-2.5"
              />
            </label>
          )}
          <label className="block text-sm">
            סיסמה
            <input
              type="password"
              name="password"
              required
              autoFocus={!tgAvailable}
              autoComplete="current-password"
              className="mt-1 w-full rounded-xl border-[1.5px] border-line-warm bg-cream px-4 py-2.5"
            />
          </label>
          {params.error === "locked" ? (
            <p className="text-sm text-red-700">
              יותר מדי ניסיונות — נסו שוב בעוד רבע שעה.
            </p>
          ) : params.error === "expired" ? (
            <p className="text-sm text-red-700">
              תהליך הכניסה פג — התחילו מחדש.
            </p>
          ) : params.error ? (
            <p className="text-sm text-red-700">פרטי הכניסה שגויים — נסו שוב.</p>
          ) : null}
          <button className="min-h-11 w-full rounded-full bg-clay px-6 py-2.5 font-semibold text-white">
            {tgAvailable ? "המשך — שלחו לי קוד לטלגרם" : "כניסה"}
          </button>
          {tgAvailable && (
            <p className="text-center text-xs text-ink-muted">
              לאחר אימות הסיסמה יישלח קוד חד־פעמי לטלגרם שלכם.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
