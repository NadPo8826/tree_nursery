import type { NextConfig } from "next";

const securityHeaders = [
  // No embedding in iframes — blocks clickjacking on /admin and the forms
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The site needs none of these browser APIs — deny them wholesale
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
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
