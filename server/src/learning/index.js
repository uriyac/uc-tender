// learning/index.js — לולאת הלמידה (S4). קטגוריות-סיבה סגורות, snapshot של הניבוי,
// ואגרגציית זיכרון-מפרסם. הכל דטרמיניסטי, key-free, ומזין את המנוע כ-context בהמשך.
//
// עיקרון: reason_code מרשימה סגורה (ניתן לצבור התפלגות); הטקסט החופשי הוא "צבע" בלבד
// ולעולם לא נכנס כעובדה למאגר (אפס-הזיות).

import { goDecisionFromGate } from '../qualification/index.js';

// קטגוריות-סיבה סגורות (בעיקר לכישלון; לזכייה — win_factor אופציונלי מאותה רשימה רלוונטית).
export const REASON_CODES = [
  { code: 'price', label: 'מחיר' },
  { code: 'technical_score', label: 'ניקוד טכני' },
  { code: 'missing_doc', label: 'חוסר מסמך / כשירות' },
  { code: 'threshold', label: 'אי-עמידה בתנאי סף' },
  { code: 'formal_disqualification', label: 'פסילה טכנית (פורמלית)' },
  { code: 'buyer_discretion', label: 'החלטת מזמין / שיקול דעת' },
  { code: 'cancelled', label: 'ביטול המכרז' },
  { code: 'other', label: 'אחר' },
];
const CODES = new Set(REASON_CODES.map((r) => r.code));
export const reasonLabel = (code) => (REASON_CODES.find((r) => r.code === code) || {}).label || code;
export const isValidReasonCode = (code) => CODES.has(code);

// נעילת ה"ניבוי" בזמן סגירת המכרז — הבסיס לכיול (predicted vs actual).
// ההחלטה נגזרת משער הכשירות (gate) כשקיים: PASS/CONDITIONAL=GO, FAIL=NO-GO, HOLD=אין החלטה (null —
// לא נספר בכיול). מכרזים ישנים בלי gate: נפילה לסף-הציון ההיסטורי (score>=60).
export function snapshotPrediction(tender = {}) {
  const score = tender.match_score;
  return {
    match_score: score ?? null,
    gate: tender.gate || null,
    go_decision: tender.gate ? goDecisionFromGate(tender.gate) : (score != null ? score >= 60 : null),
    red_flags: tender.red_flags || 0,
    red_flags_high: tender.red_flags_high || 0,
  };
}

// זיכרון-מפרסם (S4.2): אגרגציה של תוצאות לפי issuer.
// tenders + outcomes → לכל מפרסם: הגשות, זכיות, הפסדים, סיבת הפסד נפוצה.
export function issuerMemory(tenders = [], outcomes = []) {
  const byTender = new Map(tenders.map((t) => [t.id, t]));
  const acc = new Map(); // issuer → stats
  for (const o of outcomes) {
    const t = byTender.get(o.tender_id);
    if (!t || !t.issuer) continue;
    const key = t.issuer.trim();
    if (!acc.has(key)) acc.set(key, { issuer: key, submissions: 0, wins: 0, losses: 0, reasons: {} });
    const s = acc.get(key);
    s.submissions++;
    if (o.result === 'win') s.wins++;
    else if (o.result === 'lose') {
      s.losses++;
      if (o.reason_code) s.reasons[o.reason_code] = (s.reasons[o.reason_code] || 0) + 1;
    }
  }
  // סיבת הפסד נפוצה + win-rate
  for (const s of acc.values()) {
    const decided = s.wins + s.losses;
    s.win_rate = decided ? Math.round((s.wins / decided) * 100) : null;
    const top = Object.entries(s.reasons).sort((a, b) => b[1] - a[1])[0];
    s.top_loss_reason = top ? { code: top[0], label: reasonLabel(top[0]), count: top[1] } : null;
  }
  return acc;
}

// התפלגות סיבות-הפסד (S4): לכל קוד — כמה פעמים. ממויין מהנפוץ לנדיר.
export function reasonDistribution(outcomes = []) {
  const d = {};
  for (const o of outcomes) if (o.result === 'lose' && o.reason_code) d[o.reason_code] = (d[o.reason_code] || 0) + 1;
  return Object.entries(d)
    .map(([code, count]) => ({ code, label: reasonLabel(code), count }))
    .sort((a, b) => b.count - a.count);
}

// כיול ניבוי (S4.3): predicted (go_decision/match_score בזמן הסגירה) מול actual (win/lose).
// מודד כמה ההמלצה GO/NO-GO צדקה, ואם הציון הממוצע בזכיות גבוה מההפסדים (סימן לכיול תקין).
export function calibration(outcomes = []) {
  const decided = outcomes.filter((o) => (o.result === 'win' || o.result === 'lose') && o.prediction && o.prediction.go_decision != null);
  if (!decided.length) return { n: 0, accuracy: null, avgScoreWon: null, avgScoreLost: null };
  let correct = 0; const winScores = [], loseScores = [];
  for (const o of decided) {
    const predictedGo = !!o.prediction.go_decision, won = o.result === 'win';
    if (predictedGo === won) correct++; // GO→זכייה או NO-GO→הפסד = ניבוי נכון
    if (o.prediction.match_score != null) (won ? winScores : loseScores).push(o.prediction.match_score);
  }
  const avg = (a) => (a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : null);
  return { n: decided.length, accuracy: Math.round((correct / decided.length) * 100), avgScoreWon: avg(winScores), avgScoreLost: avg(loseScores) };
}

// זיכרון למפרסם בודד (לבאנר בהזנת מכרז). דורש סף מינימלי כדי לא "ללמוד" מדגימה אחת.
export function issuerInsight(issuer, tenders, outcomes, minSubmissions = 2) {
  if (!issuer) return null;
  const mem = issuerMemory(tenders, outcomes).get(issuer.trim());
  if (!mem || mem.submissions < minSubmissions) return null;
  return mem;
}
