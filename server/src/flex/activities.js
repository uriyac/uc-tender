// activities.js — גמישות מכרזית 2.0 (מסמך האב §29.1, §28.4): פרויקט → פעילויות → מי ביצע.
//
// פרויקט אינו תגית אחת. הוא מכיל פעילויות שבוצעו בפועל ("ניתוח נתוני סקר", "ניהול ספקי מדיה").
// לכל פעילות נשמר performed_by — כי מסמך שמוכיח שפרויקט התקיים אינו מוכיח שהמציע ביצע כל חלק בו.
//
// כלל הליבה: רק פעילות שבוצעה ע"י החברה עצמה ('company') נחשבת ניסיון המציע.
//   employee      — ניסיון של עובד; נחשב רק אם המכרז מתיר ניסיון צוות (בדיקה ידנית).
//   subcontractor — בוצע ע"י קבלן משנה; אינו ניסיון המציע בלי הוראה מפורשת במכרז.
//   partner       — שותף; כנ"ל.
//   unknown       — לא ידוע מי ביצע (ברירת מחדל לחילוץ AI). לא נחשב עד שאדם קובע.
// פעילות שאינה של החברה לעולם לא נכנסת לטיוטה — היא מוצגת למשתמש כ"רלוונטית אך לא נחשבת".

export const PERFORMERS = {
  company: 'החברה (המציע)',
  employee: 'עובד',
  subcontractor: 'קבלן משנה',
  partner: 'שותף',
  unknown: 'לא ידוע',
};

export const isPerformer = (p) => Object.prototype.hasOwnProperty.call(PERFORMERS, p);
export const countsAsBidder = (a) => !!a && a.performed_by === 'company';

// נרמול פעילות שהגיעה מחילוץ/מהמשתמש. performed_by לא מוכר → unknown (לא מניחים "החברה").
export function cleanActivity(a, id) {
  if (!a || typeof a !== 'object') return null;
  const text = String(a.text || '').trim();
  if (!text) return null;
  return {
    id: a.id || id,
    text: text.slice(0, 200),
    performed_by: isPerformer(a.performed_by) ? a.performed_by : 'unknown',
    quote: a.quote ? String(a.quote).slice(0, 300) : null,
  };
}

// מערך פעילויות → מנורמל, עם מזהים. store אופציונלי (uid); בלעדיו מזהה מקומי.
export function cleanActivities(list, store) {
  if (!Array.isArray(list)) return [];
  const mk = () => (store && store.uid ? store.uid('act') : `act_${Math.random().toString(36).slice(2, 9)}`);
  return list.map((a) => cleanActivity(a, a && a.id ? a.id : mk())).filter(Boolean).slice(0, 30);
}

// ידע לטענות (התאמה/מיפוי/טיוטה): פעילויות של החברה מצטרפות לממדי הפרויקט — ורק הן.
// כך שני המנועים וה-guardrail (שבודק שכל עובדה בטיוטה מגיעה מהממדים הממופים) עובדים כרגיל,
// ופעילות של קבלן משנה פשוט אינה חומר גלם לטענה.
export function kbForClaims(kb = {}) {
  return {
    ...kb,
    projects: (kb.projects || []).map((p) => {
      const own = (p.activities || []).filter(countsAsBidder).map((a) => a.text);
      return own.length ? { ...p, dimensions: [...new Set([...(p.dimensions || []), ...own])] } : p;
    }),
  };
}
