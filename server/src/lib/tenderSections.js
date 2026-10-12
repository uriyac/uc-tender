// tenderSections.js — קריאת מכרז לפי מבנה הסעיפים הממוספרים (2 / 2.3 / 2.3.1 / 2.3.1.1). דטרמיניסטי.
//
// למה: מכרז ממשלתי בנוי פרקים. תנאי הסף יושבים בפרק אחד ("2. תנאי הסף"), מחולקים לקבוצות
// (מנהליים / פיננסיים / מקצועיים למציע / איש מפתח / מנהל צוות), ובכל קבוצה סעיפים ממוספרים.
// איסוף שורות לפי מילות-מפתח ("נדרש", "ניסיון") תופס שורות רקע, הוראות הגשה ושברי משפטים —
// ומפספס את התנאים עצמם. כאן קוראים את הפרק כמו אדם: סעיף = דרישה אחת שלמה, עם תתי-הסעיפים שלו.

// טקסט PDF מגיע עם טאבים בין רצפי-טקסט ("חבר\tת") — מאחדים לרווח.
export const normalizeText = (s) => String(s || '').replace(/\t/g, ' ').replace(/[  ]{2,}/g, ' ');

const CLAUSE = /^\s*(\d{1,2}(?:\s*\.\s*\d{1,2}){0,4})\s*\.?\s+(\S.*)$/;
const PAGE_MARK = /^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/;
const THRESHOLD_HEAD = /תנאי(?:ם)?\s*(?:ה)?סף|תנאים\s*מוקדמים|תנאי(?:ם)?\s*(?:ה)?השתתפות|תנאים\s*להשתתפות/;
const NOT_REQ_GROUP = /הגדרות|הבהרות|כללי(?:ות)?\s*:?\s*$/;

const numOf = (raw) => raw.replace(/\s+/g, '');
const depth = (n) => n.split('.').length;
const words = (s) => String(s).trim().split(/\s+/).length;

// מפרק את הטקסט לסעיפים: { num, title, text, offset }. שורת-המשך מצטרפת לסעיף שלפניה.
export function clauses(raw) {
  const text = normalizeText(raw);
  const out = [];
  let pos = 0, cur = null;
  for (const line of text.split('\n')) {
    const m = line.match(CLAUSE);
    if (m && !PAGE_MARK.test(line)) {
      const num = numOf(m[1]);
      // "3 . <משפט ארוך>" בתוך רשימה = פריט רשימה, לא כותרת פרק → המשך הסעיף הנוכחי
      const isTopLevelNoise = depth(num) === 1 && words(m[2]) > 7 && cur;
      if (!isTopLevelNoise) {
        cur = { num, title: m[2].trim(), text: m[2].trim(), offset: pos };
        out.push(cur);
        pos += line.length + 1;
        continue;
      }
    }
    if (cur && line.trim() && !PAGE_MARK.test(line) && !/^\s*\d{1,3}\s*$/.test(line)) cur.text += ' ' + line.trim();
    pos += line.length + 1;
  }
  return out;
}

const clean = (s) => String(s || '').replace(/\s+/g, ' ').replace(/\s+([.,:;)])/g, '$1').trim();

// קטגוריה מתוך כותרת הקבוצה ("2.4 תנאי סף מקצועיים לאיש המפתח")
function categoryOf(title) {
  const t = String(title);
  if (/מנהל(?:י)?\s*(?:ה)?צוות/.test(t)) return 'מנהל הצוות';
  if (/איש\s*(?:ה)?מפתח|אנשי\s*מפתח/.test(t)) return 'איש המפתח';
  if (/פיננס|כספ/.test(t)) return 'פיננסי';
  if (/מנהל(?:י|יים)/.test(t)) return 'מנהלי';
  if (/מקצוע|ניסיון/.test(t)) return 'ניסיון מקצועי';
  if (/איכות|ניקוד/.test(t)) return 'איכות';
  return 'תנאי סף';
}

// הטקסט שעליו מריצים בדיקות-סף (מחזור/סיווג/שנים/עובדים מוסמכים). כשיש פרק תנאי-סף מובנה — רק הוא.
// אחרת, ביטוי כמו "רו"ח" בטופס חתימה או "מחזור 100 מיליון" בהגדרת "עסק בשליטת אישה" (עמ' 55)
// הופכים לתנאי-סף מומצא — ואפילו ל"לא עומד" שגוי. בלי פרק מזוהה — כל הטקסט (כמו קודם).
export function thresholdScope(raw) {
  const s = extractThresholdSection(raw);
  return s.found ? s.requirements.map((r) => r.text).join('\n') : String(raw || '');
}

// מאתר את פרק תנאי הסף ומחזיר דרישות: סעיף-עלה או סעיף עם תתי-סעיפים = דרישה אחת.
export function extractThresholdSection(raw) {
  const cl = clauses(raw);
  const head = cl.find((c) => depth(c.num) === 1 && words(c.title) <= 6 && THRESHOLD_HEAD.test(c.title));
  if (!head) return { found: false, requirements: [] };
  const n = head.num;
  const start = cl.indexOf(head);
  const inSec = [];
  for (let i = start + 1; i < cl.length; i++) {
    const c = cl[i];
    if (depth(c.num) === 1 && c.num !== n && words(c.title) <= 6) break;   // פרק הבא
    if (c.num.startsWith(n + '.')) inSec.push(c);
  }
  const children = (num) => inSec.filter((c) => c.num.startsWith(num + '.') && depth(c.num) === depth(num) + 1);
  const reqs = [];
  for (const g of inSec.filter((c) => depth(c.num) === 2)) {
    if (NOT_REQ_GROUP.test(g.title)) continue;                              // הגדרות והבהרות — לא דרישה
    const kids = children(g.num);
    if (!kids.length) {                                                      // סעיף בודד (למשל "2.6 ניקוד איכות 75")
      reqs.push({ text: clean(`${g.num} ${g.text}`), category: categoryOf(g.title), mandatory: true, clause: g.num });
      continue;
    }
    const cat = categoryOf(g.title);
    for (const k of kids) {
      const sub = children(k.num);
      const body = sub.length ? `${k.text} ${sub.map((s) => `(${s.num.split('.').pop()}) ${s.text}`).join(' ')}` : k.text;
      reqs.push({ text: clean(`${k.num} ${body}`), category: cat, mandatory: true, clause: k.num, group: clean(g.title.replace(/[:：]\s*$/, '')) });
    }
  }
  return { found: reqs.length > 0, requirements: reqs, section: { num: n, title: clean(head.title) } };
}
