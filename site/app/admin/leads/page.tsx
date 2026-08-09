import Link from "next/link";
import { repo } from "@/lib/db";
import type { Lead } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-guard";
import { SaveButton } from "@/components/admin/SaveButton";
import { deleteLeadAction, setLeadStatusAction } from "../actions";

const statusLabels = [
  ["new", "חדש"],
  ["contacted", "נוצר קשר"],
  ["visited", "ביקרו"],
  ["planted", "נטעו"],
] as const;

const channelLabels: Record<string, string> = {
  form: "טופס",
  rfq: "בחירת עצים",
  ai_chat: "צ'אט",
  whatsapp_click: "וואטסאפ",
};

type Tab = "all" | "quote" | "visit" | "pro" | "other";

function leadTab(lead: Lead): Exclude<Tab, "all"> {
  if (lead.isPro) return "pro";
  if (lead.channel === "rfq") return "quote";
  if (lead.channel === "form" && lead.interest.includes("ביקור")) return "visit";
  return "other";
}

const tabs: { key: Tab; label: string }[] = [
  { key: "all", label: "הכול" },
  { key: "quote", label: "הצעות מחיר" },
  { key: "visit", label: "תיאום ביקור" },
  { key: "pro", label: "אנשי מקצוע" },
  { key: "other", label: "אחר" },
];

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdminPage();
  const leads = await repo.getLeads();
  const active = ((await searchParams).tab ?? "all") as Tab;

  const counts = new Map<Tab, number>([["all", leads.length]]);
  for (const lead of leads) {
    const t = leadTab(lead);
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const shown =
    active === "all" ? leads : leads.filter((l) => leadTab(l) === active);

  return (
    <div>
      <h1 className="font-display text-3xl">פניות</h1>

      <nav className="mt-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/admin/leads" : `/admin/leads?tab=${t.key}`}
            className={`rounded-full border-[1.5px] px-4 py-1.5 text-sm transition-colors ${
              active === t.key
                ? "border-clay bg-clay text-white"
                : "border-line-warm bg-card hover:border-clay"
            }`}
          >
            {t.label}
            <span className="ms-1.5 text-xs opacity-75 tabular-nums">
              {counts.get(t.key) ?? 0}
            </span>
          </Link>
        ))}
      </nav>

      {shown.length === 0 && (
        <p className="mt-6 text-sm text-ink-muted">
          אין פניות בקטגוריה הזו עדיין. פנייה חדשה תופיע כאן — ותקבלו התראה
          במייל/טלגרם (אם הוגדרו).
        </p>
      )}

      <div className="mt-5 space-y-3">
        {shown.map((lead) => (
          <div
            key={lead.id}
            className={`rounded-2xl border-[1.5px] bg-card p-5 ${
              lead.status === "new" ? "border-clay" : "border-line-sand"
            }`}
          >
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <b className="font-display text-lg">{lead.name}</b>
              <a
                href={`tel:${lead.phone}`}
                className="text-sm text-clay-deep tabular-nums"
                dir="ltr"
              >
                {lead.phone}
              </a>
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="text-sm text-clay-deep"
                  dir="ltr"
                >
                  {lead.email}
                </a>
              )}
              <span className="text-xs text-ink-muted">
                {channelLabels[lead.channel] ?? lead.channel}
                {lead.isPro && " · ⚑ מקצועי"}
              </span>
              <span className="ms-auto text-xs text-ink-muted tabular-nums">
                {new Date(lead.createdAt).toLocaleString("he-IL", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </div>
            {lead.interest && <p className="mt-2 text-sm">{lead.interest}</p>}
            {lead.items.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                {lead.items.map((item) => (
                  <li
                    key={item.treeSlug}
                    className="rounded-full bg-sand px-3 py-1"
                  >
                    {item.treeName} × {item.qtyRange}
                  </li>
                ))}
              </ul>
            )}
            {lead.message && (
              <p className="mt-2 text-sm text-ink-soft">{lead.message}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <form action={setLeadStatusAction} className="flex flex-wrap gap-2">
                <input type="hidden" name="id" value={lead.id} />
                {statusLabels.map(([value, label]) => (
                  <SaveButton
                    key={value}
                    toast="הסטטוס עודכן"
                    name="status"
                    value={value}
                    className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
                      lead.status === value
                        ? "border-clay bg-clay text-white"
                        : "border-line-warm hover:border-clay"
                    }`}
                  >
                    {label}
                  </SaveButton>
                ))}
              </form>
              {/* two-step delete: the summary reveals the real (red) button,
                  so one stray tap can never erase a customer */}
              <details className="ms-auto">
                <summary className="cursor-pointer list-none rounded-full px-3 py-1.5 text-xs text-ink-muted hover:text-red-700">
                  מחיקה
                </summary>
                <form action={deleteLeadAction} className="mt-1 text-end">
                  <input type="hidden" name="id" value={lead.id} />
                  <SaveButton toast="הפנייה נמחקה" className="rounded-full border border-red-700 px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-700 hover:text-white">
                    אישור מחיקה סופית
                  </SaveButton>
                </form>
              </details>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
