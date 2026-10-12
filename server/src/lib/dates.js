// dates.js — ימים עד מועד ההגשה, מחושב בכל קריאה (לא נשמר).
// היה: daysUntil נשמר פעם אחת בעת ההעלאה, עם new Date() שלא מבין "18.05.2026" → ברירת מחדל 14.
// כך מכרז שהועלה לפני חודש הוצג "14 ימים" ומוין כדחוף/לא-דחוף לפי ערך קפוא.

import { parseDate } from '../qualification/index.js';

const DAY = 86400000;

// ימים קלנדריים עד התאריך (שלילי = עבר). תאריך לא מזוהה → null (מוצג "—", לא ניחוש).
export function daysUntil(dateStr, today = new Date()) {
  const d = parseDate(dateStr);
  if (!d) return null;
  const t0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d.getTime() - t0) / DAY);
}

// מכרז עם days חי. מועד שעבר → null בשדה days (לא "דחוף"), והמצב נשמר ב-deadline_passed.
export function withLiveDays(t, today = new Date()) {
  if (!t || !t.deadline) return t;
  const d = daysUntil(t.deadline, today);
  if (d == null) return t;
  return { ...t, days: d >= 0 ? d : null, deadline_passed: d < 0 };
}
