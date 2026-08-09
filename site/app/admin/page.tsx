import Link from "next/link";
import { repo } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";

export default async function AdminDashboard() {
  await requireAdminPage();
  const [trees, leads] = await Promise.all([repo.getTrees(), repo.getLeads()]);
  const newLeads = leads.filter((l) => l.status === "new").length;
  const available = trees.filter((t) => t.availability === "available").length;

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
      <p className="mt-8 text-sm text-ink-muted">
        מכאן מנהלים את הקטלוג (מחירים, זמינות, כמויות), עונים לפניות ומעדכנים את
        פרטי המשתלה. כל שינוי עולה לאתר תוך דקה.
      </p>
    </div>
  );
}
