import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Guide, Project, Tree } from "@/lib/types";
import type {
  AiFeedback,
  Analytics,
  ConvoTurn,
  ClientEntry,
  Lead,
  LeadStatus,
  Quote,
  Repo,
  SentQuote,
  Settings,
  SiteMedia,
  TelegramLogEntry,
  TelegramState,
} from "./store";
import { defaultMedia, emptyAiPrompts } from "./store";

/**
 * Supabase backend — activates when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * are set (see .env.example). Schema: supabase/schema.sql.
 * The service-role key is used server-side ONLY; it must never be exposed
 * with a NEXT_PUBLIC_ prefix.
 */
let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return client;
}

function rowToTree(r: Record<string, unknown>): Tree {
  return {
    slug: r.slug as string,
    code: r.code as string,
    nameHe: r.name_he as string,
    speciesLatin: r.species_latin as string,
    categoryHe: (r.category_he as string) ?? "",
    storyHe: r.story_he as string,
    aiNotesHe: (r.ai_notes_he as string) ?? "",
    heightM: Number(r.height_m),
    trunkDiameterCm: Number(r.trunk_diameter_cm),
    ageYears: Number(r.age_years),
    rootBallWeightKg: r.root_ball_weight_kg
      ? Number(r.root_ball_weight_kg)
      : undefined,
    requirementsHe: (r.requirements_he as string) ?? undefined,
    price: Number(r.price),
    promoPrice: r.promo_price ? Number(r.promo_price) : undefined,
    priceMode: r.price_mode as Tree["priceMode"],
    availability: r.availability as Tree["availability"],
    saleType: (r.sale_type ?? "stock") as Tree["saleType"],
    featured: Boolean(r.featured),
    photos: (r.photos as string[]) ?? [],
  };
}

function treeToRow(t: Tree) {
  return {
    slug: t.slug,
    code: t.code,
    name_he: t.nameHe,
    species_latin: t.speciesLatin,
    category_he: t.categoryHe,
    story_he: t.storyHe,
    ai_notes_he: t.aiNotesHe,
    height_m: t.heightM,
    trunk_diameter_cm: t.trunkDiameterCm,
    age_years: t.ageYears,
    root_ball_weight_kg: t.rootBallWeightKg ?? null,
    requirements_he: t.requirementsHe ?? null,
    price: t.price,
    promo_price: t.promoPrice ?? null,
    price_mode: t.priceMode,
    availability: t.availability,
    sale_type: t.saleType,
    featured: t.featured,
    photos: t.photos,
  };
}

export const supabaseRepo: Repo = {
  async getTrees() {
    const { data, error } = await db().from("trees").select("*").order("code");
    if (error) throw error;
    return (data ?? []).map(rowToTree);
  },
  async getTree(slug) {
    const { data, error } = await db()
      .from("trees")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToTree(data) : undefined;
  },
  async upsertTree(tree) {
    const { error } = await db()
      .from("trees")
      .upsert(treeToRow(tree), { onConflict: "slug" });
    if (error) throw error;
  },
  async deleteTree(slug) {
    const { error } = await db().from("trees").delete().eq("slug", slug);
    if (error) throw error;
  },

  async getLeads() {
    const { data, error } = await db()
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      name: r.name,
      phone: r.phone,
      email: r.email ?? undefined,
      message: r.message ?? "",
      interest: r.interest ?? "",
      items: r.items ?? [],
      channel: r.channel,
      quotesSent: (r.quotes_sent as SentQuote[]) ?? undefined,
      sourcePage: r.source_page ?? "",
      isPro: r.is_pro ?? false,
      status: r.status,
    })) as Lead[];
  },
  async addLead(lead) {
    const { error } = await db().from("leads").insert({
      id: lead.id,
      created_at: lead.createdAt,
      name: lead.name,
      phone: lead.phone,
      email: lead.email ?? null,
      message: lead.message,
      interest: lead.interest,
      items: lead.items,
      channel: lead.channel,
      source_page: lead.sourcePage,
      is_pro: lead.isPro,
      status: lead.status,
    });
    if (error) throw error;
  },
  async setLeadStatus(id, status: LeadStatus) {
    const { error } = await db().from("leads").update({ status }).eq("id", id);
    if (error) throw error;
  },
  async appendLeadQuote(id, quote) {
    const { data, error } = await db()
      .from("leads")
      .select("quotes_sent")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return;
    const quotes = [...((data.quotes_sent as SentQuote[]) ?? []), quote];
    const { error: updateError } = await db()
      .from("leads")
      .update({ quotes_sent: quotes })
      .eq("id", id);
    if (updateError) throw updateError;
  },
  async deleteLead(id) {
    const { error } = await db().from("leads").delete().eq("id", id);
    if (error) throw error;
  },
  async getAiFeedback() {
    const { data, error } = await db()
      .from("documents")
      .select("value")
      .eq("key", "ai_feedback")
      .maybeSingle();
    if (error) throw error;
    return (data?.value ?? {}) as AiFeedback;
  },
  async getClients() {
    const { data, error } = await db()
      .from("documents")
      .select("value")
      .eq("key", "clients")
      .maybeSingle();
    if (error) throw error;
    return (data?.value ?? []) as ClientEntry[];
  },
  async saveClients(clients) {
    const { error } = await db()
      .from("documents")
      .upsert({ key: "clients", value: clients });
    if (error) throw error;
  },
  async getQuotes() {
    const { data, error } = await db()
      .from("documents")
      .select("value")
      .eq("key", "quotes")
      .maybeSingle();
    if (error) throw error;
    return (data?.value ?? []) as Quote[];
  },
  async saveQuotes(quotes) {
    const { error } = await db()
      .from("documents")
      .upsert({ key: "quotes", value: quotes });
    if (error) throw error;
  },
  async getTelegramState() {
    const { data, error } = await db()
      .from("documents")
      .select("value")
      .eq("key", "telegram_state")
      .maybeSingle();
    if (error) throw error;
    return (
      (data?.value as TelegramState) ?? { lastDigestDate: "", naggedLeadIds: [] }
    );
  },
  async saveTelegramState(state) {
    const { error } = await db()
      .from("documents")
      .upsert({ key: "telegram_state", value: state });
    if (error) throw error;
  },
  async trackPageview(day, path, visitorHash) {
    const current = await supabaseRepo.getAnalytics();
    const entry = current[day] ?? { paths: {}, visitors: [] };
    entry.paths[path] = (entry.paths[path] ?? 0) + 1;
    if (!entry.visitors.includes(visitorHash) && entry.visitors.length < 5000) {
      entry.visitors.push(visitorHash);
    }
    const next: Analytics = { ...current, [day]: entry };
    const days = Object.keys(next).sort();
    for (const old of days.slice(0, Math.max(0, days.length - 90))) {
      delete next[old];
    }
    const { error } = await db()
      .from("documents")
      .upsert({ key: "analytics", value: next });
    if (error) throw error;
  },
  async getAnalytics() {
    const { data, error } = await db()
      .from("documents")
      .select("value")
      .eq("key", "analytics")
      .maybeSingle();
    if (error) throw error;
    return (data?.value ?? {}) as Analytics;
  },
  async getTelegramConvo(chatId) {
    const { data, error } = await db()
      .from("documents")
      .select("value")
      .eq("key", "telegram_convos")
      .maybeSingle();
    if (error) throw error;
    return ((data?.value ?? {}) as Record<string, ConvoTurn[]>)[chatId] ?? [];
  },
  async saveTelegramConvo(chatId, turns) {
    const { data, error } = await db()
      .from("documents")
      .select("value")
      .eq("key", "telegram_convos")
      .maybeSingle();
    if (error) throw error;
    const all = (data?.value ?? {}) as Record<string, ConvoTurn[]>;
    all[chatId] = turns.slice(-30);
    const { error: upsertError } = await db()
      .from("documents")
      .upsert({ key: "telegram_convos", value: all });
    if (upsertError) throw upsertError;
  },
  async getTelegramLog() {
    const { data, error } = await db()
      .from("documents")
      .select("value")
      .eq("key", "telegram_log")
      .maybeSingle();
    if (error) throw error;
    return (data?.value ?? []) as TelegramLogEntry[];
  },
  async appendTelegramLog(entry) {
    const current = await supabaseRepo.getTelegramLog();
    const { error } = await db()
      .from("documents")
      .upsert({ key: "telegram_log", value: [...current, entry].slice(-300) });
    if (error) throw error;
  },
  async addAiFeedbackVote(key, vote) {
    const current = await supabaseRepo.getAiFeedback();
    const entry = current[key] ?? { up: 0, down: 0 };
    entry[vote]++;
    const { error } = await db()
      .from("documents")
      .upsert({ key: "ai_feedback", value: { ...current, [key]: entry } });
    if (error) throw error;
  },

  async getSettings() {
    const { data, error } = await db()
      .from("settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (error) throw error;
    // settings saved by older versions may lack newer fields
    const stored = data.value as Partial<Settings>;
    return {
      ...stored,
      aiPrompts: { ...emptyAiPrompts, ...stored.aiPrompts },
    } as Settings;
  },
  async saveSettings(settings: Settings) {
    const { error } = await db()
      .from("settings")
      .upsert({ id: 1, value: settings });
    if (error) throw error;
  },

  async getGuides() {
    const { data, error } = await db().from("guides").select("*");
    if (error) throw error;
    return (data ?? []).map((r) => ({
      slug: r.slug,
      titleHe: r.title_he,
      categoryHe: r.category_he,
      minutes: r.minutes,
      excerptHe: r.excerpt_he,
      bodyMd: r.body_md,
      published: r.published,
    }));
  },
  async upsertGuide(g: Guide) {
    const { error } = await db().from("guides").upsert(
      {
        slug: g.slug,
        title_he: g.titleHe,
        category_he: g.categoryHe,
        minutes: g.minutes,
        excerpt_he: g.excerptHe,
        body_md: g.bodyMd,
        published: g.published,
      },
      { onConflict: "slug" },
    );
    if (error) throw error;
  },
  async deleteGuide(slug: string) {
    const { error } = await db().from("guides").delete().eq("slug", slug);
    if (error) throw error;
  },

  async getProjects() {
    const { data, error } = await db().from("projects").select("*");
    if (error) throw error;
    return (data ?? []).map((r) => ({
      slug: r.slug,
      titleHe: r.title_he,
      cityHe: r.city_he,
      mapX: Number(r.map_x),
      mapY: Number(r.map_y),
      year: r.year,
      storyHe: r.story_he,
      metaHe: r.meta_he,
      published: r.published,
    }));
  },
  async upsertProject(p: Project) {
    const { error } = await db().from("projects").upsert(
      {
        slug: p.slug,
        title_he: p.titleHe,
        city_he: p.cityHe,
        map_x: p.mapX,
        map_y: p.mapY,
        year: p.year,
        story_he: p.storyHe,
        meta_he: p.metaHe,
        published: p.published,
      },
      { onConflict: "slug" },
    );
    if (error) throw error;
  },
  async deleteProject(slug: string) {
    const { error } = await db().from("projects").delete().eq("slug", slug);
    if (error) throw error;
  },

  // media / reminders are singleton jsonb documents — same
  // save-all semantics as the file store.
  async getMedia() {
    const { data, error } = await db()
      .from("documents")
      .select("value")
      .eq("key", "media")
      .maybeSingle();
    if (error) throw error;
    return { ...defaultMedia, ...((data?.value ?? {}) as SiteMedia) };
  },
  async saveMedia(media: SiteMedia) {
    const { error } = await db()
      .from("documents")
      .upsert({ key: "media", value: media });
    if (error) throw error;
  },
  async getReminders() {
    const { data, error } = await db()
      .from("documents")
      .select("value")
      .eq("key", "reminders")
      .maybeSingle();
    if (error) throw error;
    return (data?.value ?? []) as import("./store").Reminder[];
  },
  async saveReminders(reminders) {
    const { error } = await db()
      .from("documents")
      .upsert({ key: "reminders", value: reminders });
    if (error) throw error;
  },
};
