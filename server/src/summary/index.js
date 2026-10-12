// summary/index.js — תקציר מנהלים למכרז. פונקציה טהורה, דטרמיניסטית, בלי AI.
//
// עיקרון: התקציר הוא *הרכבה* של נתונים שכבר חולצו וחושבו — לא טקסט חדש. כל פרט נושא מקור
// (עמוד + ציטוט, מאותר בקוד מול טקסט המכרז), ומה שלא נמצא במכרז מופיע במפורש כ"לא זוהה" —
// לעולם לא ממלאים פער בניחוש. ההמלצה היא שער הכשירות המחושב, לא ניסוח של מודל.

import { parseDate } from '../qualification/index.js';
import { locate, prepare } from '../lib/sourceSpan.js';

const DAY = 86400000;

function daysLeft(dateStr, today) {
  const d = parseDate(dateStr);
  if (!d) return null;
  // ימים קלנדריים (12/10 → 01/11 = 20). parseDate מחזיר חצות UTC; משווים ליום של היום, לא לשעה.
  const t0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d.getTime() - t0) / DAY);
}

const GATE_TEXT = {
  PASS: 'מומלץ לגשת',
  CONDITIONAL: 'ניתן לגשת — בכפוף לראיות',
  HOLD: 'עצור — חסר מידע להכרעה',
  FAIL: 'לא מומלץ לגשת',
};

const STATUS_HE = {
  met_verified: 'עומד (מגובה במסמך)', met_claimed: 'עומד (מוצהר, ממתין לראיה)', not_met: 'לא עומד',
  unknown_company: 'חסר מידע על החברה', unknown_tender: 'לא מוגדר במכרז', needs_clarification: 'ממתין להבהרה',
};

// tender: רשומת המכרז (כולל raw_text). gate/checks/redFlags/sources: מתוך assess(). clar: מתוך clarificationsFor().
export function buildExecutiveSummary({ tender, gate, redFlags = { flags: [] }, sources = {}, clar = { items: [], window: {} }, today = new Date() }) {
  const ctx = prepare(tender.raw_text || '');
  const src = (value) => {
    if (!value) return null;
    const s = locate(value, ctx);
    return s.match === 'unresolved' ? null : { page: s.page, quote: s.quote, match: s.match };
  };
  const fact = (label, value, { note = null } = {}) => (value
    ? { label, value, found: true, source: src(value), note }
    : { label, value: null, found: false, note: note || 'לא זוהה במכרז — בדוק בחוברת' });

  // מועדים
  const subDays = daysLeft(tender.deadline, today);
  const qDays = daysLeft(tender.question_deadline, today);
  const left = (n) => (n === 0 ? 'היום — יום אחרון' : n === 1 ? 'מחר' : `בעוד ${n} ימים`);
  const dates = [
    fact('מועד הגשה', tender.deadline, { note: subDays == null ? null : subDays < 0 ? `חלף לפני ${-subDays} ימים` : left(subDays) }),
    fact('מועד אחרון לשאלות הבהרה', tender.question_deadline, { note: qDays == null ? null : qDays < 0 ? 'חלף — לא ניתן לשאול עוד' : left(qDays) }),
  ];

  // כסף, היקף ודרישות רישוי
  const money = [
    fact('ערבות', tender.guarantee),
    fact('מחזור כספי נדרש', tender.min_turnover),
    fact('סיווג קבלני נדרש', tender.classification, { note: tender.classification ? null : 'לא נדרש / לא זוהה' }),
    fact('משך ההתקשרות', tender.duration),
  ];

  // תנאי הסף — מה נדרש ואיפה החברה עומדת
  const thresholds = (gate.items || []).map((it) => ({
    label: it.label, status: it.status, status_he: STATUS_HE[it.status] || it.status,
    action: it.status === 'met_verified' ? null : it.action || null,
    source: it.source && it.source.match !== 'unresolved' ? it.source : null,
  }));
  const tcount = (st) => thresholds.filter((t) => t.status === st).length;

  // סיכונים: דגלים אדומים לפי חומרה
  const order = { high: 0, medium: 1, low: 2 };
  const risks = [...(redFlags.flags || [])].sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3))
    .slice(0, 5).map((f) => ({ label: f.label, severity: f.severity, detail: f.detail, action: f.action || null }));

  // מה לעשות עכשיו — פעולות מעשיות, בסדר דחיפות
  const items = clar.items || [];
  const internalOpen = items.filter((i) => i.target === 'internal' && i.trigger === 'missing_fact').length;
  const evidenceOpen = items.filter((i) => i.target === 'internal' && i.trigger === 'missing_evidence').length;
  const issuerOpen = items.filter((i) => i.target === 'issuer' && ['SUGGESTED', 'DRAFT', 'APPROVED'].includes(i.state)).length;
  const unresolved = (sources.total || 0) - (sources.located || 0);
  const actions = [];
  if (tcount('not_met')) actions.push(`${tcount('not_met')} תנאי-סף לא מתקיימים — לבדוק אם ניתן להשלים (שותף / קבלן משנה / מסמך) לפני מועד ההגשה, אחרת לא לגשת.`);
  if (issuerOpen) actions.push(`${issuerOpen} שאלות הבהרה לעורך המכרז ממתינות${qDays != null && qDays >= 0 ? ` — עד ${tender.question_deadline} (${qDays} ימים)` : ''}.`);
  if (internalOpen) actions.push(`${internalOpen} שאלות פתוחות לחברה — לענות בטאב "הבהרות".`);
  if (evidenceOpen) actions.push(`${evidenceOpen} תנאים מוצהרים ללא מסמך — לקשר אישורים בטאב "תנאי סף".`);
  if (unresolved > 0) actions.push(`${unresolved} דרישות שחולצו לא אותרו בטקסט המכרז — לאמת מול החוברת.`);
  if (risks.some((r) => r.severity === 'high')) actions.push('יש דגלים אדומים בחומרה גבוהה — לקרוא לפני החלטה.');

  const missing = [...dates, ...money].filter((f) => !f.found && !/לא נדרש/.test(f.note || '')).map((f) => f.label);

  return {
    title: { name: tender.name, code: tender.code, issuer: tender.issuer },
    bottom_line: {
      gate: gate.status, text: GATE_TEXT[gate.status] || gate.status, reason: gate.reason,
      counts: { total: thresholds.length, met_verified: tcount('met_verified'), met_claimed: tcount('met_claimed'),
        not_met: tcount('not_met'), unknown: tcount('unknown_company') + tcount('unknown_tender') + tcount('needs_clarification') },
    },
    dates, money, thresholds, risks, actions,
    coverage: { requirements_total: sources.total || 0, located: sources.located || 0, missing_fields: missing },
    generated_at: today.toISOString(),
    disclaimer: 'תקציר שהורכב אוטומטית מנתוני המכרז שחולצו. אינו חוות דעת משפטית; יש לאמת מול מסמכי המכרז הרשמיים.',
  };
}
