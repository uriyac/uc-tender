// tailor.js — קומת הגמישות (F1): תפירת נכס-למכרז. דטרמיניסטי, key-free, עטוף ב-enforceTailoring.
//
// כמו התאמת קו״ח למשרה: בוחר את הנכס הרלוונטי ביותר לדרישה, מדגיש את ממדיו התומכים,
// מאמץ את שפת המכרז (רק אם ממד תומך — אנטי-stuffing), בונה גשר וחלופות, ומדווח מד-מתיחה.
// אפס-הזיות: כל טענה מעוגנת בממדי הנכס; enforceTailoring חוסם כל בדיה שחומקת.

import { tokens, canon, cn, sharedConcepts } from '../lib/hebtext.js';
import { enforceTailoring } from '../engine/guardrail.js';
import { countsAsBidder } from './activities.js';

// מה שאפשר לטעון בשם המציע: ממדי הפרויקט + פעילויות שהחברה עצמה ביצעה (flex/activities.js).
const claimDims = (p) => [...(p.dimensions || []), ...(p.activities || []).filter(countsAsBidder).map((a) => a.text)];

// פעילויות רלוונטיות לדרישה שבוצעו ע"י מישהו אחר (קבלן משנה/עובד/לא ידוע) — מוצגות, לא נטענות.
export function excludedFor(requirement, projects = []) {
  const out = [];
  for (const p of projects) {
    for (const a of p.activities || []) {
      // לפחות 2 מושגים משותפים — מילה כללית אחת ("תושבים") אינה הופכת פעילות לרלוונטית
      if (!countsAsBidder(a) && sharedConcepts(a.text, requirement).count >= 2) {
        out.push({ project: p.name, text: a.text, performed_by: a.performed_by });
      }
    }
  }
  return out.slice(0, 3);
}

// חפיפה מילולית (בלי נרדפות) — להבחין 'direct' מ-'adjacent'.
function literalShared(a, b) {
  const bset = new Set(tokens(b));
  return [...new Set(tokens(a))].filter((t) => bset.has(t)).length;
}

// בוחר את הנכס בעל מירב המושגים המשותפים לדרישה. מחזיר null אם אין חפיפה כלל (gap).
export function bestAssetFor(requirement, projects = []) {
  let best = null;
  for (const p of projects) {
    const dimsText = [p.name, ...claimDims(p)].join(' ');
    const concept = sharedConcepts(dimsText, requirement).count;
    if (concept === 0) continue;
    const literal = literalShared(dimsText, requirement);
    if (!best || concept > best.concept || (concept === best.concept && literal > best.literal)) {
      best = { asset: p, concept, literal };
    }
  }
  return best;
}

// מונחי המכרז שראוי לאמץ: מילות-הדרישה שהמושג הקנוני שלהן מכוסה ע"י ממד מודגש (אימוץ סמנטי).
function tenderLanguage(requirement, emphasize) {
  const covered = new Set();
  for (const d of emphasize) for (const c of sharedConcepts(d, requirement).concepts) covered.add(c);
  const seen = new Set(), out = [];
  for (const w of String(requirement || '').split(/[\s,.;:()]+/)) {
    const c = cn(canon(w));
    if (w.length >= 2 && covered.has(c) && !seen.has(c)) { seen.add(c); out.push(w); }
  }
  return out.slice(0, 5);
}

// תופר דרישה יחידה לנכס. מחזיר תפירה (post-enforce) או תפירת-gap אם אין מקור.
export function tailorOne(requirement, asset) {
  if (!asset) {
    return { requirement, project: null, hasSource: false, relevance: null, stretch: null,
      evidence_tier: 'weak', emphasize: [], tender_language: [], bridge: '', variants: [], fit_score: 0, sources: [] };
  }
  const dims = claimDims(asset);
  const emphasize = dims.filter((d) => sharedConcepts(d, requirement).count > 0);
  const conceptTotal = sharedConcepts([asset.name, ...dims].join(' '), requirement).count;
  const literal = literalShared([asset.name, ...emphasize].join(' '), requirement);

  // מד-מתיחה + דרגת-ראיה
  let relevance, stretch, tier;
  if (literal >= 1) { relevance = 'direct'; stretch = 'direct'; tier = literal >= 2 ? 'strong' : 'strong'; }
  else if (conceptTotal >= 2) { relevance = 'adjacent'; stretch = 'adjacent'; tier = 'bridged'; }
  else { relevance = 'adjacent'; stretch = 'stretch'; tier = 'weak'; } // חפיפה דקה (נרדף בודד)

  const fit_score = Math.min(95, 45 + literal * 22 + Math.max(0, conceptTotal - literal) * 11);
  const emp = emphasize.join(', ');
  const bridge = stretch === 'direct'
    ? `בהתבסס על "${asset.name}", לחברה ניסיון ישיר ב${emp} — כנדרש במכרז.`
    : `הניסיון ב"${asset.name}" (${emp}) רלוונטי לדרישה — יכולת סמוכה הניתנת למינוף${stretch === 'stretch' ? ' (התאמה מרחיבה)' : ''}.`;
  const variants = stretch === 'direct'
    ? [`ניסיון מוכח ב${emp}, כפי שבוצע ב"${asset.name}".`, `"${asset.name}" מדגים יכולת ישירה ב${emp}.`]
    : [`ניתן למנף את הניסיון ב${emp} ("${asset.name}") לדרישה זו.`, `"${asset.name}" כולל ${emp} — בסיס רלוונטי לדרישה.`];

  const tailoring = {
    requirement, project: asset.name, hasSource: true,
    relevance, stretch, evidence_tier: tier,
    emphasize, tender_language: tenderLanguage(requirement, emphasize),
    bridge, variants, fit_score,
    sources: [asset.name, ...emphasize],
  };
  // רשת-הביטחון (F0): כל בדיה שחמקה — נחסמת ומנוטרלת ל-gap.
  return enforceTailoring(tailoring, { ...asset, dimensions: dims });
}

// תופר רשימת דרישות מול מאגר הידע. לכל דרישה — הנכס הטוב ביותר, מותפר.
export function tailorRequirements(requirements = [], kb = {}) {
  const projects = kb.projects || [];
  return requirements.map((r) => {
    const text = typeof r === 'string' ? r : r.text;
    const best = bestAssetFor(text, projects);
    const excluded = excludedFor(text, projects);
    return { id: r.id, ...tailorOne(text, best ? best.asset : null), ...(excluded.length ? { excluded } : {}) };
  });
}
