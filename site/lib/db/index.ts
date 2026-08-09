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

export const repo: Repo = repoImpl;
export type {
  AiFeedback,
  Lead,
  LeadItem,
  LeadStatus,
  Reminder,
  Settings,
} from "./store";
