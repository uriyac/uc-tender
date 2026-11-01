// ocr-limits.js — תקרת עמודים, תקציב זמן, וניסוח האזהרה כשעמודים לא עברו OCR.
// טהור (בלי pdf/tesseract) כדי שהבדיקות וה-worker יחלקו אותה לוגיקה.

// מודל ה-fast ותקרת 15 העמודים / 120 השניות לא מכסים מכרז סרוק ארוך (89 עמודים ב-CHANGELOG).
// ברירת המחדל מכסה אותו ועדיין עוצרת PDF פתולוגי. 0 ב-OCR_MAX_PAGES = בלי תקרה.
export const DEFAULT_MAX_PAGES = 200;

// נמדד על עמוד עברי צפוף עם המודל השלם (best_int), קנה-מידה 2: ≈2 שניות לעמוד.
// 8 שניות משאירות מרווח לסריקה רועשת ולמכונה איטית. 120 השניות הישנות היו הורגות
// מכרז של 89 עמודים באמצע — ומאבדות את כל הטקסט, לא רק את הזנב.
const PER_PAGE_MS = 8000;
const TIMEOUT_FLOOR_MS = 3 * 60 * 1000;
const TIMEOUT_CEILING_MS = 20 * 60 * 1000;

export function resolveMaxPages(raw = process.env.OCR_MAX_PAGES) {
  if (raw == null || String(raw).trim() === '') return DEFAULT_MAX_PAGES;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_MAX_PAGES;
  if (n === 0) return Infinity; // בלי תקרה — עוצרים רק לפי זמן
  return Math.max(1, Math.floor(n));
}

// timeoutMs מפורש (ארגומנט או OCR_TIMEOUT_MS) גובר. אחרת לפי תקרת העמודים.
export function resolveTimeoutMs(maxPages, override = process.env.OCR_TIMEOUT_MS) {
  if (override != null && String(override).trim() !== '') {
    const n = Number(override);
    if (Number.isFinite(n) && n >= 1000) return Math.floor(n);
  }
  const pages = Number.isFinite(maxPages) ? maxPages : DEFAULT_MAX_PAGES;
  return Math.min(TIMEOUT_CEILING_MS, Math.max(TIMEOUT_FLOOR_MS, pages * PER_PAGE_MS));
}

// כמה מילישניות משאירים לתהליך-האב אחרי שה-worker מפסיק בעצמו ומחזיר JSON.
export const TIMEOUT_SLACK_MS = 20000;

export function workerBudgetMs(timeoutMs) {
  return Math.max(15000, timeoutMs - TIMEOUT_SLACK_MS);
}

export function pageMarker(index, total) {
  return `-- ${index} of ${total} --`;
}

// אזהרה למשתמש כשלא כל העמודים עברו OCR. null אם הכיסוי מלא.
export function truncationWarning(processed, total) {
  const got = Number(processed) || 0;
  const all = Number(total) || 0;
  if (!all || got >= all) return null;
  return `זוהו ${all} עמודים, אך רק ${got} עברו OCR. שאר המסמך לא נותח — מומלץ לבדוק את המקור לפני שמסתמכים על הניתוח.`;
}
