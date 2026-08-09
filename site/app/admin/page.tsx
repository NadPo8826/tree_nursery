import Link from "next/link";
import { repo } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";

export default async function AdminDashboard() {
  await requireAdminPage();
  const [trees, leads, analytics] = await Promise.all([
    repo.getTrees(),
    repo.getLeads(),
    repo.getAnalytics(),
  ]);
  const newLeads = leads.filter((l) => l.status === "new").length;
  const available = trees.filter((t) => t.availability === "available").length;

  // last 7 days of traffic, oldest → newest
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000);
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(d);
    const day = analytics[key];
    return {
      key,
      label: d.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem", weekday: "short" }),
      views: day ? Object.values(day.paths).reduce((a, b) => a + b, 0) : 0,
      visitors: day?.visitors.length ?? 0,
    };
  });
  const weekViews = last7.reduce((a, d) => a + d.views, 0);
  const weekVisitors = last7.reduce((a, d) => a + d.visitors, 0);
  const maxViews = Math.max(1, ...last7.map((d) => d.views));
  const topPaths = Object.entries(
    last7.reduce<Record<string, number>>((acc, d) => {
      const day = analytics[d.key];
      if (day) {
        for (const [path, count] of Object.entries(day.paths)) {
          acc[path] = (acc[path] ?? 0) + count;
        }
      }
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const cards = [
    { href: "/admin/leads", value: newLeads, label: "פניות חדשות", accent: newLeads > 0 },
    { href: "/admin/leads", value: leads.length, label: "פניות סה״כ" },
    { href: "/admin/trees", value: trees.length, label: "עצים בקטלוג" },
    { href: "/admin/trees", value: available, label: "זמינים עכשיו" },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl">שלום 👋</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`rounded-2xl border-[1.5px] bg-card p-5 text-center transition-all hover:-translate-y-0.5 ${
              c.accent ? "border-clay" : "border-line-sand"
            }`}
          >
            <div
              className={`font-display text-3xl ${c.accent ? "text-clay-deep" : ""}`}
            >
              {c.value}
            </div>
            <div className="mt-1 text-xs text-ink-muted">{c.label}</div>
          </Link>
        ))}
      </div>
      <div className="mt-10 max-w-3xl">
        <h2 className="font-display text-xl">מבקרים באתר — 7 ימים אחרונים</h2>
        {weekViews === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            אין עדיין נתוני גלישה — הספירה התחילה עכשיו, והנתונים יצטברו מהיום.
          </p>
        ) : (
          <div className="mt-3 grid gap-6 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm">
                <b className="font-display text-2xl tabular-nums">{weekVisitors}</b>{" "}
                מבקרים ·{" "}
                <b className="tabular-nums">{weekViews}</b> צפיות עמוד
              </p>
              <div className="mt-3 flex h-24 items-end gap-2">
                {last7.map((d) => (
                  <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-leaf/70"
                      style={{ height: `${Math.max(3, (d.views / maxViews) * 80)}px` }}
                      title={`${d.views} צפיות · ${d.visitors} מבקרים`}
                    />
                    <span className="text-[10px] text-ink-muted">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="min-w-48">
              <p className="text-xs font-semibold text-ink-muted">עמודים מובילים</p>
              <ul className="mt-1.5 space-y-1 text-sm">
                {topPaths.map(([path, count]) => (
                  <li key={path} className="flex justify-between gap-4">
                    <span dir="ltr" className="truncate">{path}</span>
                    <span className="tabular-nums text-ink-muted">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <p className="mt-8 text-sm text-ink-muted">
        מכאן מנהלים את הקטלוג (מחירים, זמינות, כמויות), עונים לפניות ומעדכנים את
        פרטי המשתלה. כל שינוי עולה לאתר תוך דקה.
      </p>
    </div>
  );
}
