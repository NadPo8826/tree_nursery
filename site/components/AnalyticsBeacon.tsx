"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Reports one pageview per route change to the first-party /api/track. */
export function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const body = JSON.stringify({ path: pathname });
    // sendBeacon survives navigation; fetch keepalive is the fallback
    if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  }, [pathname]);

  return null;
}
