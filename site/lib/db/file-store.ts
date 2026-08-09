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

/**
 * All mutations run through this chain so concurrent requests (webhook,
 * cron, pageview tracker…) can never interleave a read-modify-write and
 * corrupt the file. Writes are atomic (tmp + rename). On corruption we
 * move the bad file aside and restore the newest nightly backup — a fresh
 * seed is the LAST resort and screams in the logs.
 */
let writeChain: Promise<unknown> = Promise.resolve();

export function withDbLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeChain.then(fn, fn);
  writeChain = next.catch(() => {});
  return next;
}

async function recoverFromCorruption(): Promise<DbShape | null> {
  const stamp = Date.now();
  try {
    await fs.rename(DB_PATH, `${DB_PATH}.corrupt-${stamp}`);
    console.error(
      `db.json was corrupt — moved to db.json.corrupt-${stamp}; attempting backup restore`,
    );
  } catch {
    /* nothing to move */
  }
  try {
    const backupDir = path.join(process.cwd(), ".data", "backups");
    const backups = (await fs.readdir(backupDir)).filter((f) => f.startsWith("db-")).sort();
    const latest = backups[backups.length - 1];
    if (latest) {
      const raw = await fs.readFile(path.join(backupDir, latest), "utf8");
      const db = JSON.parse(raw) as DbShape;
      console.error(`db restored from backup ${latest}`);
      return db;
    }
  } catch {
    /* no usable backup */
  }
  console.error(
    "NO BACKUP AVAILABLE — reseeding a fresh database. Runtime data (leads, settings, media) is lost.",
  );
  return null;
}

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
  } catch (e) {
    // distinguish "file missing" (first run — quietly seed) from
    // "file corrupt" (attempt backup restore before losing anything)
    const missing = (e as NodeJS.ErrnoException)?.code === "ENOENT";
    if (!missing) {
      const recovered = await recoverFromCorruption();
      if (recovered) {
        await save(recovered);
        return load();
      }
    }
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
  // atomic: write to a temp file, then rename over the target — a crash or
  // concurrent reader can never observe a half-written db.json
  const tmp = `${DB_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_PATH);
}

/** Read-modify-write helper: the whole cycle runs inside the write lock. */
function mutate<T>(fn: (db: DbShape) => T | Promise<T>): Promise<T> {
  return withDbLock(async () => {
    const db = await load();
    const result = await fn(db);
    await save(db);
    return result;
  });
}

export const fileRepo: Repo = {
  async getTrees() {
    return (await load()).trees;
  },
  async getTree(slug: string) {
    return (await load()).trees.find((t) => t.slug === slug);
  },
  async upsertTree(tree: Tree) {
    await mutate(async (db) => {
      const i = db.trees.findIndex((t) => t.slug === tree.slug);
      if (i >= 0) db.trees[i] = tree;
      else db.trees.push(tree);
    });
  },
  async deleteTree(slug: string) {
    await mutate(async (db) => {
      db.trees = db.trees.filter((t) => t.slug !== slug);
    });
  },

  async getLeads() {
    const db = await load();
    return [...db.leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async addLead(lead: Lead) {
    await mutate(async (db) => {
      db.leads.push(lead);
    });
  },
  async setLeadStatus(id: string, status: LeadStatus) {
    await mutate(async (db) => {
      const lead = db.leads.find((l) => l.id === id);
      if (lead) lead.status = status;
    });
  },
  async appendLeadQuote(id, quote) {
    await mutate(async (db) => {
      const lead = db.leads.find((l) => l.id === id);
      if (lead) lead.quotesSent = [...(lead.quotesSent ?? []), quote];
    });
  },
  async deleteLead(id: string) {
    await mutate(async (db) => {
      db.leads = db.leads.filter((l) => l.id !== id);
    });
  },
  async getAiFeedback() {
    return (await load()).aiFeedback;
  },
  async getClients() {
    return (await load()).clients;
  },
  async saveClients(clients) {
    await mutate(async (db) => {
      db.clients = clients;
    });
  },
  async getQuotes() {
    return (await load()).quotes;
  },
  async saveQuotes(quotes) {
    await mutate(async (db) => {
      db.quotes = quotes;
    });
  },
  async getTelegramState() {
    return (await load()).telegramState;
  },
  async saveTelegramState(state) {
    await mutate(async (db) => {
      db.telegramState = state;
    });
  },
  async getTelegramLog() {
    return (await load()).telegramLog;
  },
  async trackPageview(day, path, visitorHash) {
    await mutate(async (db) => {
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
    });
  },
  async getAnalytics() {
    return (await load()).analytics;
  },
  async getTelegramConvo(chatId) {
    return (await load()).telegramConvos[chatId] ?? [];
  },
  async saveTelegramConvo(chatId, turns) {
    await mutate(async (db) => {
      db.telegramConvos[chatId] = turns.slice(-30);
    });
  },
  async appendTelegramLog(entry) {
    await mutate(async (db) => {
      db.telegramLog = [...db.telegramLog, entry].slice(-300);
    });
  },
  async addAiFeedbackVote(key: string, vote: "up" | "down") {
    await mutate(async (db) => {
      const entry = (db.aiFeedback[key] ??= { up: 0, down: 0 });
      entry[vote]++;
    });
  },

  async getSettings() {
    return (await load()).settings;
  },
  async saveSettings(settings: Settings) {
    await mutate(async (db) => {
      db.settings = settings;
    });
  },

  async getGuides() {
    return (await load()).guides;
  },
  async upsertGuide(guide: Guide) {
    await mutate(async (db) => {
      const i = db.guides.findIndex((g) => g.slug === guide.slug);
      if (i >= 0) db.guides[i] = guide;
      else db.guides.push(guide);
    });
  },
  async deleteGuide(slug: string) {
    await mutate(async (db) => {
      db.guides = db.guides.filter((g) => g.slug !== slug);
    });
  },

  async getProjects() {
    return (await load()).projects;
  },
  async upsertProject(project: Project) {
    await mutate(async (db) => {
      const i = db.projects.findIndex((p) => p.slug === project.slug);
      if (i >= 0) db.projects[i] = project;
      else db.projects.push(project);
    });
  },
  async deleteProject(slug: string) {
    await mutate(async (db) => {
      db.projects = db.projects.filter((p) => p.slug !== slug);
    });
  },

  async getMedia() {
    return (await load()).media;
  },
  async saveMedia(media: SiteMedia) {
    await mutate(async (db) => {
      db.media = media;
    });
  },

  async getReminders() {
    return (await load()).reminders;
  },
  async saveReminders(reminders) {
    await mutate(async (db) => {
      db.reminders = reminders;
    });
  },
};
