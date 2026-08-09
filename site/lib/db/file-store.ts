import { promises as fs } from "fs";
import path from "path";
import type { Guide, Project, Tree } from "@/lib/types";
import type {
  DbShape,
  Lead,
  LeadStatus,
  Repo,
  Settings,
  SiteMedia,
} from "./store";
import { defaultMedia, emptyAiPrompts } from "./store";
import { trees as seedTrees } from "@/data/trees";
import { quotes as seedQuotes } from "@/data/quotes";
import { guides as seedGuides } from "@/data/guides";
import { projects as seedProjects } from "@/data/projects";
import { site } from "@/lib/site";

/**
 * Zero-setup local backend: one JSON file under .data/ (gitignored), seeded
 * from the in-repo seed data on first run. Fine for local dev and demos;
 * production uses the Supabase backend (see lib/db/index.ts).
 */
const DB_PATH = path.join(process.cwd(), ".data", "db.json");

const defaultSettings: Settings = {
  siteName: site.name,
  tagline: site.tagline,
  phone: "04-6300000",
  proPhone: "04-6300001",
  whatsapp: "9725200000000", // international format, no plus
  email: "info@example.co.il",
  hoursHe: "א׳–ה׳ 8:00–16:00 · ו׳ 8:00–12:00 · בתיאום מראש",
  addressHe: "",
  navCoords: "",
  dunams: 120,
  speciesCount: 38,
  showPrices: true,
  aiProvider: "anthropic",
  aiModel: "claude-sonnet-5",
  aiSecretaryModel: "claude-opus-5",
  aiDailyLimit: 400,
  aiIpDailyLimit: 60,
  aiIpMinuteLimit: 8,
  // Deliberately empty: only the owner writes facts about the nursery.
  // Until filled in /admin/ai, the AI refers such questions to the phone.
  aiInfoHe: "",
  aiPrompts: { ...emptyAiPrompts },
  showQuotes: true,
  showClients: true,
  telegramAdminIds: "",
  digestHour: 8,
  nagAfterHours: 48,
  quoteTemplateHe: "",
  weeklyDay: 5, // Friday
  weeklyHour: 9,
  convoTimeoutMin: 30,
};

const emptyTelegramState = { lastDigestDate: "", naggedLeadIds: [] };

async function load(): Promise<DbShape> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const db = JSON.parse(raw) as DbShape;
    // merge defaults so fields/collections added in newer versions appear
    db.settings = {
      ...defaultSettings,
      ...db.settings,
      aiPrompts: { ...emptyAiPrompts, ...db.settings?.aiPrompts },
    };
    db.media = {
      ...defaultMedia,
      ...db.media,
      seasonImages: { ...defaultMedia.seasonImages, ...db.media?.seasonImages },
    };
    db.reminders ??= [];
    db.aiFeedback ??= {};
    db.clients ??= [];
    db.quotes ??= seedQuotes.map((q, i) => ({
      id: `q${i + 1}`,
      textHe: q.textHe,
      citeHe: q.citeHe,
      published: true,
    }));
    db.telegramState ??= { ...emptyTelegramState };
    db.telegramLog ??= [];
    db.telegramConvos ??= {};
    db.analytics ??= {};
    return db;
  } catch {
    const fresh: DbShape = {
      trees: seedTrees,
      leads: [],
      settings: defaultSettings,
      guides: seedGuides,
      projects: seedProjects,
      media: { ...defaultMedia },
      reminders: [],
      aiFeedback: {},
      clients: [],
      quotes: seedQuotes.map((q, i) => ({
        id: `q${i + 1}`,
        textHe: q.textHe,
        citeHe: q.citeHe,
        published: true,
      })),
      telegramState: { ...emptyTelegramState },
      telegramLog: [],
      telegramConvos: {},
      analytics: {},
    };
    await save(fresh);
    return fresh;
  }
}

async function save(db: DbShape): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export const fileRepo: Repo = {
  async getTrees() {
    return (await load()).trees;
  },
  async getTree(slug: string) {
    return (await load()).trees.find((t) => t.slug === slug);
  },
  async upsertTree(tree: Tree) {
    const db = await load();
    const i = db.trees.findIndex((t) => t.slug === tree.slug);
    if (i >= 0) db.trees[i] = tree;
    else db.trees.push(tree);
    await save(db);
  },
  async deleteTree(slug: string) {
    const db = await load();
    db.trees = db.trees.filter((t) => t.slug !== slug);
    await save(db);
  },

  async getLeads() {
    const db = await load();
    return [...db.leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async addLead(lead: Lead) {
    const db = await load();
    db.leads.push(lead);
    await save(db);
  },
  async setLeadStatus(id: string, status: LeadStatus) {
    const db = await load();
    const lead = db.leads.find((l) => l.id === id);
    if (lead) {
      lead.status = status;
      await save(db);
    }
  },
  async appendLeadQuote(id, quote) {
    const db = await load();
    const lead = db.leads.find((l) => l.id === id);
    if (lead) {
      lead.quotesSent = [...(lead.quotesSent ?? []), quote];
      await save(db);
    }
  },
  async deleteLead(id: string) {
    const db = await load();
    db.leads = db.leads.filter((l) => l.id !== id);
    await save(db);
  },
  async getAiFeedback() {
    return (await load()).aiFeedback;
  },
  async getClients() {
    return (await load()).clients;
  },
  async saveClients(clients) {
    const db = await load();
    db.clients = clients;
    await save(db);
  },
  async getQuotes() {
    return (await load()).quotes;
  },
  async saveQuotes(quotes) {
    const db = await load();
    db.quotes = quotes;
    await save(db);
  },
  async getTelegramState() {
    return (await load()).telegramState;
  },
  async saveTelegramState(state) {
    const db = await load();
    db.telegramState = state;
    await save(db);
  },
  async getTelegramLog() {
    return (await load()).telegramLog;
  },
  async trackPageview(day, path, visitorHash) {
    const db = await load();
    const entry = (db.analytics[day] ??= { paths: {}, visitors: [] });
    entry.paths[path] = (entry.paths[path] ?? 0) + 1;
    if (!entry.visitors.includes(visitorHash) && entry.visitors.length < 5000) {
      entry.visitors.push(visitorHash);
    }
    // retention: keep the last 90 days
    const days = Object.keys(db.analytics).sort();
    for (const old of days.slice(0, Math.max(0, days.length - 90))) {
      delete db.analytics[old];
    }
    await save(db);
  },
  async getAnalytics() {
    return (await load()).analytics;
  },
  async getTelegramConvo(chatId) {
    return (await load()).telegramConvos[chatId] ?? [];
  },
  async saveTelegramConvo(chatId, turns) {
    const db = await load();
    db.telegramConvos[chatId] = turns.slice(-30);
    await save(db);
  },
  async appendTelegramLog(entry) {
    const db = await load();
    db.telegramLog = [...db.telegramLog, entry].slice(-300);
    await save(db);
  },
  async addAiFeedbackVote(key: string, vote: "up" | "down") {
    const db = await load();
    const entry = (db.aiFeedback[key] ??= { up: 0, down: 0 });
    entry[vote]++;
    await save(db);
  },

  async getSettings() {
    return (await load()).settings;
  },
  async saveSettings(settings: Settings) {
    const db = await load();
    db.settings = settings;
    await save(db);
  },

  async getGuides() {
    return (await load()).guides;
  },
  async upsertGuide(guide: Guide) {
    const db = await load();
    const i = db.guides.findIndex((g) => g.slug === guide.slug);
    if (i >= 0) db.guides[i] = guide;
    else db.guides.push(guide);
    await save(db);
  },
  async deleteGuide(slug: string) {
    const db = await load();
    db.guides = db.guides.filter((g) => g.slug !== slug);
    await save(db);
  },

  async getProjects() {
    return (await load()).projects;
  },
  async upsertProject(project: Project) {
    const db = await load();
    const i = db.projects.findIndex((p) => p.slug === project.slug);
    if (i >= 0) db.projects[i] = project;
    else db.projects.push(project);
    await save(db);
  },
  async deleteProject(slug: string) {
    const db = await load();
    db.projects = db.projects.filter((p) => p.slug !== slug);
    await save(db);
  },

  async getMedia() {
    return (await load()).media;
  },
  async saveMedia(media: SiteMedia) {
    const db = await load();
    db.media = media;
    await save(db);
  },

  async getReminders() {
    return (await load()).reminders;
  },
  async saveReminders(reminders) {
    const db = await load();
    db.reminders = reminders;
    await save(db);
  },
};
