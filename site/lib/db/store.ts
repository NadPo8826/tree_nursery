import type { Guide, Project, Tree } from "@/lib/types";

/** Lead captured from any channel (form / RFQ / AI chat). */
export type LeadStatus = "new" | "contacted" | "visited" | "planted";
export type LeadChannel =
  | "form"
  | "rfq"
  | "ai_chat"
  | "whatsapp_click"
  | "manual"; // created by the owner via the Telegram secretary (phone contact etc.)

export interface LeadItem {
  treeSlug: string;
  treeName: string;
  qtyRange: string;
}

/** A quote the secretary sent for this lead — shown on the admin lead card. */
export interface SentQuote {
  at: string; // ISO
  body: string;
  via: "email" | "telegram"; // telegram = delivered to the owner to forward
}

export interface Lead {
  id: string;
  createdAt: string; // ISO
  name: string;
  phone: string;
  email?: string;
  message: string;
  interest: string;
  items: LeadItem[];
  channel: LeadChannel;
  sourcePage: string;
  isPro: boolean;
  status: LeadStatus;
  quotesSent?: SentQuote[];
}

/** A reminder the owner sets via the Telegram secretary. */
export interface Reminder {
  id: string;
  createdAt: string;
  dueAt: string; // ISO
  noteHe: string;
  leadId?: string;
  done: boolean;
}

/** Owner-editable settings (mirrors the `settings` table). */
export interface Settings {
  siteName: string;
  tagline: string;
  phone: string;
  proPhone: string;
  whatsapp: string;
  email: string;
  hoursHe: string;
  /** Display address; also the navigation query when no coords are set. */
  addressHe: string;
  /** Optional "lat,lng" — precise pin for Waze/Google Maps (rural roads!). */
  navCoords: string;
  dunams: number;
  speciesCount: number;
  /** Global switch: when false, no prices appear anywhere on the site. */
  showPrices: boolean;
  /** AI engine behind the visitor chat — picked in /admin/ai. */
  aiProvider: "anthropic" | "gemini";
  aiModel: string;
  /** The Telegram secretary's model (Claude only — it emails in the owner's name). */
  aiSecretaryModel: string;
  /** Chat abuse/spend caps, editable in /admin/ai. */
  aiDailyLimit: number; // total messages/day, all visitors
  aiIpDailyLimit: number; // messages/day per visitor (IP)
  aiIpMinuteLimit: number; // messages/minute per visitor (IP)
  /**
   * Free-text facts the AI may state about the nursery (process, cranes,
   * warranty, service area…). The AI knows ONLY the catalog, the contact
   * settings, and this text — nothing else is hardcoded.
   */
  aiInfoHe: string;
  /**
   * Prompt overrides, editable in /admin/ai. Empty string = use the
   * built-in default from lib/ai-prompts.ts (which is also the safety
   * guardrail text — the admin UI warns before editing).
   */
  aiPrompts: AiPromptOverrides;
  /** Homepage section visibility switches. */
  showQuotes: boolean; // "מה אומרים עלינו"
  showClients: boolean; // "בין לקוחותינו"
  /**
   * Telegram secretary config (/admin/telegram). Admin chat IDs here are
   * combined with the env-var list (env = tamper-proof bootstrap).
   */
  telegramAdminIds: string; // comma-separated chat IDs
  digestHour: number; // Israel-time hour for the morning digest; -1 = off
  nagAfterHours: number; // nag when a lead stays "new" this long; 0 = off
  quoteTemplateHe: string; // owner's quote-email template for the secretary
  weeklyDay: number; // Israel weekday for the weekly summary (0=Sun..6=Sat); -1 = off
  weeklyHour: number; // Israel-time hour for the weekly summary
}

/** Cron bookkeeping so the digest fires once a day and nags fire once a lead. */
export interface TelegramState {
  lastDigestDate: string; // YYYY-MM-DD Israel time
  naggedLeadIds: string[];
  lastBackupDate?: string; // YYYY-MM-DD — nightly file-store backup marker
  lastWeeklyDate?: string; // YYYY-MM-DD — weekly summary marker
}

/**
 * First-party, privacy-light analytics: per-day pageview counts per path and
 * daily unique visitors (daily-salted hashes — no raw IPs, no cookies).
 * Kept 90 days.
 */
export interface AnalyticsDay {
  paths: Record<string, number>;
  visitors: string[]; // salted hashes, capped
}
export type Analytics = Record<string, AnalyticsDay>; // key = YYYY-MM-DD

/** One line in the secretary's activity log (/admin/telegram). */
export interface TelegramLogEntry {
  at: string; // ISO
  kind: "in" | "out" | "cron";
  chatId?: string;
  text: string;
}

/** A client shown in the homepage strip — logo, text, or both. */
export interface ClientEntry {
  id: string;
  nameHe: string;
  logoUrl: string;
}

/** Client testimonial ("מה אומרים עלינו") — managed in /admin/quotes. */
export interface Quote {
  id: string;
  textHe: string;
  citeHe: string;
  published: boolean;
}

export interface AiPromptOverrides {
  visitorSystem: string;
  toolSearchTrees: string;
  toolNurseryInfo: string;
  toolSaveLead: string;
  secretarySystem: string;
}

export const emptyAiPrompts: AiPromptOverrides = {
  visitorSystem: "",
  toolSearchTrees: "",
  toolNurseryInfo: "",
  toolSaveLead: "",
  secretarySystem: "",
};

/** Like/dislike tallies for AI replies, keyed by "provider/model". */
export type AiFeedback = Record<string, { up: number; down: number }>;

/** A hero-gallery slide: uploaded image or a video URL (mp4/YouTube/Vimeo). */
export interface MediaSlide {
  id: string;
  kind: "image" | "video";
  url: string;
  labelHe: string;
}

export type SeasonKey = "winter" | "spring" | "summer" | "autumn";

/** Owner-managed site media (homepage gallery + section images). */
export interface SiteMedia {
  heroSlides: MediaSlide[];
  aerialImage: string;
  transplantImage: string;
  seasonImages: Record<SeasonKey, string>;
}

export const defaultMedia: SiteMedia = {
  heroSlides: [],
  aerialImage: "",
  transplantImage: "",
  seasonImages: { winter: "", spring: "", summer: "", autumn: "" },
};

export interface DbShape {
  trees: Tree[];
  leads: Lead[];
  settings: Settings;
  guides: Guide[];
  projects: Project[];
  media: SiteMedia;
  reminders: Reminder[];
  aiFeedback: AiFeedback;
  clients: ClientEntry[];
  quotes: Quote[];
  telegramState: TelegramState;
  telegramLog: TelegramLogEntry[];
  analytics: Analytics;
}

/**
 * Storage backend contract. Implemented by the local file store (zero-setup
 * dev) and by Supabase (production) — chosen in lib/db/index.ts by env vars.
 */
export interface Repo {
  getTrees(): Promise<Tree[]>;
  getTree(slug: string): Promise<Tree | undefined>;
  upsertTree(tree: Tree): Promise<void>;
  deleteTree(slug: string): Promise<void>;

  getLeads(): Promise<Lead[]>;
  addLead(lead: Lead): Promise<void>;
  setLeadStatus(id: string, status: LeadStatus): Promise<void>;
  appendLeadQuote(id: string, quote: SentQuote): Promise<void>;
  deleteLead(id: string): Promise<void>;

  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;

  getGuides(): Promise<Guide[]>;
  upsertGuide(guide: Guide): Promise<void>;
  deleteGuide(slug: string): Promise<void>;

  getProjects(): Promise<Project[]>;
  upsertProject(project: Project): Promise<void>;
  deleteProject(slug: string): Promise<void>;

  getMedia(): Promise<SiteMedia>;
  saveMedia(media: SiteMedia): Promise<void>;

  getReminders(): Promise<Reminder[]>;
  saveReminders(reminders: Reminder[]): Promise<void>;

  getAiFeedback(): Promise<AiFeedback>;
  addAiFeedbackVote(key: string, vote: "up" | "down"): Promise<void>;

  getClients(): Promise<ClientEntry[]>;
  saveClients(clients: ClientEntry[]): Promise<void>;

  getQuotes(): Promise<Quote[]>;
  saveQuotes(quotes: Quote[]): Promise<void>;

  getTelegramState(): Promise<TelegramState>;
  saveTelegramState(state: TelegramState): Promise<void>;

  getTelegramLog(): Promise<TelegramLogEntry[]>;
  appendTelegramLog(entry: TelegramLogEntry): Promise<void>;

  trackPageview(day: string, path: string, visitorHash: string): Promise<void>;
  getAnalytics(): Promise<Analytics>;
}
