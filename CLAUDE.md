# Project instructions — Tree Nursery Website

Working style and engineering standards for this project. These apply to every task here.

## How to work with me

- **Challenge my assumptions — don't just agree.** When I propose something, evaluate it first. If there's a weakness, a simpler path, or a hidden cost, say so directly *before* implementing. Push back with a concrete reason and an alternative; then, if I still choose my way, build it well. A response that starts with agreement should have earned it.
- When a request is ambiguous, state the interpretation you chose and why, rather than silently picking one.
- Prefer showing a working result over describing what could be done.

## Engineering standards

- **Mobile-first, always.** Design and implement for a 375px phone screen first, then scale up. Most nursery customers arrive from a phone. Every new page/component must be checked at mobile width before it's considered done. Touch targets ≥44px, no horizontal scroll, sticky action bar patterns on mobile.
  - **Interactions must show their result inside the mobile viewport.** If a tap changes content that renders elsewhere on the page (e.g., a map pin updating a story panel below the fold), either place the result adjacent to the control on mobile or scroll it into view — a state change the user can't see is a bug. Walk through every interactive flow at 375px and verify the feedback is visible.
- **Secure by default.** All secrets server-side only (API keys never reach the client). Validate and sanitize every input at the API boundary (forms, chat, admin). Rate-limit public endpoints, honeypot public forms, protect /admin with real auth, use parameterized queries only, and apply spend caps on external APIs (Claude). When touching auth, payments, or user data — flag security considerations explicitly.
- **Best-known methods (BKMs).** Follow the framework's current official guidance — for Next.js, read the bundled docs in `site/node_modules/next/dist/docs/` before using an API that may have changed. Accessibility (contrast, keyboard nav, aria), Core Web Vitals, and SEO basics are requirements, not nice-to-haves.
- **Code reuse over duplication.** Before writing a new component/util, check `site/components/` and `site/lib/` for an existing one. Shared UI patterns (buttons, cards, gateways, section heads, curves) live as components with props — never copy-pasted variants. Data shapes are defined once in `site/lib/types.ts` and imported everywhere.
- **Ease of use — for both audiences.** Visitors: one clear next step per screen, three-field forms max, plain Hebrew (no jargon). The owner: everything they need to change must be editable from /admin without touching code; if a new feature hardcodes content, that's a bug.
- **Modern, distinctive look.** Follow the approved "Nature Distilled" design system (tokens in `site/app/globals.css` — cream/sand/soil grounds, clay/gold accents, organic pebble radii, grain, horizon curves). Never regress to generic template aesthetics (glassmorphism, purple gradients, emoji icons, cookie-cutter cards). New UI must look like it belongs to this site.

## Project context

- Site: Hebrew, RTL, trust-first (earn interest before selling — see project memory).
- App code: `site/` (Next.js 16, TS, Tailwind 4). Plan and decisions: `PLAN.md`.
- Dev server: run on a port the user asks for (historically 4200; never 3000/3001).
