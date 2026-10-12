// summary/index.js — תקציר מכרז למנהל המכרזים. פונקציה טהורה, דטרמיניסטית, בלי AI.
//
// מטרה (החלטת מוצר 2026-10-12): להכיר את המכרז ולהבין אם זה הכיוון — *לא* להכריע אם החברה מתאימה.
// לכן אין כאן שער כשירות, סטטוס עמידה או המלצה. רק מה שהמכרז אומר: על מה, כמה, איך בוחרים,
// מתי, מה נדרש מהמציע ומה הסיכונים. ההתאמה לחברה נשארת בטאבים "תנאי סף" / "דרישות ופערים".
//
// כל פרט הוא ציטוט מהמכרז (שורה מקוצרת) עם מקור (עמוד), מאותר בקוד. מה שלא נמצא → "לא זוהה במכרז".
// לעולם לא ממלאים פער בניחוש.

import { parseDate } from '../qualification/index.js';
import { locate, prepare } from '../lib/sourceSpan.js';

const DAY = 86400000;
const MONEY = '(?:₪\\s*)?\\d[\\d,.]*\\s*(?:מיליון|מליון|אלף|מיליארד)?\\s*(?:₪|ש"?ח|שקלים|ש״ח)?';
const DATE = '\\d{1,2}[./]\\d{1,2}[./]\\d{2,4}';

function daysLeft(dateStr, today) {
  const d = parseDate(dateStr);
  if (!d) return null;
  // ימים קלנדריים (12/10 → 01/11 = 20). parseDate מחזיר חצות UTC; משווים ליום של היום, לא לשעה.
  const t0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d.getTime() - t0) / DAY);
}
const left = (n) => (n == null ? null : n < 0 ? `חלף לפני ${-n} ימים` : n === 0 ? 'היום — יום אחרון' : n === 1 ? 'מחר' : `בעוד ${n} ימים`);

const clip = (s, n = 140) => { const t = String(s || '').replace(/[*#|]/g, ' ').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

// השורה הראשונה במכרז שמתאימה לביטוי — מוחזרת כציטוט (לא מפורשת מחדש).
function lineMatching(text, re) {
  for (const line of String(text || '').split('\n')) if (re.test(line)) return line.trim();
  return null;
}

// חילוץ פרטי מכרז שאינם בפענוח הבסיסי. כל ערך = ציטוט שורה מהמכרז.
export function tenderFacts(raw = '') {
  const t = String(raw || '');
  const conf = lineMatching(t, /כנס\s*(?:מציעים|ספקים)|סיור\s*(?:קבלנים|מציעים|ספקים)|מפגש\s*מציעים/);
  const confDate = conf && (conf.match(new RegExp(DATE)) || [])[0];
  // שיטת בחירה: משקלות איכות/מחיר, או "המחיר הנמוך ביותר"
  const wQ = t.match(/(\d{1,3})\s*%\s*(?:ל)?איכות|איכות[^\n%]{0,20}?(\d{1,3})\s*%/);
  const wP = t.match(/(\d{1,3})\s*%\s*(?:ל)?מחיר|מחיר[^\n%]{0,20}?(\d{1,3})\s*%/);
  const priceOnly = lineMatching(t, /(?:ההצעה|המחיר)\s+(?:הזולה|הנמוכ[הא])\s*(?:ביותר)?|מחיר בלבד/);
  let evaluation = null;
  if (wQ || wP) {
    const q = wQ ? +(wQ[1] || wQ[2]) : null, p = wP ? +(wP[1] || wP[2]) : null;
    evaluation = { value: [q != null ? `איכות ${q}%` : null, p != null ? `מחיר ${p}%` : null].filter(Boolean).join(' · '), quote: lineMatching(t, /%\s*(?:ל)?(?:איכות|מחיר)|(?:איכות|מחיר)[^\n%]{0,20}\d{1,3}\s*%/) };
  } else if (priceOnly) evaluation = { value: 'מחיר בלבד (ההצעה הזולה)', quote: priceOnly };

  return {
    estimate: lineMatching(t, new RegExp(`(?:אומדן|היקף כספי|שווי (?:ההתקשרות|החוזה)|תקציב(?: המכרז)?)[^\\n]{0,50}?${MONEY}`)),
    options: lineMatching(t, /אופצי(?:ה|ות)\s*(?:להארכ|לחידוש|נוספ)|הארכת (?:ההתקשרות|תקופת)/),
    winners: lineMatching(t, /זוכה (?:אחד|יחיד)|\d+\s*זוכים|מספר (?:ה)?זוכים|ספקים זוכים/),
    evaluation,
    conference: conf ? { quote: conf, date: confDate || null, mandatory: /חובה|חובת השתתפות|תנאי (?:סף|להגשה)/.test(conf) } : null,
    insurance: lineMatching(t, /ביטוח/),
    penalties: lineMatching(t, /פיצוי(?:ים)? מוסכם|קנס/),
    payment: lineMatching(t, /שוטף\s*\+\s*\d+|תנאי תשלום|ימי אשראי/),
  };
}

// tender: רשומת המכרז (כולל raw_text). requirements: דרישות המכרז. redFlags: מתוך assess().
export function buildExecutiveSummary({ tender, requirements = [], redFlags = { flags: [] }, sources = {}, today = new Date() }) {
  const raw = tender.raw_text || '';
  const ctx = prepare(raw);
  const src = (value) => {
    if (!value) return null;
    const s = locate(value, ctx);
    return s.match === 'unresolved' ? null : { page: s.page, quote: s.quote, match: s.match };
  };
  const fact = (label, value, { note = null, absent = 'לא זוהה במכרז — בדוק בחוברת', alert = false } = {}) => (value
    ? { label, value: clip(value), found: true, source: src(value), note, alert }
    : { label, value: null, found: false, note: absent });
  const f = tenderFacts(raw);

  // 1. על מה המכרז
  const about = [
    fact('גוף מפרסם', tender.issuer && tender.issuer !== 'גורם מפרסם' ? tender.issuer : null),
    fact('אומדן / היקף כספי', f.estimate, { absent: 'לא פורסם אומדן במכרז' }),
    fact('משך ההתקשרות', tender.duration),
    fact('אופציות הארכה', f.options, { absent: 'לא זוהו אופציות' }),
  ];

  // 2. איך בוחרים זוכה
  const selection = [
    fact('שיטת הבחירה', f.evaluation?.value || null, { absent: 'לא זוהתה שיטת ניקוד — בדוק בחוברת' }),
    fact('מספר זוכים', f.winners),
  ];
  if (f.evaluation?.quote) selection[0].source = src(f.evaluation.quote);

  // 3. מועדים — כנס מציעים חובה בראש: מי שמפספס אותו נפסל
  const confDays = f.conference?.date ? daysLeft(f.conference.date, today) : null;
  const dates = [
    ...(f.conference ? [{ ...fact(f.conference.mandatory ? 'כנס מציעים — חובה' : 'כנס מציעים', f.conference.quote,
      { note: left(confDays), alert: f.conference.mandatory }) }] : []),
    fact('מועד אחרון לשאלות הבהרה', tender.question_deadline, { note: left(daysLeft(tender.question_deadline, today)) }),
    fact('מועד הגשה', tender.deadline, { note: left(daysLeft(tender.deadline, today)) }),
  ];

  // 4. מה נדרש מהמציע — כפי שהמכרז מנסח, בלי בדיקת עמידה
  const mandatory = requirements.filter((r) => r.mandatory);
  const conditions = mandatory.map((r) => ({ text: clip(r.text, 200), category: r.category || null, source: src(r.text) }));
  const byCat = {};
  for (const r of requirements) byCat[r.category || 'כללי'] = (byCat[r.category || 'כללי'] || 0) + 1;
  const costs = [
    fact('ערבות', tender.guarantee),
    fact('ביטוח', f.insurance, { absent: 'לא זוהתה דרישת ביטוח' }),
    fact('סיווג קבלני נדרש', tender.classification, { absent: 'לא נדרש / לא זוהה' }),
    fact('מחזור כספי נדרש', tender.min_turnover, { absent: 'לא זוהה' }),
  ];

  // 5. תנאים מסחריים וסיכונים
  const order = { high: 0, medium: 1, low: 2 };
  const terms = [
    fact('קנסות / פיצוי מוסכם', f.penalties, { absent: 'לא זוהו' }),
    fact('תנאי תשלום', f.payment, { absent: 'לא זוהו' }),
  ];
  // "לתשומת לב" — רק מה שעוד לא מופיע בתקציר (ערבות/ביטוח/קנסות כבר מוצגים כציטוט עם מקור)
  const shown = /ערבות|ביטוח|קנס|פיצוי מוסכם/;
  const watch = [...(redFlags.flags || [])].filter((x) => !shown.test(x.label)).sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3))
    .slice(0, 5).map((x) => ({ label: x.label, severity: x.severity, detail: x.detail }));

  const all = [...about, ...selection, ...dates, ...costs, ...terms];
  // תנאי הסף מקובצים לפי נושא (מנהלי / פיננסי / ניסיון / איש מפתח / מנהל צוות / איכות)
  const groups = [];
  for (const c of conditions) {
    let g = groups.find((x) => x.category === (c.category || 'תנאי סף'));
    if (!g) groups.push(g = { category: c.category || 'תנאי סף', items: [] });
    g.items.push(c);
  }
  return {
    title: { name: tender.name, code: tender.code, issuer: tender.issuer },
    about, selection, dates, costs, terms, conditions, condition_groups: groups, watch,
    missing: all.filter((x) => !x.found && !/לא נדרש/.test(x.note || '')).map((x) => x.label), // לתצוגה מרוכזת
    requirements: { total: requirements.length, mandatory: mandatory.length, by_category: byCat },
    coverage: { found: all.filter((x) => x.found).length, total: all.length,
      requirements_located: sources.located || 0, requirements_total: sources.total || 0 },
    generated_at: today.toISOString(),
    disclaimer: 'התקציר מציג את מה שכתוב במכרז, כציטוטים מהמסמך. הוא אינו בודק אם החברה עומדת בתנאים ואינו חוות דעת משפטית — יש לאמת מול מסמכי המכרז הרשמיים.',
  };
}
