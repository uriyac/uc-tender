// hebtext.js — פרימיטיבי התאמת-טקסט עברי (דטרמיניסטי, בלי מפתח). משותף למנוע ולשכבת התפירה.
// נרמול: הסרת ניקוד/גרשיים, סופיות→רגילות. נרדפות-תחום. תחיליות כשוויון-בטוח בלבד.
// מילות-סתם מסוננות למניעת התאמות-שווא. (הועבר מ-engine/stub — התנהגות זהה.)

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
const SYN = new Map();

export function canon(w) {
  return String(w || '').toLowerCase()
    .replace(/[֑-ׇ]/g, '')
    .replace(/["'׳״.,:;()\/\\]/g, '')
    .replace(/[ךםןףץ]/g, (c) => FINALS[c]);
}
export function tokens(s) {
  return (s || '').split(/[\s ]+/).map(canon).filter((t) => t.length >= 2 && !STOP.has(t));
}
for (const g of SYN_GROUPS) { const c = canon(g[0]); for (const w of g) SYN.set(canon(w), c); }
// מילה מנורמלת → קנוני (נרדפות). כולל צורת-סמיכות שמרנית: "בקרת"→"בקר" רק אם הצורה
// המקוצרת (ללא ת סופית) היא מילת-נרדפות קיימת — כדי לא ליצור מיזוגי-שווא (מערכת≠מערכה).
export const cn = (w) => {
  if (SYN.has(w)) return SYN.get(w);
  if (w.length >= 4 && w.endsWith('ת') && SYN.has(w.slice(0, -1))) return SYN.get(w.slice(0, -1));
  return w;
};

function prefEq(a, b) {
  if (a.length >= 4 && PREFIX.includes(a[0]) && a.slice(1) === b) return true;
  if (b.length >= 4 && PREFIX.includes(b[0]) && b.slice(1) === a) return true;
  return false;
}

// מספר המושגים הייחודיים המשותפים (canonical). (התנהגות זהה ל-overlap המקורי.)
export function overlap(a, b) {
  return sharedConcepts(a, b).count;
}

// אילו מושגים משותפים — לא רק כמה. מחזיר { count, concepts:Set<canonical> }.
// concepts = הצורות הקנוניות המשותפות; שימושי לתפירה (איזה ממד/מונח באמת חופף).
export function sharedConcepts(a, b) {
  const bt = tokens(b), bCanon = new Set(bt.map(cn));
  const concepts = new Set();
  for (const wa of tokens(a)) {
    const ca = cn(wa);
    let hit = bCanon.has(ca);
    if (!hit) for (const wb of bt) if (prefEq(wa, wb)) { hit = true; break; }
    if (hit) concepts.add(ca);
  }
  return { count: concepts.size, concepts };
}
