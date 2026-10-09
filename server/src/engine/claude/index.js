// claude/index.js — מימוש המנוע האמיתי מול Claude (שלב 5).
// אותו חוזה בדיוק כמו stub; הפונקציות א-סינכרוניות (ה-routes עושות await).
// מופעל ב-ENGINE=claude עם ANTHROPIC_API_KEY. עד אז — stub.
//
// ★ העיקר: גמישות מכרזית ★
//   הבידול של המוצר, שזוקק מראיונות עם חברות ייעוץ: היכולת לנתב חברה למכרז
//   שאינו *בדיוק* ההתמחות המוצהרת שלה — ע"י מיסגור-מחדש של ניסיון קיים כך שהוא
//   עונה על הדרישה. buildMapping כאן מוצא התאמות *סמוכות* לגיטימיות (לא רק חפיפת
//   מילים כמו ב-stub), ומנסח "גשר" (bridge) שמסביר מדוע הניסיון רלוונטי.
//   השומר: הגשר והטיוטה מבוססים אך ורק על ממדים קיימים — guardrail.js אוכף בקוד
//   שלא הומצאה שום עובדה קשיחה. גמישות = מיסגור-מחדש, לא ניפוח.

import { extract } from './provider.js';
import { parseMoney, formatMoney, compareClassification } from '../../qualification/index.js';

// ---------- 1) פענוח מסמך → טקסט ----------
// חילוץ הטקסט עצמו נעשה ב-lib/extractText.js (דטרמיניסטי, משותף). כאן passthrough.
export async function parseDocument(file) {
  return { kind: file?.kind || 'unknown', rawText: file?.rawText || '' };
}

// ---------- 1b) סיווג מסמך ----------
const CATS = ['projects', 'certifications', 'financial', 'staff', 'clients'];
export async function classifyDocument(rawText, meta = {}) {
  const out = await extract({
    system: 'אתה מסווג מסמכי חברה לקטגוריה אחת. החזר JSON בלבד.',
    instruction: `סווג את המסמך (שם קובץ: "${meta.filename || ''}") לאחת מהקטגוריות: ` +
      `projects (פרויקטים/ניסיון), certifications (אישורים/תקנים), financial (פיננסי), ` +
      `staff (כוח אדם), clients (לקוחות/המלצות).`,
    dataLabel: 'תוכן המסמך',
    data: rawText,
    effort: 'low',
    maxTokens: 200,
    schema: {
      type: 'object', additionalProperties: false,
      properties: { category: { type: 'string', enum: CATS } },
      required: ['category'],
    },
  });
  return CATS.includes(out.category) ? out.category : 'projects';
}

// ---------- 2) חילוץ ידע מטקסט ----------
//   מחלץ פרויקטים (שם, שנה, ממדים) ואישורים. אפס-הזיות: פרויקט/ממד נוצר רק אם
//   קיימת עדות בטקסט. אין עדות → מערך ריק. הממדים חייבים להיות מעוגנים בטקסט.
export async function extractKnowledge(rawText, meta = {}) {
  const out = await extract({
    system: 'אתה מחלץ ידע ארגוני מובנה ממסמך חברה. חלץ אך ורק עובדות המופיעות בטקסט — ' +
      'אל תמציא שמות, שנים, כמויות או אישורים. אם אין עדות — החזר מערכים ריקים. החזר JSON בלבד.',
    instruction: `חלץ מהמסמך (שם קובץ: "${meta.filename || ''}") פרויקטים ואישורים. ` +
      'לכל פרויקט: שם, שנה (אם מצוינת), וממדים ספציפיים (כמויות, תחומים, טכנולוגיות) שמופיעים בטקסט. ' +
      'לכל אישור: שם ותוקף (אם מצוין). כל פרט חייב להיות מעוגן בטקסט.',
    dataLabel: 'תוכן המסמך',
    data: rawText,
    effort: 'medium',
    schema: {
      type: 'object', additionalProperties: false,
      properties: {
        projects: {
          type: 'array', items: {
            type: 'object', additionalProperties: false,
            properties: {
              name: { type: 'string' },
              year: { type: ['string', 'null'] },
              dimensions: { type: 'array', items: { type: 'string' } },
            },
            required: ['name', 'year', 'dimensions'],
          },
        },
        certifications: {
          type: 'array', items: {
            type: 'object', additionalProperties: false,
            properties: {
              name: { type: 'string' },
              valid_until: { type: ['string', 'null'] },
              status: { type: 'string' },
            },
            required: ['name', 'valid_until', 'status'],
          },
        },
      },
      required: ['projects', 'certifications'],
    },
  });
  return { projects: out.projects || [], certifications: out.certifications || [] };
}

// ---------- 3) פענוח מכרז → מטא + דרישות ----------
export async function parseTender(rawText) {
  const out = await extract({
    system: 'אתה מפענח מסמך מכרז ציבורי ישראלי. חלץ מטא-נתונים ואת רשימת הדרישות ותנאי הסף. ' +
      'הישאר נאמן לטקסט — אל תמציא דרישות. החזר JSON בלבד.',
    instruction: 'חלץ: קוד מכרז, שם, גורם מפרסם, מועד הגשה, ערבות (סכום), סיווג קבלני נדרש, ' +
      'מחזור מינימלי נדרש, משך ההתקשרות — כל אלה אם מצוינים (אחרת null). וגם רשימת דרישות/תנאי-סף. ' +
      'לכל דרישה: הטקסט שלה, קטגוריה קצרה (ניסיון / פיננסי / סיווג ורישוי / ערבות וביטוח / כשירות צוות / איכות ותקינה / כללי), ' +
      'ו-mandatory (true אם זו דרישת חובה/תנאי-סף שפוסלת הצעה שאינה עומדת בה, אחרת false).',
    dataLabel: 'מסמך המכרז',
    data: rawText,
    effort: 'medium',
    schema: {
      type: 'object', additionalProperties: false,
      properties: {
        code: { type: 'string' },
        name: { type: 'string' },
        issuer: { type: 'string' },
        deadline: { type: ['string', 'null'] },
        guarantee: { type: ['string', 'null'] },
        classification: { type: ['string', 'null'] },
        min_turnover: { type: ['string', 'null'] },
        duration: { type: ['string', 'null'] },
        requirements: {
          type: 'array', items: {
            type: 'object', additionalProperties: false,
            properties: { text: { type: 'string' }, category: { type: 'string' }, mandatory: { type: 'boolean' } },
            required: ['text', 'category', 'mandatory'],
          },
        },
      },
      required: ['code', 'name', 'issuer', 'deadline', 'guarantee', 'classification', 'min_turnover', 'duration', 'requirements'],
    },
  });
  return {
    code: out.code || '#—',
    name: out.name || 'מכרז חדש',
    issuer: out.issuer || 'גורם מפרסם',
    deadline: out.deadline || null,
    guarantee: out.guarantee || null,
    classification: out.classification || null,
    min_turnover: out.min_turnover || null,
    duration: out.duration || null,
    requirements: (out.requirements || []).length ? out.requirements
      : [{ text: 'לא זוהו דרישות מובנות — יש לבדוק את הטקסט', category: 'כללי' }],
  };
}

// ---------- 3b) בדיקת תנאי-סף מול פרופיל החברה ----------
//   המודל מחלץ את דרישות-הסף המספריות מהמכרז; ההשוואה עצמה נעשית בקוד (דטרמיניסטי).
export async function checkThresholds(rawText, company = {}) {
  const out = await extract({
    system: 'אתה מחלץ תנאי-סף כמותיים ממכרז ציבורי. חלץ אך ורק מה שמופיע בטקסט. החזר JSON בלבד.',
    instruction: 'חלץ תנאי-סף: שנות ניסיון נדרשות (מספר או null), האם נדרש ניסיון עם גופים ציבוריים ' +
      '(true/false), מספר עובדים מוסמכים נדרש (מספר או null), האם נדרש מחזור כספי מינימלי (true/false), ' +
      'סכום המחזור המינימלי בשקלים כמספר (או null אם הסכום אינו מצוין במפורש — אל תנחש), ' +
      'סיווג קבלני נדרש (הטקסט המדויק, למשל "ג-3", או null).',
    dataLabel: 'מסמך המכרז',
    data: rawText,
    effort: 'low',
    schema: {
      type: 'object', additionalProperties: false,
      properties: {
        years_required: { type: ['integer', 'null'] },
        public_sector_required: { type: 'boolean' },
        certified_staff_required: { type: ['integer', 'null'] },
        turnover_required: { type: 'boolean' },
        turnover_amount_ils: { type: ['number', 'null'] },
        classification_required: { type: ['string', 'null'] },
      },
      required: ['years_required', 'public_sector_required', 'certified_staff_required', 'turnover_required', 'turnover_amount_ils', 'classification_required'],
    },
  });
  // ההשוואה דטרמיניסטית בקוד, כמו ב-stub. evidence='declared' — הנתון מפרופיל (הצהרה).
  const num = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };
  const D = { evidence: 'declared' };
  const checks = [];
  if (out.years_required != null) {
    const have = num(company.senior_experience_years);
    checks.push({ label: `ניסיון: ${out.years_required}+ שנים`, required: `${out.years_required} שנים`,
      have: have != null ? `${have} שנים` : 'לא הוזן', status: have == null ? 'unknown' : (have >= out.years_required ? 'met' : 'gap'), topic: 'years', ...D });
  }
  if (out.public_sector_required) {
    const have = company.public_sector_experience;
    checks.push({ label: 'ניסיון עם גופים ציבוריים', required: 'נדרש', have: have || 'לא הוזן',
      status: have === 'כן' ? 'met' : (have === 'לא' ? 'gap' : 'unknown'), topic: 'public', ...D });
  }
  if (out.certified_staff_required != null) {
    const have = num(company.certified_staff);
    checks.push({ label: `עובדים מוסמכים: ${out.certified_staff_required}+`, required: `${out.certified_staff_required}`,
      have: have != null ? `${have}` : 'לא הוזן', status: have == null ? 'unknown' : (have >= out.certified_staff_required ? 'met' : 'gap'), topic: 'staff', ...D });
  }
  if (out.turnover_required) {
    const req = out.turnover_amount_ils ?? null, have = parseMoney(company.avg_turnover);
    let status, unknown_side;
    if (req == null) { status = 'unknown'; unknown_side = 'tender'; }
    else if (have == null) status = 'unknown';
    else status = have >= req ? 'met' : 'gap';
    checks.push({ label: `מחזור כספי${req != null ? `: ${formatMoney(req)}+` : ''}`,
      required: req != null ? formatMoney(req) : 'סכום לא הוגדר במכרז',
      have: company.avg_turnover || 'לא הוזן', status, topic: 'turnover', ...D, ...(unknown_side ? { unknown_side } : {}) });
  }
  if (out.classification_required) {
    const have = company.classification;
    checks.push({ label: `סיווג קבלני: ${out.classification_required}`, required: out.classification_required,
      have: have || 'לא הוזן', status: compareClassification(out.classification_required, have), topic: 'classification', ...D });
  }
  return { checks };
}

// ---------- 3c) דגלים אדומים ----------
export async function checkRedFlags(rawText) {
  const out = await extract({
    system: 'אתה מזהה "דגלים אדומים" במכרז — מלכודות שעלולות לפסול הצעה או לחשוף לסיכון: ' +
      'תנאי פסילה (למשל הנחה מעל שיעור), סעיפי קנס/פיצוי מוסכם, מפגש/סיור חובה, ' +
      'דרישות ערבות/ביטוח, תנאים מגבילי-תחרות. רק מה שמופיע בטקסט — אל תמציא. ' +
      'לכל דגל: severity (דירוג קריטיות), detail (מה הסיכון), action (המלצת פעולה קונקרטית למגיש). החזר JSON בלבד.',
    dataLabel: 'מסמך המכרז',
    data: rawText,
    effort: 'medium',
    schema: {
      type: 'object', additionalProperties: false,
      properties: {
        flags: {
          type: 'array', items: {
            type: 'object', additionalProperties: false,
            properties: {
              label: { type: 'string' },
              detail: { type: 'string' },
              action: { type: 'string' },
              severity: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
            required: ['label', 'detail', 'action', 'severity'],
          },
        },
      },
      required: ['flags'],
    },
  });
  return { flags: out.flags || [] };
}

// עוזר: קלט הידע כטקסט קומפקטי לפרומפט (רק מה שאושר במאגר).
function kbLines(kb) {
  return (kb.projects || []).map((p, i) =>
    `P${i}: "${p.name}"${p.year ? ` (${p.year})` : ''} — ממדים: ${(p.dimensions || []).join(' · ') || 'אין'}`
  ).join('\n') + '\n' +
  'אישורים: ' + ((kb.certifications || []).map((c) => c.name).join(', ') || 'אין');
}

// ---------- 4) ניתוח התאמה (עם גמישות מכרזית) ----------
//   met = דרישות שיש להן כיסוי (ישיר או סמוך-לגיטימי). gap = ניתן להשלמה ידנית.
//   fail = החברה לא יכולה לעמוד בדרישה גם עם מיסגור-מחדש.
export async function analyzeMatch(requirements, kb) {
  const out = await extract({
    system: 'אתה מנתח התאמה בין דרישות מכרז לזיכרון הארגוני של חברה. ' +
      'שקול "גמישות מכרזית": ניסיון סמוך יכול לענות על דרישה גם בלי חפיפת מילים, כל עוד הוא באמת רלוונטי. ' +
      'אל תמציא יכולות שאין להן עדות במאגר. החזר JSON בלבד.',
    instruction: 'מאגר הידע:\n' + kbLines(kb) + '\n\nדרישות המכרז:\n' +
      requirements.map((r, i) => `R${i}${r.mandatory ? ' [תנאי-סף]' : ''}: ${r.text}`).join('\n') + '\n\n' +
      'לכל דרישה קבע: verdict = met (יש כיסוי ישיר או סמוך) / gap (חסר, ניתן להשלמה) / fail ' +
      '(אין ולא ניתן למסגר). hint קצר. ' +
      'חשוב: דרישה המסומנת [תנאי-סף] היא met רק אם במאגר יש עדות *ישירה* שעונה עליה במלואה — ' +
      'בלי גמישות סמוכה ובלי הנחות. אם חסר פרט (היקף, תקופה, כמות) — gap. גמישות סמוכה מותרת רק לדרישות שאינן תנאי-סף.',
    effort: 'high',
    schema: {
      type: 'object', additionalProperties: false,
      properties: {
        items: {
          type: 'array', items: {
            type: 'object', additionalProperties: false,
            properties: {
              text: { type: 'string' },
              verdict: { type: 'string', enum: ['met', 'gap', 'fail'] },
              hint: { type: 'string' },
            },
            required: ['text', 'verdict', 'hint'],
          },
        },
      },
      required: ['items'],
    },
  });
  const items = (out.items || []).map((x, i) => ({ ...x, id: requirements[i] && requirements[i].id }));
  const met = items.filter((x) => x.verdict === 'met').map((x) => x.text);
  const gaps = items.filter((x) => x.verdict === 'gap').map((x) => ({ id: x.id, text: x.text, hint: x.hint }));
  const fails = items.filter((x) => x.verdict === 'fail').map((x) => ({ id: x.id, text: x.text, hint: x.hint }));
  const total = items.length || requirements.length || 1;
  return { matchScore: Math.round((met.length / total) * 100), met, gaps, fails };
}

// ---------- 5) מיפוי דרישה→מקור (לב הגמישות) ----------
//   לכל דרישה: הפרויקט הרלוונטי ביותר (כולל התאמה סמוכה), הממדים שתומכים,
//   relevance (direct/adjacent), ו-bridge — משפט המסביר מדוע הניסיון עונה על הדרישה.
//   אילוצי אפס-הזיות (מוטבעים בפרומפט + נאכפים ב-guardrail.js):
//     - project חייב להיות אחד משמות הפרויקטים שסופקו, מילה-במילה.
//     - dimensions חייבים להיות תת-קבוצה של ממדי אותו פרויקט, מילה-במילה.
//     - bridge מתבסס אך ורק על אותם ממדים; לא ממציא כמות/תקן/שנה.
//     - אין התאמה לגיטימית → hasSource=false.
export async function buildMapping(requirements, kb) {
  const projNames = (kb.projects || []).map((p) => p.name);
  const out = await extract({
    system: 'אתה ממפה כל דרישת מכרז למקור בזיכרון הארגוני, במטרה לממש "גמישות מכרזית": ' +
      'לנתב את החברה גם למכרז שאינו בדיוק ההתמחות שלה, ע"י מיסגור-מחדש של ניסיון קיים. ' +
      'כללי-ברזל: (1) project חייב להיות אחד משמות הפרויקטים שסופקו, מילה-במילה. ' +
      '(2) dimensions חייבים להיות תת-קבוצה מדויקת של ממדי אותו פרויקט. ' +
      '(3) bridge מתבסס רק על אותם ממדים — אסור להמציא כמות/תקן/שנה/יכולת. ' +
      '(4) אין התאמה לגיטימית → hasSource=false. עדיף פער כן על גשר מזויף. החזר JSON בלבד.',
    instruction: 'מאגר הידע:\n' + kbLines(kb) + '\n\nדרישות:\n' +
      requirements.map((r, i) => `R${i}: ${r.text}`).join('\n') + '\n\n' +
      'לכל דרישה (לפי הסדר) החזר רשומה: hasSource, project, dimensions, ' +
      'relevance (direct=התמחות ישירה / adjacent=גשר גמישות), bridge (משפט הסבר, ריק אם אין מקור).',
    effort: 'high',
    schema: {
      type: 'object', additionalProperties: false,
      properties: {
        mapping: {
          type: 'array', items: {
            type: 'object', additionalProperties: false,
            properties: {
              hasSource: { type: 'boolean' },
              project: { type: ['string', 'null'] },
              dimensions: { type: 'array', items: { type: 'string' } },
              relevance: { type: ['string', 'null'], enum: ['direct', 'adjacent', null] },
              bridge: { type: 'string' },
            },
            required: ['hasSource', 'project', 'dimensions', 'relevance', 'bridge'],
          },
        },
      },
      required: ['mapping'],
    },
  });
  const rows = out.mapping || [];
  // עיגון קשיח מול המאגר: הפרויקט חייב להתקיים; הממדים חייבים להיות ממדים אמיתיים שלו.
  return requirements.map((r, i) => {
    const row = rows[i] || {};
    const proj = (kb.projects || []).find((p) => p.name === row.project);
    if (!row.hasSource || !proj) {
      return { requirement: r.text, project: null, dimensions: [], hasSource: false, relevance: null, bridge: '' };
    }
    const dims = (row.dimensions || []).filter((d) => (proj.dimensions || []).includes(d));
    return {
      requirement: r.text,
      project: proj.name,
      dimensions: dims,
      hasSource: true,
      relevance: row.relevance === 'adjacent' ? 'adjacent' : 'direct',
      bridge: String(row.bridge || '').trim(),
    };
  });
}

// ---------- 6) יצירת טיוטה (Guardrail) ----------
//   מקבל אך ורק את המיפוי. hasSource → פסקה מנוסחת מהממדים+הגשר. חסר מקור → ריק
//   מסומן. manualText → טקסט המשתמש verbatim. השומר (guardrail.js) רץ אחרי — ברמת ה-route.
function confidenceOf(m) {
  const base = m.relevance === 'adjacent' ? 60 : 80; // גשר גמישות = ביטחון זהיר יותר, ביושר
  return Math.min(m.relevance === 'adjacent' ? 85 : 95, base + (m.dimensions?.length || 0) * 5);
}

export async function generateDraft(mapping) {
  const sourced = mapping
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.hasSource);

  let bodies = {};
  if (sourced.length) {
    const out = await extract({
      system: 'אתה כותב פסקאות מענה למכרז. כל פסקה מבוססת אך ורק על העובדות הממופות שסופקו לך ' +
        '(פרויקט + ממדים + גשר). אסור להוסיף כמות/תקן/שנה/עובדה שלא מופיעה בקלט. ' +
        'המיסגור-מחדש מותר; המצאת נתון אסורה. עברית מקצועית. החזר JSON בלבד.',
      instruction: 'כתוב פסקת מענה לכל פריט, לפי ה-i שלו:\n' +
        sourced.map(({ m, i }) =>
          `i=${i} | דרישה: ${m.requirement} | פרויקט: "${m.project}" | ממדים: ${(m.dimensions || []).join(', ') || 'אין'} | גשר: ${m.bridge || '—'}`
        ).join('\n'),
      effort: 'high',
      maxTokens: 4000,
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          drafts: {
            type: 'array', items: {
              type: 'object', additionalProperties: false,
              properties: { i: { type: 'integer' }, body: { type: 'string' } },
              required: ['i', 'body'],
            },
          },
        },
        required: ['drafts'],
      },
    });
    for (const d of out.drafts || []) bodies[d.i] = d.body;
  }

  const sections = mapping.map((m, i) => {
    const title = `${i + 1} · ${m.requirement}`;
    if (m.hasSource) {
      return {
        title,
        body: bodies[i] || `בהתבסס על "${m.project}", לחברה ניסיון רלוונטי בתחום זה.`,
        confidence: confidenceOf(m),
        sourceProject: m.project,
        relevance: m.relevance,
        needsManual: false,
      };
    }
    if (m.manualText) {
      return { title, body: m.manualText, confidence: null, sourceProject: 'השלמה ידנית של המשתמש', needsManual: false, manual: true };
    }
    return { title, body: '', confidence: 0, sourceProject: null, needsManual: true };
  });
  return { sections };
}
