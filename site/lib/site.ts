/**
 * Static fallback metadata only (used for <head> defaults before settings
 * load). All contact details — phone, WhatsApp, email — live in the admin
 * settings (repo.getSettings()) and must never be read from here.
 */
export const site = {
  name: "עץ הדומים",
  tagline: "עצים בוגרים — שלושים שנה של סבלנות, עץ אחר עץ.",
  foundedYear: 1994,
} as const;

/** WhatsApp deep link. `number` comes from admin settings (settings.whatsapp), international format without plus. */
export function whatsappLink(number: string, prefill: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(prefill)}`;
}

/**
 * Navigation deep links from admin settings: precise "lat,lng" coords when
 * set (rural roads rarely geocode well), otherwise the address text.
 * Both return null when nothing is configured — callers hide the UI.
 */
export function wazeLink(addressHe: string, navCoords: string): string | null {
  const coords = navCoords.trim();
  if (coords) return `https://waze.com/ul?ll=${encodeURIComponent(coords)}&navigate=yes`;
  if (addressHe.trim()) {
    return `https://waze.com/ul?q=${encodeURIComponent(addressHe)}&navigate=yes`;
  }
  return null;
}

export function googleMapsLink(addressHe: string, navCoords: string): string | null {
  const destination = navCoords.trim() || addressHe.trim();
  if (!destination) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
