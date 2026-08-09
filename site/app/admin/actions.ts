"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { repo } from "@/lib/db";
import type { LeadStatus, Settings } from "@/lib/db";
import { isValidAiChoice } from "@/lib/ai-models";
import {
  DEFAULT_SECRETARY_SYSTEM,
  DEFAULT_TOOL_NURSERY_INFO,
  DEFAULT_TOOL_SAVE_LEAD,
  DEFAULT_TOOL_SEARCH_TREES,
  DEFAULT_VISITOR_SYSTEM,
} from "@/lib/ai-prompts";
import type { MediaSlide } from "@/lib/db/store";
import type { Guide, Project, Tree } from "@/lib/types";
import { headers } from "next/headers";
import {
  checkPassword,
  checkTotp,
  createSession,
  destroySession,
  isAuthenticated,
} from "@/lib/auth";

async function requireAdmin(): Promise<void> {
  if (!(await isAuthenticated())) redirect("/admin/login");
}

// Brute-force guard on login: 5 failures per IP per 15 minutes.
const loginFails = new Map<string, number[]>();
const LOGIN_WINDOW_MS = 15 * 60_000;

export async function loginAction(formData: FormData): Promise<void> {
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const fails = (loginFails.get(ip) ?? []).filter((t) => now - t < LOGIN_WINDOW_MS);
  if (fails.length >= 5) redirect("/admin/login?error=locked");

  const password = String(formData.get("password") ?? "");
  const otp = String(formData.get("otp") ?? "");
  // Evaluate both factors before deciding, so a failure doesn't reveal
  // which one was wrong.
  const ok = checkPassword(password) && checkTotp(otp);
  if (!ok) {
    fails.push(now);
    loginFails.set(ip, fails);
    if (loginFails.size > 1000) loginFails.clear();
    redirect("/admin/login?error=1");
  }
  loginFails.delete(ip);
  await createSession();
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

function num(formData: FormData, key: string, fallback = 0): number {
  const v = Number(formData.get(key));
  return Number.isFinite(v) ? v : fallback;
}

export async function saveTreeAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) return;
  const existing = await repo.getTree(slug);

  const saleType = (formData.get("saleType") ??
    existing?.saleType ??
    "stock") as Tree["saleType"];

  const tree: Tree = {
    slug,
    code: String(formData.get("code") ?? existing?.code ?? "").trim(),
    nameHe: String(formData.get("nameHe") ?? existing?.nameHe ?? "").trim(),
    speciesLatin: String(
      formData.get("speciesLatin") ?? existing?.speciesLatin ?? "",
    ).trim(),
    categoryHe: String(
      formData.get("categoryHe") ?? existing?.categoryHe ?? "",
    ).trim(),
    storyHe: String(formData.get("storyHe") ?? existing?.storyHe ?? "").trim(),
    aiNotesHe: String(formData.get("aiNotesHe") ?? existing?.aiNotesHe ?? "")
      .trim()
      .slice(0, 1500),
    heightM: num(formData, "heightM", existing?.heightM ?? 0),
    trunkDiameterCm: num(
      formData,
      "trunkDiameterCm",
      existing?.trunkDiameterCm ?? 0,
    ),
    ageYears: num(formData, "ageYears", existing?.ageYears ?? 0),
    rootBallWeightKg:
      num(formData, "rootBallWeightKg", existing?.rootBallWeightKg ?? 0) ||
      undefined,
    requirementsHe:
      String(
        formData.get("requirementsHe") ?? existing?.requirementsHe ?? "",
      ).trim() || undefined,
    price: num(formData, "price", existing?.price ?? 0),
    priceMode: (formData.get("priceMode") ??
      existing?.priceMode ??
      "from") as Tree["priceMode"],
    saleType,
    // veterans use a shown/hidden checkbox; stock uses the במלאי/אזל select
    availability: formData.has("displayed")
      ? "available"
      : saleType === "unique" && formData.has("saleType")
        ? "sold"
        : ((formData.get("availability") ??
            existing?.availability ??
            "available") as Tree["availability"]),
    // "first on homepage" is a veterans-only concept
    featured: saleType === "unique" && formData.get("featured") === "on",
    photos: existing?.photos ?? [],
  };
  if (!tree.nameHe) return;

  // The tag number is identity, not homework: auto-assign the next free one.
  if (!tree.code) {
    const taken = (await repo.getTrees()).map((t) => Number(t.code) || 0);
    tree.code = String(Math.max(100, ...taken) + 1);
  }

  await repo.upsertTree(tree);
  revalidatePath("/admin/trees");
  revalidatePath("/catalog");
  revalidatePath("/");
}

export async function deleteTreeAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  if (slug) {
    await repo.deleteTree(slug);
    revalidatePath("/admin/trees");
    revalidatePath("/catalog");
  }
}

export async function setLeadStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as LeadStatus;
  if (id && ["new", "contacted", "visited", "planted"].includes(status)) {
    await repo.setLeadStatus(id, status);
    revalidatePath("/admin/leads");
  }
}

export async function deleteLeadAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await repo.deleteLead(id);
    revalidatePath("/admin/leads");
  }
}

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function uploadTreePhotoAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const file = formData.get("photo");
  const tree = await repo.getTree(slug);
  if (!tree || !(file instanceof File) || file.size === 0) return;
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext || file.size > MAX_IMAGE_BYTES) return;

  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  const name = `${slug}-${Date.now()}${ext}`;
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  tree.photos = [...tree.photos, `/uploads/${name}`];
  await repo.upsertTree(tree);
  revalidatePath("/", "layout");
}

export async function removeTreePhotoAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const photo = String(formData.get("photo") ?? "");
  const tree = await repo.getTree(slug);
  if (!tree) return;
  tree.photos = tree.photos.filter((p) => p !== photo);
  await repo.upsertTree(tree);
  revalidatePath("/", "layout");
}

async function saveUpload(file: File, prefix: string): Promise<string | null> {
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext || file.size === 0 || file.size > MAX_IMAGE_BYTES) return null;
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  const name = `${prefix}-${Date.now()}${ext}`;
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

export async function addHeroSlideAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const media = await repo.getMedia();
  const labelHe = String(formData.get("labelHe") ?? "").trim();
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const file = formData.get("image");

  let slide: MediaSlide | null = null;
  if (videoUrl) {
    slide = { id: randomUUID(), kind: "video", url: videoUrl, labelHe };
  } else if (file instanceof File && file.size > 0) {
    const url = await saveUpload(file, "hero");
    if (url) slide = { id: randomUUID(), kind: "image", url, labelHe };
  }
  if (!slide) return;

  media.heroSlides.push(slide);
  await repo.saveMedia(media);
  revalidatePath("/", "layout");
}

export async function removeHeroSlideAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const media = await repo.getMedia();
  media.heroSlides = media.heroSlides.filter((s) => s.id !== id);
  await repo.saveMedia(media);
  revalidatePath("/", "layout");
}

const SEASON_KEYS = ["winter", "spring", "summer", "autumn"] as const;

export async function setSectionImageAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const section = String(formData.get("section") ?? "");
  const media = await repo.getMedia();

  const seasonKey = SEASON_KEYS.find((k) => section === `season_${k}`);
  const isBand = section === "aerialImage" || section === "transplantImage";
  if (!seasonKey && !isBand) return;

  const file = formData.get("image");
  let value: string | null = "";
  if (formData.get("clear") !== "1") {
    value = file instanceof File ? await saveUpload(file, section) : null;
    if (value === null) return;
  }

  if (seasonKey) media.seasonImages[seasonKey] = value;
  else if (isBand) media[section as "aerialImage" | "transplantImage"] = value;

  await repo.saveMedia(media);
  revalidatePath("/", "layout");
}

export async function uploadProjectPhotoAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const projects = await repo.getProjects();
  const project = projects.find((p) => p.slug === slug);
  const file = formData.get("photo");
  if (!project || !(file instanceof File)) return;
  const url = await saveUpload(file, `project-${slug}`);
  if (!url) return;
  project.imageUrl = url;
  await repo.upsertProject(project);
  revalidatePath("/", "layout");
}

export async function saveGuideAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "").trim();
  const titleHe = String(formData.get("titleHe") ?? "").trim();
  if (!slug || !titleHe) return;
  const guide: Guide = {
    slug,
    titleHe,
    categoryHe: String(formData.get("categoryHe") ?? "").trim(),
    minutes: num(formData, "minutes", 5),
    excerptHe: String(formData.get("excerptHe") ?? "").trim(),
    bodyMd: String(formData.get("bodyMd") ?? ""),
    published: formData.get("published") === "on",
  };
  await repo.upsertGuide(guide);
  revalidatePath("/", "layout");
}

export async function deleteGuideAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  if (slug) {
    await repo.deleteGuide(slug);
    revalidatePath("/", "layout");
  }
}

export async function saveProjectAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "").trim();
  const titleHe = String(formData.get("titleHe") ?? "").trim();
  if (!slug || !titleHe) return;
  const existing = (await repo.getProjects()).find((p) => p.slug === slug);
  const project: Project = {
    slug,
    titleHe,
    imageUrl: existing?.imageUrl,
    cityHe: String(formData.get("cityHe") ?? "").trim(),
    mapX: num(formData, "mapX", 100),
    mapY: num(formData, "mapY", 200),
    year: num(formData, "year", new Date().getFullYear()),
    storyHe: String(formData.get("storyHe") ?? "").trim(),
    metaHe: String(formData.get("metaHe") ?? "").trim(),
    published: formData.get("published") === "on",
  };
  await repo.upsertProject(project);
  revalidatePath("/", "layout");
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  if (slug) {
    await repo.deleteProject(slug);
    revalidatePath("/", "layout");
  }
}

export async function saveSettingsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const current = await repo.getSettings();
  const settings: Settings = {
    ...current,
    siteName: String(formData.get("siteName") ?? current.siteName).trim(),
    tagline: String(formData.get("tagline") ?? current.tagline).trim(),
    phone: String(formData.get("phone") ?? current.phone).trim(),
    proPhone: String(formData.get("proPhone") ?? current.proPhone).trim(),
    whatsapp: String(formData.get("whatsapp") ?? current.whatsapp).trim(),
    email: String(formData.get("email") ?? current.email).trim(),
    hoursHe: String(formData.get("hoursHe") ?? current.hoursHe).trim(),
    showPrices: formData.get("showPrices") === "on",
  };
  await repo.saveSettings(settings);
  revalidatePath("/", "layout"); // prices affect every page
}

function promptOverride(
  formData: FormData,
  field: string,
  defaultText: string,
  fallback: string,
): string {
  const raw = formData.get(field);
  if (typeof raw !== "string") return fallback;
  const text = raw.trim().slice(0, 8000);
  return text === defaultText.trim() ? "" : text;
}

export async function saveAiSettingsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const current = await repo.getSettings();
  const settings: Settings = {
    ...current,
    // caps are clamped to sane floors so a typo can't disable the chat
    aiDailyLimit: Math.max(10, num(formData, "aiDailyLimit", current.aiDailyLimit)),
    aiIpDailyLimit: Math.max(3, num(formData, "aiIpDailyLimit", current.aiIpDailyLimit)),
    aiIpMinuteLimit: Math.max(1, num(formData, "aiIpMinuteLimit", current.aiIpMinuteLimit)),
    aiInfoHe: String(formData.get("aiInfoHe") ?? current.aiInfoHe).trim().slice(0, 4000),
    aiPrompts: {
      // text identical to the built-in default is stored as "" so future
      // default improvements apply automatically; edits are kept verbatim
      visitorSystem: promptOverride(formData, "promptVisitorSystem", DEFAULT_VISITOR_SYSTEM, current.aiPrompts.visitorSystem),
      toolSearchTrees: promptOverride(formData, "promptToolSearchTrees", DEFAULT_TOOL_SEARCH_TREES, current.aiPrompts.toolSearchTrees),
      toolNurseryInfo: promptOverride(formData, "promptToolNurseryInfo", DEFAULT_TOOL_NURSERY_INFO, current.aiPrompts.toolNurseryInfo),
      toolSaveLead: promptOverride(formData, "promptToolSaveLead", DEFAULT_TOOL_SAVE_LEAD, current.aiPrompts.toolSaveLead),
      secretarySystem: promptOverride(formData, "promptSecretarySystem", DEFAULT_SECRETARY_SYSTEM, current.aiPrompts.secretarySystem),
    },
  };
  const [aiProvider, aiModel] = String(formData.get("aiChoice") ?? "").split("|");
  if (isValidAiChoice(aiProvider, aiModel)) {
    settings.aiProvider = aiProvider;
    settings.aiModel = aiModel;
  }
  await repo.saveSettings(settings);
  revalidatePath("/admin/ai");
}
