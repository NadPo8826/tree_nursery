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
