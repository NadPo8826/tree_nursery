import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Every asset on this site is same-origin (self-hosted fonts, local photos,
 * no third-party embeds), so the CSP can be tight. 'unsafe-inline' for
 * scripts/styles is the documented non-nonce trade-off that keeps static
 * generation + ISR working (nonces force full dynamic rendering).
 * Dev additions per the Next docs: 'unsafe-eval' (React error overlay) and
 * ws: (HMR websocket). NO upgrade-insecure-requests — the owner serves
 * plain http on the nursery LAN, and it would break every subresource there.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // No embedding in iframes — blocks clickjacking on /admin and the forms
  // (kept alongside CSP frame-ancestors for older browsers)
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The site needs none of these browser APIs — deny them wholesale
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Browsers ignore HSTS over plain http, so this is inert on the LAN and
  // activates automatically once the site sits behind real HTTPS.
  // Deliberately no includeSubDomains: the owner's domain may carry legacy
  // subdomains we don't control.
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

/**
 * 301 map from the old domimtree.com URLs — becomes active the day the
 * domain points at this site, so existing Google rankings transfer.
 * Category targets assume the current admin category names; adjust if
 * the owner renames categories before cutover.
 */
const oldSiteRedirects = [
  { source: "/maturetrees", destination: "/catalog" },
  { source: "/gallery", destination: "/catalog" },
  { source: "/citrustrees1", destination: `/catalog/${encodeURIComponent("עצי-פרי-והדר")}` },
  { source: "/fruit-trees", destination: `/catalog/${encodeURIComponent("עצי-פרי-והדר")}` },
  { source: "/olive-trees", destination: `/catalog/${encodeURIComponent("עצי-זית")}` },
  { source: "/olive-tree", destination: `/catalog/${encodeURIComponent("דיירים-ותיקים")}` },
  { source: "/ornamental-trees", destination: `/catalog/${encodeURIComponent("עצי-נוי")}` },
  { source: "/tropicaltrees", destination: "/catalog" },
  { source: "/decoratedolivetree", destination: "/catalog" },
  { source: "/specialsalespromotions", destination: "/sales" },
  { source: "/service", destination: "/process" },
  { source: "/gardenrenovation", destination: "/process" },
  { source: "/contact", destination: "/visit" },
  { source: "/ourblog", destination: "/guides" },
].map((r) => ({ ...r, permanent: true }));

const nextConfig: NextConfig = {
  redirects: async () => oldSiteRedirects,
  headers: async () => [
    { source: "/:path*", headers: securityHeaders },
    // Admin pages must never land in any cache shared with other users
    {
      source: "/admin/:path*",
      headers: [
        ...securityHeaders,
        { key: "Cache-Control", value: "no-store" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ],
    },
  ],
};

export default nextConfig;
