// guardrail.js — אכיפה דטרמיניסטית של אפס-הזיות (לא תלוית-מנוע).
//
// זהו "השומר" של המערכת: הוא רץ על פלט generateDraft של *כל* מנוע (stub או claude)
// ומוודא בקוד — לא בתקווה — שכל עובדה קשיחה בטיוטה מגיעה מהמקור הממופה בלבד.
// זה מה שהופך "גמישות מכרזית" (מיסגור-מחדש של עובדות קיימות) ללגיטימית ולא לניפוח:
// המנוע חופשי לטעון שניסיון סמוך רלוונטי לדרישה, אך אסור לו להמציא כמות/תקן/שנה
// שלא הופיעו בממדים הממופים. עובדה שאינה נמצאת במקור — נחסמת כאן.

// חילוץ "עובדות קשיחות" מטקסט: כמויות+יחידה, תקני ISO, סיווג קבלני, שנים, מטבע.
// אלו הדברים שאסור להמציא. ניסוח חופשי ("ניסיון מוכח", "יכולת דומה") אינו עובדה קשיחה.
const FACT_PATTERNS = [
  /\d[\d,.]*\s*(?:רשויות|יישובים|מחוזות|ערים|תושבים|לקוחות|אתרים|עובדים|פרויקטים|שנים|שנה)/g,
  /ISO\s*\d{4,5}/gi,
  /סיווג קבלני\s*[א-ת]?-?\d?/g,
  /₪\s*[\d,.]+[KMB]?|[\d,.]+\s*(?:מיליון|מיליארד|₪)/g,
  /\b20\d{2}\b/g,
];

// נרמול להשוואה: איחוד רווחים, הסרת פיסוק-רווח, lowercase לאותיות לטיניות.
function norm(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[",'.:;()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function factsIn(text) {
  const out = [];
  for (const re of FACT_PATTERNS) {
    for (const m of (text || '').matchAll(re)) out.push(norm(m[0]));
  }
  return [...new Set(out)];
}

// אוסף העובדות המותרות לסקשן = הפרויקט המקור + הממדים הממופים + טקסט הדרישה
// + גשר המיסגור (bridge). כל אלו מגיעים מהמיפוי — כלומר מהידע שהמשתמש אישר.
function allowedFactText(mapEntry) {
  return norm([
    mapEntry.project || '',
    ...(mapEntry.dimensions || []),
    mapEntry.requirement || '',
    mapEntry.bridge || '',
  ].join(' '));
}

// בדיקת סקשן בודד מול הרשומה הממופה שלו.
// מחזיר { ok, violations:[fact,...] } — עובדות קשיחות ב-body שאין להן מקור מותר.
export function checkSection(section, mapEntry) {
  // סקשן ריק/ידני/מסומן-להשלמה — אין מה לאמת (אין טענת-מערכת שעלולה להיות מומצאת).
  if (!section || section.needsManual || section.manual || !section.body) {
    return { ok: true, violations: [] };
  }
  const allowed = allowedFactText(mapEntry || {});
  const violations = factsIn(section.body).filter((f) => !allowed.includes(f));
  return { ok: violations.length === 0, violations };
}

// אכיפה על טיוטה שלמה. mapping הוא אותו מערך שהוזן ל-generateDraft (באותו סדר).
// מצב ברירת מחדל: neutralize — סקשן עם עובדה לא-מאומתת מומר לסקשן "נדרש אימות"
// עם body ריק (fail-safe: טענה בלתי-ניתנת-לאימות לעולם לא מגיעה למשתמש).
export function enforceDraft(sections, mapping, { neutralize = true } = {}) {
  const violations = [];
  const safe = sections.map((section, i) => {
    const res = checkSection(section, mapping[i] || {});
    if (res.ok) return section;
    violations.push({ index: i, title: section.title, facts: res.violations });
    if (!neutralize) return section;
    return {
      ...section,
      body: '',
      confidence: 0,
      sourceProject: null,
      needsManual: true,
      needsReview: true, // דגל: נחסם ע"י השומר (להבחנה מ"אין מקור" רגיל)
    };
  });
  return { sections: safe, violations, ok: violations.length === 0 };
}

// ============================ שכבת גמישות (תפירה) — F0 ============================
// checkTailoring: אכיפת אפס-הזיות על תפירת נכס-למכרז. שני כללים דטרמיניסטיים:
//   (1) emphasize חייב להיות תת-קבוצה של ממדי הנכס — אי-אפשר "להדגיש" ממד שלא קיים.
//   (2) כל עובדה קשיחה ב-bridge/variants מעוגנת בטקסט המותר (שם הנכס + ממדיו + הדרישה) —
//       כמו ב-enforceDraft. מסגור-מחדש מותר; המצאת כמות/תקן/שנה — נחסמת.
// asset = { name, dimensions[] }. tailoring = { requirement, emphasize[], bridge, variants[] }.
function assetAllowedText(asset, requirement) {
  return norm([asset?.name || '', ...(asset?.dimensions || []), requirement || ''].join(' '));
}
export function checkTailoring(tailoring = {}, asset = {}) {
  const violations = [];
  const dims = new Set(asset.dimensions || []);
  for (const d of (tailoring.emphasize || [])) {
    if (!dims.has(d)) violations.push({ type: 'emphasize', value: d }); // הדגשת ממד שאינו של הנכס
  }
  const allowed = assetAllowedText(asset, tailoring.requirement);
  const texts = [tailoring.bridge || '', ...((tailoring.variants) || [])];
  for (const t of texts) {
    for (const f of factsIn(t)) if (!allowed.includes(f)) violations.push({ type: 'fact', value: f }); // עובדה מומצאת
  }
  return { ok: violations.length === 0, violations };
}

// אכיפה + ניטרול: תפירה שנכשלת מנוטרלת ל"אין תפירה בטוחה" (fail-safe → gap), לא מוצגת.
export function enforceTailoring(tailoring, asset, { neutralize = true } = {}) {
  const res = checkTailoring(tailoring, asset);
  if (res.ok) return { ...tailoring, ok: true };
  if (!neutralize) return { ...tailoring, ok: false, violations: res.violations };
  return {
    ...tailoring,
    hasSource: false, emphasize: [], bridge: '', variants: [],
    stretch: null, evidence_tier: 'weak',
    neutralized: true, ok: false, violations: res.violations,
  };
}
