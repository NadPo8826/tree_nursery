import { cache } from "react";
import type { Repo } from "./store";
import { fileRepo } from "./file-store";

/**
 * Backend selection: Supabase when configured, local file store otherwise.
 * The import of the Supabase impl is lazy so local dev needs no Supabase deps
 * at runtime.
 */
const useSupabase = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

let repoImpl: Repo = fileRepo;
if (useSupabase) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  repoImpl = (require("./supabase-store") as { supabaseRepo: Repo }).supabaseRepo;
}

/**
 * Read methods are wrapped in React cache() so one request renders with one
 * backend round trip per getter (layout + footer + page all call
 * getSettings/getTrees). Mutations stay uncached; each server action runs in
 * its own request, so it never sees a stale in-request memo of its own write.
 */
export const repo: Repo = {
  ...repoImpl,
  getTrees: cache(repoImpl.getTrees.bind(repoImpl)),
  getTree: cache(repoImpl.getTree.bind(repoImpl)),
  getLeads: cache(repoImpl.getLeads.bind(repoImpl)),
  getSettings: cache(repoImpl.getSettings.bind(repoImpl)),
  getGuides: cache(repoImpl.getGuides.bind(repoImpl)),
  getProjects: cache(repoImpl.getProjects.bind(repoImpl)),
  getMedia: cache(repoImpl.getMedia.bind(repoImpl)),
  getReminders: cache(repoImpl.getReminders.bind(repoImpl)),
  getAiFeedback: cache(repoImpl.getAiFeedback.bind(repoImpl)),
  getClients: cache(repoImpl.getClients.bind(repoImpl)),
  getQuotes: cache(repoImpl.getQuotes.bind(repoImpl)),
};
export type {
  AiFeedback,
  ClientEntry,
  Lead,
  LeadItem,
  LeadStatus,
  Quote,
  Reminder,
  Settings,
} from "./store";
