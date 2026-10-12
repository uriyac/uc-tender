// stub/index.js — מימוש דטרמיניסטי ללא מפתח.
// כל פונקציה מחזירה נתונים אמיתיים-בצורתם. בשלבים 1-3 ההיוריסטיקות כאן יתעמקו.
// ה-Guardrail (אפס-הזיות) נאכף כאן במבנה, כדי ש-Claude יירש אותו בשלב 5.

import { parseMoney, formatMoney, requiredTurnover, compareClassification } from '../../qualification/index.js';

// --- חפיפת מילות-מפתח עם נרמול עברי (בלי מפתח, דטרמיניסטי) ---
// נרמול: הסרת ניקוד/גרשיים, סופיות→רגילות, והסרת עד 2 תחיליות (ב/ל/ו/ה/מ/ש/כ).
// מילון נרדפות לתחום: מקבץ מונחים שקולים (ביוב↔שפכים, בקרה↔ניטור↔SCADA).
// מילות-סתם (boilerplate) מסוננות כדי למנוע התאמות-שווא.
const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const PREFIX = 'בלוהמשכ';
const STOP = new Set([
  'של', 'על', 'את', 'עם', 'או', 'גם', 'כל', 'לכל', 'לפי', 'אשר', 'זה', 'הוא', 'אינו',
  'ללא', 'בין', 'מול', 'מעל', 'יש', 'אין', 'כולל', 'לפחות', 'נדרש', 'נדרשת', 'נדרשימ',
  'חובה', 'המציע', 'בעל', 'הצעה', 'מכרז', 'שנות', 'שנימ', 'שנה', 'ניסיונ', 'מוכח',
]);
const SYN_GROUPS = [
  ['מים', 'מימי', 'שתיה', 'הידראולי'],
  ['ביוב', 'שפכים', 'ניקוז', 'שופכין', 'קולחין'],
  ['תשתית', 'תשתיות', 'צנרת', 'קו', 'קווי', 'קווים'],
  ['בקרה', 'ניטור', 'סקאדה', 'scada', 'בקר', 'טלמטריה'],
  ['מוקד', 'מוקדי', 'קריאות'],
  ['הנדסי', 'הנדסה', 'מהנדס', 'מהנדסת', 'הנדסית'],
  ['פיקוח', 'פיקוחי', 'מפקח'],
  ['נתונים', 'מידע', 'דאטה'],
  ['רשות', 'רשויות', 'עיריה', 'עיריית', 'עיריות', 'מועצה', 'ציבורי', 'ציבוריים', 'ממשלתי', 'עירוני', 'מקומית', 'מקומיות'],
];
const SYN = new Map(); // מאוכלס אחרי canon (מפתחות מנורמלים)

function canon(w) {
  let s = w.toLowerCase()
    .replace(/[֑-ׇ]/g, '')      // ניקוד/טעמים
    .replace(/["'׳״.,:;()\/\\]/g, '')     // פיסוק/גרשיים
    .replace(/[ךםןףץ]/g, (c) => FINALS[c]); // סופיות→רגילות
  return s; // נרמול טהור בלבד — נרדפות/תחיליות מטופלות ב-overlap
}
function tokens(s) {
  return (s || '').split(/[\s ]+/).map(canon).filter((t) => t.length >= 2 && !STOP.has(t));
}
for (const g of SYN_GROUPS) { const c = canon(g[0]); for (const w of g) SYN.set(canon(w), c); }
// מילה מנורמלת → קנוני (נרדפות) + צורת-סמיכות שמרנית ("בקרת"→"בקר" רק אם מקוצר=נרדף).
const cn = (w) => {
  if (SYN.has(w)) return SYN.get(w);
  if (w.length >= 4 && w.endsWith('ת') && SYN.has(w.slice(0, -1))) return SYN.get(w.slice(0, -1));
  return w;
};
// שוויון-לאחר-הסרת-תחילית בטוחה: "במים"↔"מים" מול טוקן אמיתי, בלי לשבש שורשים
function prefEq(a, b) {
  if (a.length >= 4 && PREFIX.includes(a[0]) && a.slice(1) === b) return true;
  if (b.length >= 4 && PREFIX.includes(b[0]) && b.slice(1) === a) return true;
  return false;
}
function overlap(a, b) {
  const bt = tokens(b), bCanon = new Set(bt.map(cn));
  const seen = new Set();
  let n = 0;
  for (const wa of tokens(a)) {
    const ca = cn(wa);
    let hit = bCanon.has(ca);
    if (!hit) for (const wb of bt) if (prefEq(wa, wb)) { hit = true; break; }
    if (hit && !seen.has(ca)) { seen.add(ca); n++; }
  }
  return n; // מספר מושגים ייחודיים משותפים
}

// 1) פענוח מסמך → טקסט. (שלב 1 יחליף בקריאה אמיתית ל-pdf/docx/xlsx)
export function parseDocument(file) {
  return {
    kind: (file?.kind) || 'unknown',
    rawText: file?.rawText || `[stub] תוכן ${file?.filename || 'מסמך'} — יחולץ אמיתית בשלב 1`,
  };
}

// 1b) סיווג מסמך לקטגוריה. meta = { kind, filename }.
//     stub: היוריסטיקת שם-קובץ + מילות-מפתח. Claude ישדרג לסיווג סמנטי בשלב 5.
export function classifyDocument(rawText, meta = {}) {
  const s = `${meta.filename || ''} ${rawText || ''}`;
  const has = (re) => re.test(s);
  if (has(/ISO|סיווג קבלני|ניהול ספרים|ניכוי מס|תעודת|הסמכ|רישיון|ערבות/i)) return 'certifications';
  if (has(/מאזן|דו"?ח כספי|דוח כספי|רו"?ח|מחזור|רווח והפסד|חשבונאי|כספים/i)) return 'financial';
  if (has(/קורות חיים|קו"?ח|resume|cv|עובד|צוות|כוח אדם|השכלה|תעודת השכלה/i)) return 'staff';
  if (has(/המלצ|ממליץ|לקוחות|רשימת לקוחות|שביעות רצון/i)) return 'clients';
  return 'projects';
}

// 2) חילוץ ידע מטקסט אמיתי. meta = { kind, filename }.
//    היוריסטיקה דטרמיניסטית — "חריץ המנוע" ש-Claude יעמיק בשלב 5.
const DOMAIN_KEYWORDS = [
  'תחבורה שיתופית', 'ניתוח סקרים', 'תכנון הנדסי', 'פיקוח ביצוע', 'אבטחת מידע',
  'ניהול נתונים', 'אינטגרציה', 'מוקדי שירות', 'הכשרת צוותים', 'ממשק לאזרח',
  'עיבוד נתונים', 'בזמן אמת', 'ניהול סיכונים', 'SLA', 'ענן',
];

export function extractKnowledge(rawText, meta = {}) {
  const text = rawText || '';

  // שם פרויקט: שם הקובץ (נקי) או השורה המשמעותית הראשונה
  const fromFile = (meta.filename || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  const firstLine = text.split(/\n+/).map((l) => l.trim()).find((l) => l.length >= 4 && l.length <= 60);
  const name = fromFile || firstLine || 'פרויקט שחולץ';

  const year = (text.match(/\b(20\d{2})\b/) || [])[1] || null;

  // ממדים: ביטויי כמות + מילות-תחום שמופיעות בטקסט
  const dims = [];
  // מספר שלם כולל מפרידי אלפים ("8,000 תושבים") — אחרת נחתך ל-"000 תושבים" (עיוות עובדה)
  const qty = text.matchAll(/(\d[\d,]*\d|\d)\s*(רשויות|יישובים|מחוזות|ערים|תושבים|לקוחות|אתרים)/g);
  for (const m of qty) dims.push(`${m[1]} ${m[2]}`);
  for (const kw of DOMAIN_KEYWORDS) if (text.includes(kw)) dims.push(kw);
  const uniqDims = [...new Set(dims)].slice(0, 6);

  // אישורים
  const certs = [];
  const iso = text.match(/ISO\s*\d{4,5}/i);
  if (iso) certs.push({ name: iso[0].toUpperCase().replace(/\s+/g, ' '), status: 'זוהה' });
  if (/ניהול ספרים/.test(text)) certs.push({ name: 'אישור ניהול ספרים', status: 'זוהה' });
  if (/ניכוי מס/.test(text)) certs.push({ name: 'אישור ניכוי מס', status: 'זוהה' });
  const clsf = text.match(/סיווג קבלני\s*[א-ת]?-?\d?/);
  if (clsf) certs.push({ name: clsf[0].trim(), status: 'זוהה' });

  // פעילויות (גמישות 2.0): משפטי-תיאור שמכילים פעולה. מי ביצע — רק אם כתוב במפורש; אחרת unknown.
  // לא מניחים "החברה" — מסמך שפרויקט התקיים אינו מוכיח שהמציע ביצע כל חלק בו (flex/activities.js).
  const ACTION = /(ניהול|פיתוח|אפיון|ניתוח|הקמת|הפעלת|איחוד|אינטגרציה|תכנון|הטמעת|סקר|ליווי|הפקת|בניית|תפעול)/;
  const titleLine = stripMd(text.split(/\n+/).map((l) => l.trim()).find(Boolean) || '');
  const activities = text.split(/\n+/).map((l) => stripMd(l))
    .filter((l) => l !== titleLine && l.length >= 15 && !/^(לקוח|שנה|היקף)\b/.test(l) && !/[:：]\s*$/.test(l) && ACTION.test(l))
    .slice(0, 6)
    .map((l) => ({
      text: l.length > 160 ? l.slice(0, 159) + '…' : l,
      performed_by: /קבלן[\s-]*משנה/.test(l) ? 'subcontractor'
        : /שותף|במשותף|בשיתוף עם/.test(l) ? 'partner'
          : /בוצע\s+(על ידי|ע"?י)\s+(החברה|צוות החברה)|ביצענו/.test(l) ? 'company' : 'unknown',
      quote: l.slice(0, 300),
    }));

  // פרויקט נוצר רק אם יש עדות מינימלית (שם + שנה או ממד) — אחרת לא ממציאים
  const projects = (year || uniqDims.length)
    ? [{ name, year, dimensions: uniqDims, activities }]
    : [];

  return { projects, certifications: certs };
}

// 3) פענוח מכרז → מטא + דרישות. (שלב 2: פיצול היוריסטי; Claude יעמיק בשלב 5)
const REQ_CUES = ['נדרש', 'ניסיון', 'חובה', 'על המציע', 'יש ל', 'בעל', 'הוכחת', 'תנאי סף'];

// S1.2: קטגוריזציה גנרית (רב-תחומית) — לפי מילות-מפתח. ברירת מחדל: 'כללי'.
const CAT_RULES = [
  [/ניסיון|ותק|שנות|ביצע|מבצע|פרויקטים דומים/, 'ניסיון'],
  [/מחזור|כספי|מאזן|רווח|איתנות פיננסית|דו"?ח כספי|היקף כספי/, 'פיננסי'],
  [/סיווג קבלני|רישיון|רישום|היתר|קבלן רשום|ג\.?א\.?ט/, 'סיווג ורישוי'],
  [/ערבות|ביטוח|בטוחה|כתב שיפוי/, 'ערבות וביטוח'],
  [/צוות|כוח אדם|מהנדס|עובד|מוסמך|בעל תואר|כשירות|צמ"?ה|מנהל פרויקט/, 'כשירות צוות'],
  [/תקן|ISO|איכות|בטיחות|הסמכה|תו תקן/, 'איכות ותקינה'],
];
function categorize(text) {
  const t = text || '';
  for (const [re, cat] of CAT_RULES) if (re.test(t)) return cat;
  return 'כללי';
}
// "תנאי סף" = דרישת חובה (פסילה אם לא מתקיימת), להבדיל מדרישה מנקדת/רשות.
function isMandatory(text) {
  return /תנאי סף|חובה|הכרחי|מחייב|תנאי מוקדם|יש לעמוד|לא יתקבל|ייפסל/.test(text || '');
}
function enrichReq(text) {
  return { text, category: categorize(text), mandatory: isMandatory(text) };
}

// ניקוי סימוני Markdown (מ-anydoc): כותרות #, הדגשה **, רשימות, <u>.
function stripMd(l) {
  return (l || '')
    .replace(/^#{1,6}\s*/, '').replace(/^[>*\-]\s+/, '')
    .replace(/\*\*/g, '').replace(/<\/?u>/gi, '').trim();
}

// שורות-נתונים מטבלאות Markdown (DOCX/XLSX/PPTX דרך anydoc). מדלג על מפריד |---|
// ועל שורת הכותרת (זו שיש אחריה מפריד). עברית מ-PDF לא מגיעה כטבלה — לא נוגע ב-PDF.
function markdownTableRows(text) {
  const lines = (text || '').split('\n').map((l) => l.trim());
  const isSep = (l) => /^\|[\s|:\-]+\|$/.test(l) && l.includes('-');
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!/^\|.*\|$/.test(l) || isSep(l)) continue;    // לא שורת טבלה, או מפריד
    if (isSep(lines[i + 1] || '')) continue;           // שורת כותרת (מפריד אחריה)
    rows.push(l.slice(1, -1).split('|').map((c) => c.trim()));
  }
  return rows;
}

// דרישה משורת-טבלה: העמודה הראשונה עם טקסט אמיתי (>=3 אותיות). שאר העמודות (משקל/חובה) הן מטא ולא נשמרות בחוזה כרגע.
function rowToRequirement(cols) {
  const textCol = cols.find((c) => c.replace(/[^א-תA-Za-z]/g, '').length >= 3);
  return textCol ? enrichReq(textCol) : null;
}

export function parseTender(rawText) {
  const text = rawText || '';
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  // קוד מכרז: מעוגן ל"מכרז"/"מס'" כדי לא לתפוס שבר תאריך (למשל 09 מתוך 15/09/2026)
  const codeM = text.match(/(?:מכרז|מס['׳])\s*(?:פומבי\s*)?(?:מס['׳]?\s*)?(\d+\/\d{2,4})/);
  const code = codeM ? '#' + codeM[1]
    : (text.match(/#?\d+\/20\d{2}/) || ['#000/2026'])[0].replace(/^#?/, '#');
  const issuer = stripMd((text.match(/(משרד|עיריית|עירית|רשות|המוסד|פיקוד|מועצה)[^\n.,|]{0,25}/) || ['גורם מפרסם'])[0]);

  // שם: השורה המשמעותית הראשונה (בלי סימוני Markdown ובלי שורת-טבלה), בלי "מכרז" והקוד
  const nameLine = lines.map(stripMd).find((l) => l.length >= 6 && !l.startsWith('|')) || 'מכרז חדש';
  const name = nameLine
    .replace(/^מכרז\s*(פומבי\s*)?(מס['׳]?\s*)?/, '')
    .replace(/#?\d+\/\d{2,4}\s*(ל|—|-)?\s*/, '').trim() || nameLine;

  // דרישות: קודם מטבלאות Markdown (DOCX/XLSX), ואז שורות-רמז (PDF / fallback)
  const tableReqs = markdownTableRows(text).map(rowToRequirement).filter(Boolean);
  const isMeta = (l) => stripMd(l) === nameLine || (issuer && l.includes(issuer)) || stripMd(l).length < 8;
  // פריט-רשימה ממוספר/בוליט (1. / 2) / - / •) הוא כמעט תמיד דרישה — גם בלי מילת-רמז.
  const isEnumerated = (l) => /^\s*(\d+[.)]|[-–—•*])\s+\S/.test(l);
  // כותרת-סעיף (למשל "תנאי סף להשתתפות:", "דרישות המכרז:") — תווית, לא דרישה בפני עצמה
  const isHeader = (l) => { const s = stripMd(l); return /[:：]\s*$/.test(s) && !isEnumerated(l) && s.replace(/[:：]\s*$/, '').split(/\s+/).length <= 4; };
  let lineReqs = lines
    .filter((l) => !l.startsWith('|') && !isMeta(l) && !isHeader(l) && (isEnumerated(l) || REQ_CUES.some((c) => l.includes(c))))
    .map((l) => enrichReq(stripMd(l)));
  if (!tableReqs.length && !lineReqs.length) {
    lineReqs = lines.filter((l) => !l.startsWith('|') && !isMeta(l)).map((l) => enrichReq(stripMd(l)));
  }
  const seen = new Set(tableReqs.map((r) => r.text));
  // תקרה רחבה (מכרז ישראלי טיפוסי: 11–40 תנאים). תקרה של 12 הפילה תנאי-סף בשקט — recall קודם.
  const requirements = [...tableReqs, ...lineReqs.filter((r) => !seen.has(r.text))].slice(0, 80);

  // סיכום מובנה (B11): שדות שמכרז ציבורי כמעט תמיד כולל
  const money = /([\d,]+)\s*(מיליון|אלף)?\s*(₪|ש"?ח|שקל)/;
  const guar = text.match(new RegExp('ערבות[^\\n]{0,45}?' + money.source));
  const turn = text.match(new RegExp('מחזור[^\\n]{0,45}?' + money.source));
  const classM = text.match(/סיווג קבלני\s*[א-ת]?-?\d?/);
  const durM = text.match(/(\d+)\s*(חודשים|חודש|שנים|שנה)/);
  const dateM = text.match(/(מועד אחרון|מועד הגשה|להגשה עד|הגשה עד)[^\d]{0,15}(\d{1,2}[./]\d{1,2}[./]\d{2,4})/);

  return {
    code, name, issuer,
    deadline: dateM ? dateM[2] : null,
    guarantee: guar ? guar[0].replace(/\s+/g, ' ').trim() : null,
    classification: classM ? classM[0].trim() : null,
    min_turnover: turn ? turn[0].replace(/\s+/g, ' ').trim() : null,
    duration: durM ? durM[0].trim() : null,
    requirements: requirements.length ? requirements
      : [{ text: 'לא זוהו דרישות מובנות — יש לבדוק את הטקסט', category: 'כללי', mandatory: false }],
  };
}

// 3c) דגלים אדומים: מלכודות שמנהל מכרזים חייב לראות (פסילה, קנסות, מפגש חובה).
//     stub: זיהוי דפוסים. Claude ישדרג בשלב 5. הכל מעוגן בטקסט — אין המצאה.
//     כל דגל נושא: severity (דירוג קריטיות) + detail (מה זה) + action (מה לעשות — S1.1).
export function checkRedFlags(rawText) {
  const text = rawText || '';
  const flags = [];
  if (/הנחה/.test(text) && /תיפסל|תיפסלנה|פסיל|תידחה/.test(text)) {
    const m = text.match(/(\d+)\s*%/);
    flags.push({ label: 'סף הנחה לפסילה', severity: 'high',
      detail: m ? `הצעה עם הנחה מעל ${m[1]}% עלולה להיפסל.` : 'הנחה מעל שיעור מסוים תיפסל.',
      action: 'חשב את מחיר ההצעה מול המחירון — אל תעבור את סף ההנחה שמוביל לפסילה.' });
  }
  if (/פיצוי(ים)?\s*מוסכם|פיצויים מוסכמים|סעיף קנס|קנסות|קנס יומי/.test(text)) {
    flags.push({ label: 'סעיפי קנס / פיצוי מוסכם', severity: 'medium',
      detail: 'קיימים סעיפי קנס / פיצוי מוסכם בחוזה.',
      action: 'כמת את החשיפה הכספית המקסימלית (קנס יומי × ימי איחור אפשריים) לפני הגשה.' });
  }
  if (/(מפגש מציעים|סיור קבלנים|סיור מציעים)[^\n]{0,20}(חובה|הכרחי|מחייב)/.test(text)) {
    flags.push({ label: 'מפגש/סיור חובה', severity: 'high',
      detail: 'השתתפות במפגש/סיור היא תנאי מוקדם להגשה.',
      action: 'רשום מיד את מועד המפגש ביומן — היעדרות פוסלת את ההצעה.' });
  }
  if (/ניסיון קודם עם המזמין|היכרות עם המערכת הקיימת|ספק קיים בלבד/.test(text)) {
    flags.push({ label: 'תנאי מגביל תחרות', severity: 'medium',
      detail: 'ייתכן תנאי שמעדיף ספק מכהן / דורש היכרות מוקדמת.',
      action: 'בדוק היתכנות; שקול הגשת שאלת הבהרה לגבי סבירות התנאי.' });
  }
  const guarM = text.match(/ערבות\s*(ביצוע|הגשה|מכרז|בנקאית)/);
  if (guarM) {
    const amt = text.match(new RegExp('ערבות[^\\n]{0,40}?([\\d,]+)\\s*(מיליון|אלף)?\\s*(₪|ש"?ח|שקל)'));
    flags.push({ label: `ערבות ${guarM[1]}`, severity: 'medium',
      detail: amt ? `נדרשת ערבות בסך ${amt[0].replace(/\s+/g, ' ').trim()}.` : 'נדרשת ערבות — בדוק סכום ותוקף.',
      action: 'ודא מסגרת בנקאית פנויה לערבות ובדוק את תאריך התוקף הנדרש.' });
  }
  if (/ביטוח[^\n]{0,40}(אחריות מקצועית|צד ג['׳]?|חבות המוצר)/.test(text)) {
    flags.push({ label: 'דרישת ביטוח', severity: 'low',
      detail: 'נדרש ביטוח בהיקף מוגדר (אחריות מקצועית / צד ג׳).',
      action: 'ודא מול סוכן הביטוח שהפוליסות הקיימות מכסות את הגבולות הנדרשים.' });
  }
  return { flags };
}

// 3b) בדיקת תנאי-סף: הצלבת דרישות המכרז מול פרופיל החברה.
//     stub: זיהוי דפוסים נפוצים. Claude ישדרג לחילוץ סף מלא בשלב 5.
//     כל בדיקה: { label, required, have, status: met|gap|unknown, topic, evidence, unknown_side? }.
//     evidence='declared' — הנתון מפרופיל החברה (הצהרה), לא ממסמך. ראה qualification/index.js.
//     עיקרון: אין "met" בלי השוואה. סף שהמכרז לא מגדיר → unknown (צד המכרז), לא met.
export function checkThresholds(rawText, company = {}) {
  const text = rawText || '';
  const checks = [];
  const num = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };
  const D = { evidence: 'declared' };

  const ym = text.match(/(\d+)\s*שנות\s*ניסיון/);
  if (ym) {
    const req = +ym[1], have = num(company.senior_experience_years);
    checks.push({ label: `ניסיון: ${req}+ שנים`, required: `${req} שנים`, have: have != null ? `${have} שנים` : 'לא הוזן',
      status: have == null ? 'unknown' : (have >= req ? 'met' : 'gap'), topic: 'years', ...D });
  }
  if (/גופים ציבוריים|מגזר ציבורי|רשויות מקומיות|משרד ממשלתי|גוף ציבורי/.test(text)) {
    const have = company.public_sector_experience;
    checks.push({ label: 'ניסיון עם גופים ציבוריים', required: 'נדרש', have: have || 'לא הוזן',
      status: have === 'כן' ? 'met' : (have === 'לא' ? 'gap' : 'unknown'), topic: 'public', ...D });
  }
  if (/עובדים מוסמכים|רו"?ח|עו"?ד/.test(text)) {
    // מספר נדרש אם מצוין ("5 עובדים מוסמכים"); אחרת — לפחות אחד.
    const rm = text.match(/(\d+)\s*(?:עובדים מוסמכים|רו"?ח|עו"?ד)/);
    const req = rm ? +rm[1] : 1, have = num(company.certified_staff);
    checks.push({ label: `עובדים מוסמכים (רו״ח/עו״ד)${rm ? `: ${req}+` : ''}`, required: `${req}`, have: have != null ? `${have}` : 'לא הוזן',
      status: have == null ? 'unknown' : (have >= req ? 'met' : 'gap'), topic: 'staff', ...D });
  }
  if (/מחזור\s*(כספי|שנתי)?/.test(text)) {
    const req = requiredTurnover(text), have = parseMoney(company.avg_turnover);
    let status, unknown_side;
    if (req == null) { status = 'unknown'; unknown_side = 'tender'; } // המכרז לא מגדיר סכום — לא מניחים
    else if (have == null) status = 'unknown';
    else status = have >= req ? 'met' : 'gap';
    checks.push({ label: `מחזור כספי${req != null ? `: ${formatMoney(req)}+` : ''}`,
      required: req != null ? formatMoney(req) : 'סכום לא הוגדר במכרז',
      have: company.avg_turnover || 'לא הוזן', status, topic: 'turnover', ...D, ...(unknown_side ? { unknown_side } : {}) });
  }
  const clsM = text.match(/סיווג קבלני\s*([א-ת])?-?(\d)?/);
  if (clsM) {
    const req = clsM[0].trim();
    const have = company.classification;
    checks.push({ label: `סיווג קבלני: ${req.replace(/^סיווג קבלני\s*/, '') || 'נדרש'}`,
      required: req, have: have || 'לא הוזן', status: compareClassification(req, have), topic: 'classification', ...D });
  }
  return { checks };
}

// 4) ניתוח התאמה מול מאגר הידע.
export function analyzeMatch(requirements, kb) {
  const kbText = kb.projects.flatMap((p) => [p.name, ...(p.dimensions || [])]).join(' ') +
    ' ' + kb.certifications.map((c) => c.name).join(' ');
  const met = [], gaps = [];
  for (const r of requirements) {
    // דרישת חובה: מילה משותפת אחת אינה ראיה — נדרשים לפחות 2 מושגים משותפים (שמרנות מול false Met).
    if (overlap(r.text, kbText) >= (r.mandatory ? 2 : 1)) met.push(r.text);
    else gaps.push({ id: r.id, text: r.text, hint: 'אין ממד תואם בזיכרון — ניתן להשלים ידנית' });
  }
  const total = requirements.length || 1;
  const matchScore = Math.round((met.length / total) * 100);
  return { matchScore, met, gaps, fails: [] };
}

// 5) מיפוי דרישה→מקור. hasSource=false ⇒ תדרוש השלמה ידנית.
//    stub עושה התאמת-מילים מדויקת בלבד (relevance תמיד 'direct') — הגמישות המכרזית
//    (התאמה סמוכה + bridge) היא יכולת Claude בשלב 5. השדות נשמרים לשם אחידות-צורה.
export function buildMapping(requirements, kb) {
  return requirements.map((r) => {
    let best = null, bestScore = 0;
    for (const p of kb.projects) {
      const s = overlap(r.text, [p.name, ...(p.dimensions || [])].join(' '));
      if (s > bestScore) { bestScore = s; best = p; }
    }
    return {
      requirement: r.text,
      project: bestScore > 0 ? best.name : null,
      dimensions: bestScore > 0 ? (best.dimensions || []).slice(0, 3) : [],
      hasSource: bestScore > 0,
      relevance: bestScore > 0 ? 'direct' : null,
      bridge: '',
    };
  });
}

// 6) יצירת טיוטה — מקבל אך ורק את המיפוי (Guardrail).
//    hasSource=false ⇒ סקשן ריק המסומן להשלמה ידנית — אלא אם המשתמש השלים ידנית (manualText).
//    שום דבר לא מומצא: טקסט ידני מגיע מהמשתמש, לא מהמערכת.
export function generateDraft(mapping) {
  const sections = mapping.map((m, i) => {
    const title = `${i + 1} · ${m.requirement}`;
    if (m.hasSource) {
      // גיוון נוסח — מרוטט לפי אינדקס כדי שסעיפים סמוכים/מאותו מקור לא יֵצאו זהים.
      // כל וריאנט משתמש אך ורק בשם הפרויקט ובממדיו (מהמיפוי) — אפס-הזיות נשמר.
      const dims = m.dimensions?.length ? m.dimensions.join(', ') : '';
      const variants = [
        `בהתבסס על פרויקט "${m.project}", לחברה ניסיון מוכח ורלוונטי לדרישה זו${dims ? `, המשתקף ב־${dims}` : ''}.`,
        `החברה מציגה יכולת מוכחת בתחום זה מתוך פרויקט "${m.project}"${dims ? ` — הכולל ${dims}` : ''}.`,
        `ניסיון החברה נשען על פרויקט "${m.project}"${dims ? `, שבמסגרתו: ${dims}` : ''}.`,
        `כפי שבא לידי ביטוי בפרויקט "${m.project}"${dims ? ` (${dims})` : ''}, לחברה מענה ישיר לדרישה.`,
      ];
      return {
        title,
        body: variants[i % variants.length],
        confidence: Math.min(95, 70 + (m.dimensions?.length || 0) * 8),
        sourceProject: m.project,
        needsManual: false,
      };
    }
    if (m.manualText) {
      return {
        title,
        body: m.manualText,
        confidence: null,
        sourceProject: 'השלמה ידנית של המשתמש',
        needsManual: false,
        manual: true,
      };
    }
    return { title, body: '', confidence: 0, sourceProject: null, needsManual: true };
  });
  return { sections };
}
