/** Site URL for sitemap/robots/JSON-LD. Warns loudly if unset in production. */
export function siteUrl(): string {
  const url = process.env.SITE_URL;
  if (url) return url.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "SITE_URL is not set — sitemap.xml/robots.txt are emitting localhost URLs. Set SITE_URL before going live.",
    );
  }
  return "http://localhost:4200";
}

/**
 * JSON.stringify for inline <script type="application/ld+json"> blocks.
 * '<' must be escaped or admin-entered text containing '</script>' would
 * break out of the tag and execute markup on every public page.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
