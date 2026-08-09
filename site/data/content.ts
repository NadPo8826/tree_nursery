/**
 * Fixed site copy — homepage hero, manifesto, seasons, closing.
 * Owned by the code (edited here, redeployed), not by /admin: these texts
 * are part of the site's voice and rarely change.
 */
export const siteContent = {
  hero_title: "יש דברים שאי אפשר לזרז.\nעץ הוא אחד מהם.",
  hero_sub: "שלושים שנה אנחנו מגדלים עצים בוגרים בעמק — לאט, בסבלנות, עץ אחר עץ.",
  manifesto:
    "עץ בוגר הוא לא מוצר מדף. הוא סיפור חיים: שנים של גיזום נכון, השקיה מדויקת והרבה סבלנות. כשאתם נוטעים בגינה עץ מהמשתלה שלנו, אתם נוטעים גם את השנים שהשקענו בו.",
  manifesto_sig: "— דור שני של משפחה אחת, מאז 1994",
  close_title: "הדרך הכי טובה להכיר אותנו — לבקר",
  close_sub:
    "המשתלה פתוחה למבקרים בתיאום מראש. מחכים לכם קפה, סיור בין השורות ותשובות לכל שאלה — בלי לחץ ובלי התחייבות.",
  season_winter: "שתילות, גיזום מעצב, והגשם עושה את שלו.",
  season_spring: "לבלוב ופריחה. השורות מתמלאות צבע.",
  season_summer: "השקיה מדויקת, צל עמוק בין השורות.",
  season_autumn: "עונת ההעתקות — עצים יוצאים לדרך חדשה.",
} as const;

export type SiteContentKey = keyof typeof siteContent;
