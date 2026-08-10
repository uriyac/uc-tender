// stub/index.js — מימוש דטרמיניסטי ללא מפתח.
// כל פונקציה מחזירה נתונים אמיתיים-בצורתם. בשלבים 1-3 ההיוריסטיקות כאן יתעמקו.
// ה-Guardrail (אפס-הזיות) נאכף כאן במבנה, כדי ש-Claude יירש אותו בשלב 5.

// --- כלי עזר קטן: חפיפת מילות-מפתח ---
function tokens(s) {
  return (s || '').toLowerCase().replace(/["'.,:;()]/g, ' ').split(/\s+/).filter(Boolean);
}
function overlap(a, b) {
  const B = new Set(tokens(b));
  return tokens(a).filter((t) => B.has(t)).length;
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
  const qty = text.matchAll(/(\d+)\s*(רשויות|יישובים|מחוזות|ערים|תושבים|לקוחות|אתרים)/g);
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

  // פרויקט נוצר רק אם יש עדות מינימלית (שם + שנה או ממד) — אחרת לא ממציאים
  const projects = (year || uniqDims.length)
    ? [{ name, year, dimensions: uniqDims }]
    : [];

  return { projects, certifications: certs };
}

// 3) פענוח מכרז → מטא + דרישות. (שלב 2: פיצול היוריסטי; Claude יעמיק בשלב 5)
const REQ_CUES = ['נדרש', 'ניסיון', 'חובה', 'על המציע', 'יש ל', 'בעל', 'הוכחת', 'תנאי סף'];

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
  return textCol ? { text: textCol, category: 'דרישה' } : null;
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
  let lineReqs = lines
    .filter((l) => !l.startsWith('|') && !isMeta(l) && REQ_CUES.some((c) => l.includes(c)))
    .map((l) => ({ text: stripMd(l), category: 'דרישה' }));
  if (!tableReqs.length && !lineReqs.length) {
    lineReqs = lines.filter((l) => !l.startsWith('|') && !isMeta(l)).map((l) => ({ text: stripMd(l), category: 'דרישה' }));
  }
  const seen = new Set(tableReqs.map((r) => r.text));
  const requirements = [...tableReqs, ...lineReqs.filter((r) => !seen.has(r.text))].slice(0, 12);

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
      : [{ text: 'לא זוהו דרישות מובנות — יש לבדוק את הטקסט', category: 'כללי' }],
  };
}

// 3c) דגלים אדומים: מלכודות שמנהל מכרזים חייב לראות (פסילה, קנסות, מפגש חובה).
//     stub: זיהוי דפוסים. Claude ישדרג בשלב 5. הכל מעוגן בטקסט — אין המצאה.
export function checkRedFlags(rawText) {
  const text = rawText || '';
  const flags = [];
  if (/הנחה/.test(text) && /תיפסל|תיפסלנה|פסיל|תידחה/.test(text)) {
    const m = text.match(/(\d+)\s*%/);
    flags.push({ label: 'סף הנחה לפסילה', severity: 'high',
      detail: m ? `הצעה עם הנחה מעל ${m[1]}% עלולה להיפסל — בדוק את המחירון.` : 'הנחה מעל שיעור מסוים תיפסל.' });
  }
  if (/פיצוי(ים)?\s*מוסכם|פיצויים מוסכמים|סעיף קנס|קנסות|קנס יומי/.test(text)) {
    flags.push({ label: 'סעיפי קנס / פיצוי מוסכם', severity: 'medium',
      detail: 'קיימים סעיפי קנס — בדוק חשיפה כספית לפני הגשה.' });
  }
  if (/(מפגש מציעים|סיור קבלנים|סיור מציעים)[^\n]{0,20}(חובה|הכרחי|מחייב)/.test(text)) {
    flags.push({ label: 'מפגש/סיור חובה', severity: 'high',
      detail: 'השתתפות במפגש/סיור היא תנאי להגשה — אל תפספס את המועד.' });
  }
  if (/ניסיון קודם עם המזמין|היכרות עם המערכת הקיימת|ספק קיים בלבד/.test(text)) {
    flags.push({ label: 'תנאי מגביל תחרות', severity: 'medium',
      detail: 'ייתכן תנאי שמעדיף ספק מכהן — בדוק היתכנות.' });
  }
  return { flags };
}

// 3b) בדיקת תנאי-סף: הצלבת דרישות המכרז מול פרופיל החברה.
//     stub: זיהוי דפוסים נפוצים. Claude ישדרג לחילוץ סף מלא בשלב 5.
export function checkThresholds(rawText, company = {}) {
  const text = rawText || '';
  const checks = [];
  const num = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };

  const ym = text.match(/(\d+)\s*שנות\s*ניסיון/);
  if (ym) {
    const req = +ym[1], have = num(company.senior_experience_years);
    checks.push({ label: `ניסיון: ${req}+ שנים`, required: `${req} שנים`, have: have != null ? `${have} שנים` : 'לא הוזן',
      status: have == null ? 'unknown' : (have >= req ? 'met' : 'gap') });
  }
  if (/גופים ציבוריים|מגזר ציבורי|רשויות מקומיות|משרד ממשלתי|גוף ציבורי/.test(text)) {
    const have = company.public_sector_experience;
    checks.push({ label: 'ניסיון עם גופים ציבוריים', required: 'נדרש', have: have || 'לא הוזן',
      status: have === 'כן' ? 'met' : (have === 'לא' ? 'gap' : 'unknown') });
  }
  if (/עובדים מוסמכים|רו"?ח|עו"?ד/.test(text)) {
    const have = num(company.certified_staff);
    checks.push({ label: 'עובדים מוסמכים (רו״ח/עו״ד)', required: 'נדרש', have: have != null ? `${have}` : 'לא הוזן',
      status: have != null && have > 0 ? 'met' : 'unknown' });
  }
  if (/מחזור\s*(כספי|שנתי)?/.test(text)) {
    checks.push({ label: 'מחזור כספי', required: 'נדרש', have: company.avg_turnover || 'לא הוזן',
      status: company.avg_turnover ? 'met' : 'unknown' });
  }
  return { checks };
}

// 4) ניתוח התאמה מול מאגר הידע.
export function analyzeMatch(requirements, kb) {
  const kbText = kb.projects.flatMap((p) => [p.name, ...(p.dimensions || [])]).join(' ') +
    ' ' + kb.certifications.map((c) => c.name).join(' ');
  const met = [], gaps = [];
  for (const r of requirements) {
    if (overlap(r.text, kbText) >= 1) met.push(r.text);
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
      return {
        title,
        body: `בהתבסס על "${m.project}", לחברה ניסיון מוכח בתחום זה${
          m.dimensions?.length ? `, כולל ${m.dimensions.join(', ')}` : ''}.`,
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
