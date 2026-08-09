# Mature Tree Nursery — Website Project Plan

> **v2 note (Aug 2026):** Design is finalized (see "Implementation Plan v2" at the bottom — it supersedes the site-map and tech sections below where they differ). The approved design: merged sun/shade homepage, "Nature Distilled" earth-modern system, rotating hero gallery, testimonial carousel, clickable Israel projects map.

**Goal:** a lead-generating, reputation-building website (Hebrew, RTL) for a mature tree nursery.
**Audiences:** landscape architects & designers, contractors/developers/municipalities, private homeowners.
**Build:** custom Next.js site, developed together in this workspace, hosted on Vercel.

---

## 1. What "success" means

Every page exists to do one of two jobs: build trust or capture a lead. Metrics to track from day one:

- Lead form submissions (general + per-tree quote requests)
- WhatsApp click-throughs (this will likely be the #1 channel in Israel)
- Phone taps (mobile)
- Leads captured by the AI assistant
- Catalog engagement (which trees get viewed/requested most — doubles as market research)

## 2. Site map (Hebrew, RTL)

| Page | Hebrew | Purpose |
|---|---|---|
| Home | עמוד הבית | Cinematic hero (drone video), story teaser, featured specimen trees, trust strip, strong CTA |
| Our Story | הסיפור שלנו | The nursery's history, the people, the philosophy of growing mature trees — the emotional core |
| Tree Catalog | קטלוג העצים | Filterable catalog: species, height, trunk caliper, container/root-ball size, availability. Each tree gets its own page with photos and a "request quote" CTA |
| Projects | פרויקטים | Before/after galleries of real plantings — the strongest proof for architects and contractors |
| Virtual Tour | סיור וירטואלי | 360° walkthrough + narrated drone tour of the nursery |
| Services | שירותים | Consultation, selection visits, delivery, crane planting, post-planting care & warranty |
| Guides / Blog | מדריכים | SEO content: "how to choose a mature tree", species guides, planting seasons |
| Contact | צור קשר | Form, click-to-WhatsApp, click-to-call, map, visiting hours |

Persistent elements on every page: sticky WhatsApp button, phone number in header, AI chat widget bottom-corner.

### Audience-specific paths
- **Architects/designers:** catalog with real specs (botanical names, caliper, height, availability), downloadable spec sheets, "work with us" pitch.
- **Contractors/municipalities:** track record, logistics capability (cranes, transport), reliability signals, named projects, tender-friendly contact route.
- **Homeowners:** visual wow, plain-language guidance, "not sure what you need? talk to us" — the AI assistant shines here.

## 3. Lead capture system

1. **AI representative (chat widget):**
   - Hebrew-speaking assistant powered by the Claude API via a Next.js API route.
   - Knows the nursery: catalog, services, delivery areas, story (fed as structured context).
   - Answers questions AND qualifies leads: politely collects name, phone, project type, timeline, tree interests.
   - Saves the lead to the database and notifies the owner (email + optionally WhatsApp).
   - Guardrails: never invents prices/availability; hands off to a human for quotes; escalation path ("someone will call you back").
2. **Forms:** short general contact form; per-tree "request quote" form pre-filled with the tree's details.
3. **WhatsApp deep links:** pre-filled message text, e.g. "Hi, I'm interested in the olive tree (catalog #123)".
4. **Lead backend:** all leads (form / chat / quote) land in one table with source attribution, with email notification to the owner. Simple admin view later if needed.

## 4. Virtual tour

Two layers, both feasible once media exists:

- **Narrated drone tour (video):** 2–3 minute edited flyover with chapters (entrance → growing plots → specimen area → loading/logistics). Embedded prominently on the home and tour pages.
- **360° walkthrough:** 360° photos at 6–10 key points in the nursery, connected with hotspots (custom viewer, e.g. Photo Sphere Viewer/Pannellum — no Matterport subscription needed). Optional info hotspots on notable trees.
- **Stretch:** interactive nursery map — click a plot, see what grows there.

## 5. Media production plan (nothing exists yet — shoot list)

This is the critical path for the "wow" layer. One well-planned shoot day (golden hour) covers most of it:

**Drone (video + stills):** entrance approach, slow flyovers of the rows, reveal shots of the biggest specimen trees, loading a tree onto a truck if possible.
**360° stills:** 6–10 positions along a natural walking route through the nursery.
**Ground photography:** each catalog tree — consistent angle, clean background, a person standing next to it for scale; detail shots (bark, canopy, root ball); the team at work.
**Video:** 60–90s owner interview telling the story ("why mature trees"); a delivery/crane-planting sequence at a client site; 1–2 short customer testimonials.

Phone footage can bootstrap the catalog; the drone/interview shoot is worth doing professionally.

## 6. Tech stack

- **Framework:** Next.js (App Router) + Tailwind CSS, full RTL layout, Hebrew typography (e.g. Heebo or Assistant).
- **Hosting:** Vercel (free tier is fine to start), custom domain.
- **Content:** tree catalog + projects as structured content the owner can edit — start with simple JSON/MDX in-repo, graduate to a free-tier headless CMS (e.g. Sanity) if hand-editing becomes a burden.
- **Leads DB:** Supabase or Vercel Postgres (free tier) + Resend for email notifications.
- **AI assistant:** Next.js API route → Claude API, with tool-calling for "save lead"; rate limiting + spend cap.
- **Media:** next/image with responsive sizes (the site is image-heavy — performance discipline matters); video via self-hosted MP4 on a CDN or unlisted YouTube/Vimeo embeds.
- **SEO:** Hebrew metadata, schema.org (LocalBusiness + Product per tree), sitemap, Google Business Profile alignment, fast Core Web Vitals.
- **Analytics:** GA4 or Vercel Analytics + conversion events on every lead action.

## 7. Trust & reputation elements (woven throughout)

Years in operation and nursery size; named/recognizable projects and client logos (municipalities, developers); testimonials (text + short video); the guarantee/aftercare promise; real faces — the owner and team; professional certifications or memberships if any.

## 8. Roadmap

**Phase 1 — Launchable core (build now):**
Home, Story, Catalog (seeded with initial trees, even with temporary photos), Services, Contact with WhatsApp/phone/form, RTL design system, SEO basics, analytics. → A real, respectable site online.

**Phase 2 — Lead machine:**
Leads database + notifications, per-tree quote requests, AI representative (Hebrew, lead-qualifying), admin lead list.

**Phase 3 — Wow layer (after the media shoot):**
Drone hero video, virtual tour (video chapters + 360° walkthrough), Projects gallery with before/afters, testimonial videos.

**Phase 4 — Growth:**
Guides/blog for SEO, catalog CMS if needed, refinements from analytics (which trees, which CTAs).

## 9. Inputs needed from the owner

- Business name, logo (or we design a simple one), tagline if any
- Domain name (existing or to purchase, ~₪50/year)
- Phone + WhatsApp number for leads; email for notifications
- Initial tree list: species, sizes, rough specs (even a spreadsheet/photo of a price list works)
- The story: how the nursery started, years active, what makes it different
- Service area, delivery/planting capabilities, warranty policy
- Any existing photos, past project names, client references

## 10. Running costs (order of magnitude)

- Domain: ~₪50/year
- Hosting: free (Vercel) until traffic justifies more
- Claude API for the assistant: typically a few dollars/month at small-business traffic, with a hard spend cap
- Media shoot: one-time, the main real expense — worth it

---

# Implementation Plan v2 (approved design → production site)

## 1. Navigation (final)

Desktop header (RTL, right to left): **logo → קטלוג העצים · פרויקטים · איך זה עובד · הסיפור · מדריכים → [תיאום ביקור] pill (terracotta) → phone icon**.

| Nav item | Page | Job |
|---|---|---|
| קטלוג העצים | /catalog + /tree/[slug] | The engine: filterable catalog, page per tree, quote/ask CTA |
| פרויקטים | /projects | Israel map with pins + success stories (from homepage, expanded) |
| איך זה עובד | /process | Selection visit → root-ball prep → crane delivery → planting → warranty; services live here |
| הסיפור | /about | Family, land, decades; team photos |
| מדריכים | /guides + /guides/[slug] | SEO + trust articles |
| תיאום ביקור (pill) | /visit | Visit scheduling: form + hours + map + what to expect; the virtual tour lives here too |

Mobile: hamburger for nav + **sticky bottom bar** with 3 actions: וואטסאפ · חיוג · תיאום ביקור. AI chat bubble floats on all pages (both breakpoints).

### B2B layer — targeting גננים, אדריכלים, קבלנים ועיריות

- **/pro page** ("לאנשי מקצוע ורשויות") reached via a quiet dashed chip in the header: three audience cards (gardeners/architects, contractors, municipalities) with tailored benefits, capabilities strip (crane fleet, tender experience, inter-ministerial spec compliance, zero-replacement record), downloadable documents (nursery certification, insurance, sample spec sheet, municipal references), and the lead magnet: **supplier-file / framework-agreement form** + a named direct line.
- **Catalog pro features:** dense table view toggle, PDF export, per-tree architect spec sheets, and the **request list (רשימת בקשה)** — a quote "cart": + button on each card collects trees **with a quantity range (1 / 2–5 / 6–20 / 20+)**, sticky bottom bar sends one RFQ for all of them. Schema: leads with `items[{tree, qtyRange}]`; trees carry `qty_available` stock counts editable in /admin.
- **AI routing:** the assistant detects professional context ("אני אדריכלית", quantities, tenders) and routes to the pro line/pro pricing flow; pro leads flagged `pro` in the leads table.
- **SEO:** landing content for "עצים בוגרים לעיריות", "ספק עצים בוגרים למכרזים", "עצים בוגרים לאדריכלי נוף".

## 2. Content management — how the owner updates the site

**Single source of truth: Supabase (free Postgres) + a password-protected /admin area inside the site.** One system feeds the website pages, the AI representative, and the leads inbox.

Tables:
- `trees` — name_he, species_latin, slug, story_he, height_m, trunk_diameter_cm, age_years, container_type, price, price_mode (`hidden` | `visible` | `from`), availability (`available` | `reserved` | `preorder` | `sold`), photos[], featured, sort
- `projects` — title, city, lat/lng (pin position), story, year, images[], published
- `guides` — title, slug, body (markdown), published
- `settings` — phones, whatsapp number, hours, service area, warranty text, AI behavior flags (e.g. "never quote prices")
- `faqs` — question, answer (feeds the AI directly)
- `leads` — see §4

/admin (simple, Hebrew, mobile-friendly — built as part of the site) gives the owner control over **all** site content:
- **Catalog:** tree list with inline availability toggle, price field and stock quantity; add/edit form with photo upload (Supabase Storage); one-time CSV/Excel import from the existing price list
- **Media:** image uploads everywhere (trees, projects, story, hero gallery); video slots as YouTube/Vimeo URLs or storage uploads (hero film, tour chapters)
- **Texts:** every editable copy block on the site (hero headline, manifesto, section titles, process steps, guarantee text) lives in a `site_content` table — edited as plain Hebrew text fields, no code
- **Guides/blog (מדריכים):** full editor — title, category, reading time, cover image, markdown body, publish toggle
- **Projects:** add/edit success stories incl. map pin position
- **Leads inbox:** new / contacted / visited / planted, with source and RFQ items
- **Settings:** hours, phones, WhatsApp, FAQ, AI behavior flags

Site pages read from the DB with ISR (revalidate ~60s) — an admin edit is live on the site within a minute, no deploys.

## 3. How the AI representative uses the data

The chat API route (Next.js → Claude API) gets **tools, not copies** — it queries the same DB at answer time, so it is never stale:

- `search_trees(species?, min_height?, max_height?, purpose?)` → live rows from `trees` (only `availability != sold`)
- `get_settings()` / `get_faqs()` → hours, service area, warranty, FAQ answers
- `save_lead(name, phone, interest, summary)` → inserts into `leads` with source `ai_chat` + conversation summary, triggers owner notification
- `request_visit()` → flags lead as visit-ready

**Price policy (decided): "starting-from" prices.** Every tree shows "החל מ־₪X"; final quote always by contact, since crane/delivery varies per site. The AI states the from-price and explains what affects the final number (access, crane, distance) — turning every price question into a soft lead. The `price_mode` column stays in the schema so individual trees can still be set to hidden/visible later. Guardrails in the system prompt: never invent stock or prices beyond the from-price, offer the human channel when unsure, qualify leads only after giving real help. Rate limit per visitor + monthly API spend cap + full conversation logs visible in /admin.

## 4. Contact wiring ("צור קשר" everywhere)

Channels → one pipe:
1. **Forms** (3 fields: name, phone, free text; tree pages pre-fill the tree) → `POST /api/leads`
2. **AI chat** → same endpoint via `save_lead`
3. **WhatsApp deep links** — `wa.me/<number>?text=<prefilled per page>`; click recorded as a lead event before redirect
4. **Phone taps** — `tel:` links, click recorded as conversion event

`/api/leads` does: validate (Israeli phone format) → honeypot + rate-limit spam check → insert into `leads` (name, phone, message, interest, source_page, channel, created_at) → notify owner two ways (decided): **email (Resend, free)** with full details + conversation summary, and an **instant Telegram push via a dedicated bot** (free Bot API; one-time setup: create bot with @BotFather, owner presses Start, chat_id stored in settings). Telegram message is short — name, phone (tap-to-call), interest, source — with a link to the lead in /admin.

Every channel carries `source_page`, so within a month the data shows which trees/pages produce leads.

## 5. Build order

1. **Scaffold** — Next.js + Tailwind (RTL), design tokens from the approved mockup (cream #F7F2E6, soil #261F12, terracotta #C0714C, gold #B07E2E, curves, grain, organic radii)
2. **Homepage** — port the approved mockup 1:1 with placeholder media slots
3. **Supabase schema + /admin** — trees CRUD, CSV import, settings
4. **Catalog + tree pages** — reading live data
5. **Leads pipe** — /api/leads, forms, WhatsApp links, email notifications
6. **AI representative** — chat widget + tools + guardrails
7. **Remaining pages** — projects (map), process, about, guides, visit
8. **Launch checklist** — domain, SEO (schema.org LocalBusiness + Product), analytics events, accessibility pass
9. **Later** — real media shoot replaces placeholders; virtual tour page upgrade


## 6. Messaging bots — Telegram & WhatsApp (planned phase, after the AI representative)

The user wants customers to reach the nursery's assistant from Telegram/WhatsApp, not only the site widget. Architecture: **one brain, many doors.**

- **Shared assistant core** (`lib/assistant.ts`): the Claude-API conversation engine with its tools. Built channel-agnostic in the AI phase so the web widget and the bots reuse it identically.
- **Data access is read-only by design:** the bots get only read tools (`search_trees`, `get_faqs`, `get_settings` — served by the same repo layer) plus the insert-only `save_lead`. No update/delete surface exists in their toolset, so a prompt-injected chat physically cannot modify catalog data.
- **Channel adapters (thin):**
  - Telegram: `/api/telegram` webhook route using the same bot token as owner notifications (or a separate customer-facing bot).
  - WhatsApp: requires a provider (Twilio WhatsApp API or Green-API) — webhook → assistant core → reply. Costs/setup flagged before building.
- **Summarized order requests:** when a chat ends in intent, the assistant composes the same summarized quote request as the site's RFQ flow and pushes it through the existing `notify.ts` pipe (email + Telegram to the owner; WhatsApp delivery once a provider exists) — and records it as a lead with channel attribution.
- **Shared guardrails:** identical system prompt, price policy, spend cap and rate limiting across all channels; per-chat-id limits on the bots.

## 7. Secretary & security backlog (approved ideas, not yet built)

Secretary (Telegram, owner-facing):
- [ ] Morning digest — daily cron: "X פניות חדשות אתמול, Y ממתינות מעל יומיים" (start here; it's one cron away)
- [ ] Auto-nag on leads stuck in `new` > 48h
- [ ] Official quote template: branded HTML mail now; PDF attachment via headless Chrome once we're on our own server (Hebrew RTL PDF needs real browser rendering)
- [ ] Quote presets per tree type (crane/transport line items the owner can reuse)
- [ ] Auto-flag pro leads (architect/contractor/municipality keywords)
- [ ] Visitor stats — requires a privacy-light analytics integration (Plausible/Umami self-hosted); until then the bot honestly says stats aren't available

Security (beyond what's implemented: TOTP MFA, login lockout, server-side session expiry, fail-closed webhook/cron, security headers):
- [ ] Move rate-limit counters to the DB if we ever deploy serverless (in-memory is fine on a single server)
- [ ] Backup cron for db.json / Supabase (daily, keep 14)
- [ ] Dependency audit in CI (`npm audit` gate)

## 7b. SEO plan — catalog categories as landing pages (investigated 2026-08)

The old site (domimtree.com) ranked via per-category links (עצי הדר, עצי פרי, עצים טרופיים, עצי זית עתיקים, עצים מעוצבים…). The new admin category field maps 1:1 onto that structure. Plan:

- **/catalog/[category] landing pages** — one crawlable page per category, generated from the same admin data (no extra admin work). Hebrew URLs are fine for Google (`/catalog/עצי-זית` percent-encodes transparently); each page gets its own `<title>`/description ("עצי זית בוגרים למכירה — עץ הדומים"), a 2–3 sentence intro (admin-editable later), and the category's tree grid. The in-page anchors on /catalog stay for browsing UX; the landing pages exist for search entry.
- **Footer** — add a קטגוריות column linking every category page (mirrors the old site's link block, gives every page sitewide internal links).
- **sitemap.xml + robots.txt** — Next's `app/sitemap.ts` covering home, catalog, categories, every tree, guides, projects.
- **Structured data** — JSON-LD: `Product` + `Offer` on tree pages (price, availability), `ItemList` on category pages, `BreadcrumbList` on tree pages, `LocalBusiness`/`GardenStore` sitewide (hours, phone from settings).
- **Old-site parity** — מבצעי מכירה → planned sales page; מאמרי מידע → already exists as מדריכים (ensure category-relevant guides interlink with category pages); 301-map old URLs → new ones at DNS cutover so existing rankings transfer.

## 8. Pre-production (go-live) checklist

- [ ] **Domain** — buy (e.g. via Namecheap/Cloudflare), point DNS; also unlocks branded mail
- [ ] **Hosting** — Hetzner CX22 (~€4.5/mo) is plenty: Node + `next start` behind Caddy (auto-HTTPS), or Coolify for push-to-deploy. File store + uploads on disk work as-is; no Supabase Storage needed on a server (only needed if we go serverless)
- [ ] **Supabase switch (optional on Hetzner)** — file store is fine for one server; move to Supabase when we want managed backups/multi-instance. If switched: run schema.sql, set env vars, migrate db.json
- [ ] **Email go-live (one DNS session, ~15 min)** —
  - Verify the domain in Resend (SPF/DKIM records) — until then sends are sandbox-only (onboarding@resend.dev → owner's own address only)
  - Uncomment `LEAD_EMAIL_FROM=quotes@<domain>` in the server env (mailbox need not exist; display name "עץ הדומים" is added automatically from settings)
  - Create a free forwarding alias `info@<domain>` → owner's Gmail (Cloudflare Email Routing / registrar forwarding) and put **that** in /admin settings אימייל לפניות — so the Gmail is never exposed on the site or as reply-to (JSON-LD already omits email entirely as anti-harvesting)
  - `reply_to` is already wired: customer replies land in the owner's real inbox; replying to a lead-alert email opens a mail to the customer
- [ ] **Real contact details** in /admin settings: phone (old site showed 052-509-29-08), pro line, WhatsApp number, email (the forwarding alias above), address + precise nav coordinates (Waze/Google Maps buttons appear once set)
- [ ] **Telegram production switch** — register the real webhook (`setWebhook` with TELEGRAM_WEBHOOK_SECRET), retire scripts/telegram-poll.mjs, point the minute-cron at /api/cron/reminders with CRON_SECRET (drives reminders + morning digest + stuck-lead nags); admin IDs/digest hour/nag threshold/quote template all live in /admin/telegram
- [ ] **Secrets** — regenerate ADMIN_PASSWORD, set ADMIN_SESSION_SECRET, ADMIN_TOTP_SECRET (MFA), CRON_SECRET, TELEGRAM_WEBHOOK_SECRET; Anthropic spend cap in console
- [ ] **Media** — replace demo (Wikimedia) media with the real shoot (see §5 shoot list); keep attribution file until then
- [ ] **Analytics** — self-hosted Plausible/Umami; wire secretary visitor-stats tool to it
- [ ] **Backups + monitoring** — nightly db backup, uptime check on / and /api/chat
