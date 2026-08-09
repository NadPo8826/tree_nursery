import type { Metadata } from "next";
import { Frank_Ruhl_Libre, Heebo } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ChatWidget } from "@/components/ChatWidget";
import { AccessibilityWidget } from "@/components/AccessibilityWidget";
import { site } from "@/lib/site";
import { repo } from "@/lib/db";
import { isOnSale } from "@/lib/catalog";
import { safeJsonLd } from "@/lib/seo";

const frank = Frank_Ruhl_Libre({
  variable: "--font-frank",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700"],
});

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${site.name} — עצים בוגרים`,
    template: `%s · ${site.name}`,
  },
  description: site.tagline,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [settings, trees] = await Promise.all([
    repo.getSettings(),
    repo.getTrees(),
  ]);
  const hasSales = trees.some(isOnSale);
  // GardenStore schema — sitewide local-business signal for search engines
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "GardenStore",
    name: settings.siteName,
    telephone: settings.phone,
    // deliberately no email here — crawlable JSON-LD is prime spam-harvester
    // territory and the address adds nothing for local SEO
    description: settings.tagline,
    ...(settings.addressHe && {
      address: { "@type": "PostalAddress", streetAddress: settings.addressHe },
    }),
  };
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${frank.variable} ${heebo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />
        <SiteNav hasSales={hasSales} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <ChatWidget />
        <AccessibilityWidget />
      </body>
    </html>
  );
}
