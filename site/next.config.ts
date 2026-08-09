import type { NextConfig } from "next";

const securityHeaders = [
  // No embedding in iframes — blocks clickjacking on /admin and the forms
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The site needs none of these browser APIs — deny them wholesale
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
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
