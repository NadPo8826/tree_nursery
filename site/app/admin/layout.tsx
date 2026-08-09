import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { AdminToaster } from "@/components/admin/AdminToaster";
import { logoutAction } from "./actions";

export const metadata = { title: "ניהול המשתלה" };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const authed = await isAuthenticated();

  return (
    <div className="min-h-screen bg-cream">
      <header className="flex flex-wrap items-center gap-6 bg-soil px-6 py-3 text-ink-cream">
        <span className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-9 w-auto" />
          <span className="font-display text-lg">ניהול המשתלה</span>
        </span>
        {authed && (
          <>
            <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-cream-soft">
              <Link href="/admin" className="hover:text-ink-cream">ראשי</Link>
              <Link href="/admin/trees" className="hover:text-ink-cream">קטלוג</Link>
              <Link href="/admin/leads" className="hover:text-ink-cream">פניות</Link>
              <Link href="/admin/media" className="hover:text-ink-cream">מדיה</Link>
              <Link href="/admin/quotes" className="hover:text-ink-cream">המלצות</Link>
              <Link href="/admin/guides" className="hover:text-ink-cream">מדריכים</Link>
              <Link href="/admin/projects" className="hover:text-ink-cream">פרויקטים</Link>
              <Link href="/admin/ai" className="hover:text-ink-cream">עוזר חכם</Link>
              <Link href="/admin/telegram" className="hover:text-ink-cream">מזכיר</Link>
              <Link href="/admin/settings" className="hover:text-ink-cream">הגדרות</Link>
            </nav>
            <form action={logoutAction} className="ms-auto">
              <button className="text-xs text-ink-cream-soft hover:text-ink-cream">
                יציאה
              </button>
            </form>
          </>
        )}
        <Link
          href="/"
          className="text-xs text-gold-bright hover:underline"
          target="_blank"
        >
          לאתר ↗
        </Link>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
      <AdminToaster />
    </div>
  );
}
