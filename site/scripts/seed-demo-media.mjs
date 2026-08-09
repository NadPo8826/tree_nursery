/**
 * One-shot demo-content seeder for local dev: wires the images/video in
 * public/uploads into .data/db.json — tree photos, hero gallery (incl. the
 * drone video), section images, seasons, and project photos. Also marks the
 * ancient olive as a דייר ותיק so that flow is visible in the demo.
 *
 * Run after the dev server has created .data/db.json:
 *   node scripts/seed-demo-media.mjs
 * Safe to re-run; it only fills what's empty (use --force to overwrite).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = resolve(root, ".data", "db.json");
if (!existsSync(dbPath)) {
  console.error("No .data/db.json yet — start `next dev` once first.");
  process.exit(1);
}
const force = process.argv.includes("--force");
const db = JSON.parse(readFileSync(dbPath, "utf8"));
const u = (f) => `/uploads/${f}`;

// --- tree photos (by slug) ---------------------------------------------
const treePhotos = {
  "ancient-olive-214": ["olive_vouves.jpg", "hands.jpg"],
  "kermes-oak": ["oak.jpg"],
  carob: ["carob.jpg"],
  "judas-tree": ["cercis.jpg"],
  pomegranate: ["pomegranate.jpg"],
  "valencia-orange": ["oranges.jpg"],
};
for (const tree of db.trees) {
  const photos = treePhotos[tree.slug];
  if (photos && (force || tree.photos.length === 0)) {
    tree.photos = photos.map(u);
  }
}

// Demo veteran: the ancient olive is one-of-a-kind, sold as-is.
const olive = db.trees.find((t) => t.slug === "ancient-olive-214");
if (olive) {
  olive.saleType = "unique";
  olive.featured = true;
  if (olive.availability === "sold") olive.availability = "available";
}

// --- homepage media -----------------------------------------------------
const media = db.media ?? {};
if (force || !(media.heroSlides ?? []).length) {
  media.heroSlides = [
    { id: "hs1", kind: "video", url: u("drone.webm"), labelHe: "המשתלה ממעוף הרחפן" },
    { id: "hs2", kind: "image", url: u("hero_paxos.jpg"), labelHe: "בין השורות בשעת בוקר" },
    { id: "hs3", kind: "image", url: u("olive_vouves.jpg"), labelHe: "הזית העתיק" },
    { id: "hs4", kind: "image", url: u("hands.jpg"), labelHe: "ידיים שיודעות עצים" },
  ];
}
if (force || !media.aerialImage) media.aerialImage = u("aerial_olives.jpg");
if (force || !media.transplantImage) media.transplantImage = u("spade.jpg");
media.seasonImages = media.seasonImages ?? {};
const seasons = {
  spring: "spring_almond.jpg",
  summer: "summer_delphi.jpg",
  autumn: "autumn_road.jpg",
  winter: "winter_path.jpg",
};
for (const [key, file] of Object.entries(seasons)) {
  if (force || !media.seasonImages[key]) media.seasonImages[key] = u(file);
}
db.media = media;

// --- project photos (in display order) ---------------------------------
const projectImages = [
  "carob.jpg",
  "people1.jpg",
  "cercis.jpg",
  "people2.jpg",
  "summer_delphi.jpg",
];
(db.projects ?? []).forEach((p, i) => {
  if (force || !p.imageUrl) p.imageUrl = u(projectImages[i % projectImages.length]);
});

writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log(
  `Seeded: ${db.trees.filter((t) => t.photos.length).length} trees with photos, ` +
    `${db.media.heroSlides.length} hero slides, seasons, ${db.projects?.length ?? 0} projects.`,
);
