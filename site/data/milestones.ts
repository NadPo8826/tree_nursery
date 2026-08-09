/** The story timeline on /about. Edited here, in code — not from /admin. */
export interface Milestone {
  id: string;
  yearHe: string;
  titleHe: string;
  textHe: string;
}

export const milestones: Milestone[] = [
  { id: "m1", yearHe: "1994", titleHe: "הנטיעה הראשונה", textHe: "השורה הראשונה נשתלה על אדמה שכולם אמרו שהיא קטנה מדי בשביל חלום גדול." },
  { id: "m2", yearHe: "2003", titleHe: "הזיתים הראשונים מגיעים", textHe: "התחלנו לקלוט זיתים עתיקים מחלקות שפונו — והבנו שזה הייעוד: לתת לעצים בית שני." },
  { id: "m3", yearHe: "2012", titleHe: "הדור השני נכנס לשורות", textHe: "הדור הבא חזר מלימודי האגרונומיה — עם רעיונות חדשים ואותה סבלנות." },
  { id: "m4", yearHe: "2020", titleHe: "שדרות שלמות, ערים שלמות", textHe: "מהגינה הפרטית לשדרה העירונית — צי מנופים, צוותי נטיעה, ואותם עצים מטופחים." },
  { id: "m5", yearHe: "היום", titleHe: "העצים מחכים לגינה הבאה", textHe: "ואנחנו עדיין הולכים בין השורות כל בוקר. בואו לבקר — נספר את השאר על קפה." },
];
