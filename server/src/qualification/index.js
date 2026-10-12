// qualification/index.js — שער הכשירות (Eligibility Gate) + סטטוסי דרישות. פונקציות טהורות, key-free.
//
// עיקרון (03-build/CLARIFICATION-ENGINE.md): ההחלטה *מחושבת* מסטטוסי הדרישות — לא מיוצרת ע"י מנוע,
// ולא ממוצעת לציון. תנאי-סף אחד שלא מתקיים = FAIL גם אם 19 אחרים מתקיימים.
// אין מעבר אוטומטי ל-Met: חוסר מידע = Unknown; הצהרה (פרופיל/השלמה ידנית) = Claimed, לא Verified.
//
//   FAIL         ← לפחות תנאי-סף אחד not_met
//   HOLD         ← אין FAIL, ולפחות אחד unknown_* — או שלא זוהו תנאי-סף כלל
//   CONDITIONAL  ← הכל met, אבל לפחות אחד met_claimed (חסרה ראיה)
//   PASS         ← הכל met_verified

export const STATUSES = ['met_verified', 'met_claimed', 'not_met', 'unknown_company', 'unknown_tender', 'needs_clarification'];

// ---------- עוזרי השוואה דטרמיניסטיים (משותפים ל-stub ול-claude) ----------

// "₪8M" · "12 מיליון ₪" · "5,000,000 ש"ח" · "500 אלף" · "8000000" → מספר בשקלים. אחרת null.
export function parseMoney(s) {
  if (s == null) return null;
  if (typeof s === 'number') return Number.isFinite(s) ? s : null;
  const t = String(s).replace(/\s+/g, ' ');
  const m = t.match(/([\d][\d,]*(?:\.\d+)?)\s*(מיליארד|מיליון|מליון|אלף|[MKB]\b)?/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  const unit = (m[2] || '').toUpperCase();
  const mult = /מיליארד|^B$/.test(unit) ? 1e9 : /מיליון|מליון|^M$/.test(unit) ? 1e6 : /אלף|^K$/.test(unit) ? 1e3 : 1;
  return n * mult;
}

export function formatMoney(n) {
  if (n == null) return '—';
  if (n >= 1e6) return `₪${+(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `₪${+(n / 1e3).toFixed(1)}K`;
  return `₪${n}`;
}

// ביטוי כספי מפורש בטקסט (מספר+יחידה/מטבע, או מטבע+מספר) — כדי ששנה ("2022") לא תיקרא כסכום.
const NUM = '(\\d[\\d,]*(?:\\.\\d+)?)';
const UNIT = '(מיליארד|מיליון|מליון|אלף|[MK](?![a-z]))';
const CUR = '(?:₪|ש"?ח|שקל)';
const MONEY_RES = [
  new RegExp(`${CUR}\\s*${NUM}\\s*${UNIT}?`, 'i'),        // ₪ 5 מיליון · ₪5,000,000
  new RegExp(`${NUM}\\s*${UNIT}\\s*${CUR}?`, 'i'),         // 5 מיליון ₪ · 5M
  new RegExp(`${NUM}\\s*${CUR}`, 'i'),                     // 5,000,000 ש"ח
];
export function moneyIn(text) {
  const t = String(text || '');
  let best = null;
  for (const re of MONEY_RES) {
    const m = t.match(re);
    if (m && (best == null || m.index < best.index)) best = { index: m.index, value: parseMoney(`${m[1]} ${m[2] || ''}`) };
  }
  return best ? best.value : null;
}

// סכום-המחזור הנדרש במכרז: הביטוי הכספי המפורש הראשון בחלון קצר אחרי "מחזור". null = המכרז לא מגדיר סכום.
export function requiredTurnover(text) {
  const t = String(text || '');
  const i = t.search(/מחזור/);
  if (i < 0) return null;
  return moneyIn(t.slice(i, i + 120).split('\n')[0]); // אין סכום מפורש → לא מניחים
}

// דרגת סיווג קבלני: אות = ענף, מספר = היקף (1–5). נדרש: אותו ענף ודרגה ≥ הנדרש.
export function compareClassification(required, have) {
  if (!have) return 'unknown';
  const rm = String(required || '').match(/([א-ת])?\s*-?\s*(\d)/);
  const reqLetter = rm && rm[1] ? rm[1] : null;
  const reqNum = rm && rm[2] ? +rm[2] : null;
  if (reqNum == null) return 'met'; // הדרישה בלי דרגה — די בקיום סיווג
  const hm = String(have).match(/([א-ת])?\s*-?\s*(\d)/);
  const haveLetter = hm && hm[1] ? hm[1] : null;
  const haveNum = hm && hm[2] ? +hm[2] : null;
  if (haveNum == null) return 'unknown';
  if (reqLetter && haveLetter && reqLetter !== haveLetter) return 'gap';
  return haveNum >= reqNum ? 'met' : 'gap';
}

// תאריך מ: "2027" (=סוף השנה) · "15/09/2026" · "15.9.26" · ISO. אחרת null.
export function parseDate(s) {
  if (!s) return null;
  const t = String(s).trim();
  if (/^\d{4}$/.test(t)) return new Date(Date.UTC(+t, 11, 31));
  const m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return new Date(Date.UTC(y, +m[2] - 1, +m[1]));
  }
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ---------- נושאי תנאי-סף: קישור דרישה ↔ בדיקת-סף, כדי לא לספור פעמיים ----------
const TOPICS = [
  ['turnover', /מחזור/],
  ['classification', /סיווג קבלני/],
  ['years', /שנות\s*ניסיון/],
  ['public', /גופים ציבוריים|מגזר ציבורי|רשויות מקומיות|משרד ממשלתי|גוף ציבורי/],
  ['staff', /עובדים מוסמכים|רו"?ח|עו"?ד/],
];
export function topicOf(text) {
  const t = String(text || '');
  for (const [k, re] of TOPICS) if (re.test(t)) return k;
  return null;
}

// ---------- תוקף אישורים מול מועד ההגשה ----------
// אישור שפג לפני מועד ההגשה (או היום, אם אין מועד) — ואם המכרז מזכיר אותו, הוא פער בתנאי-סף.
export function certExpiryChecks(certifications = [], { deadline = null, rawText = '', today = new Date() } = {}) {
  const ref = parseDate(deadline) || today;
  const text = String(rawText || '');
  const checks = [], warnings = [];
  for (const c of certifications) {
    const exp = parseDate(c.valid_until);
    if (!exp || exp >= ref) continue;
    const key = String(c.name || '').match(/ISO\s*\d{4,5}/i)?.[0] || c.name;
    const mentioned = !!key && text.replace(/\s+/g, ' ').toLowerCase().includes(String(key).replace(/\s+/g, ' ').toLowerCase());
    const item = {
      label: `תוקף ${c.name}`, required: deadline ? `בתוקף ב-${deadline}` : 'בתוקף',
      have: `פג ${c.valid_until}`, status: 'gap', topic: 'expiry', evidence: c.source_doc_id ? 'document' : 'declared',
      action: `חדש את ${c.name} לפני מועד ההגשה וצרף את האישור המעודכן.`,
    };
    (mentioned ? checks : warnings).push(item);
  }
  return { checks, warnings };
}

// ---------- ראיה לתנאי-סף: מסמך שהמשתמש קישר במפורש ----------
// נושאי-סף שאפשר לגבות במסמך, ושדה הפרופיל שעליו כל אחד נשען. שינוי השדה מבטל את הקישור
// (ראיה לערך הישן אינה ראיה לערך החדש).
export const EVIDENCE_FIELDS = {
  turnover: 'avg_turnover',
  classification: 'classification',
  years: 'senior_experience_years',
  public: 'public_sector_experience',
  staff: 'certified_staff',
};

// מעלה בדיקת-סף שמתקיימת (met) מ'declared' ל-'document' כשהמשתמש קישר לנושא שלה מסמך שקיים במאגר.
// לא נוגע ב-gap/unknown: מסמך לא הופך פער לעמידה. מסמך שנמחק — הקישור לא נחשב.
// evidence: { [topic]: { doc_id } } (company.evidence). docs: רשימת המסמכים של החשבון.
export function applyEvidence(checks = [], evidence = {}, docs = []) {
  const byId = new Map(docs.map((d) => [d.id, d]));
  return checks.map((c) => {
    const link = c.topic && evidence ? evidence[c.topic] : null;
    const doc = link ? byId.get(link.doc_id) : null;
    if (c.status !== 'met' || !doc) return c;
    return { ...c, evidence: 'document', evidence_doc: { id: doc.id, filename: doc.filename } };
  });
}

// ---------- סטטוס לבדיקת-סף ----------
// status של בדיקה: met/gap/unknown. evidence: 'declared' (פרופיל — הצהרה) | 'document' (מסמך שהמשתמש קישר).
// unknown_side: 'tender' כשהמכרז עצמו לא מגדיר את הסף (סכום/דרגה) — לא החברה.
export function checkStatus(c) {
  if (c.status === 'gap') return 'not_met';
  if (c.status === 'unknown') return c.unknown_side === 'tender' ? 'unknown_tender' : 'unknown_company';
  if (c.status === 'met') return (c.evidence === 'document' || c.evidence === 'verified') ? 'met_verified' : 'met_claimed';
  return 'unknown_company';
}

// ---------- סטטוס לדרישה (מתוך analyzeMatch + השלמות ידניות + בדיקות-סף מקושרות) ----------
// התאמה מילולית/סמנטית לזיכרון אינה אימות מול כלל — לכן לכל היותר met_claimed.
export function requirementStatuses(requirements = [], analysis = {}, checks = []) {
  const metTexts = new Set((analysis.met || []).map((m) => (typeof m === 'string' ? m : m.text)));
  const gapIds = new Set((analysis.gaps || []).map((g) => g.id).filter(Boolean));
  const failIds = new Set((analysis.fails || []).map((f) => f.id).filter(Boolean));
  const checkByTopic = new Map();
  for (const c of checks) if (c.topic && !checkByTopic.has(c.topic)) checkByTopic.set(c.topic, c);

  return requirements.map((r) => {
    const topic = topicOf(r.text);
    const linked = topic ? checkByTopic.get(topic) : null;
    let status, basis;
    if (linked) { status = checkStatus(linked); basis = 'threshold'; }
    else if (failIds.has(r.id)) { status = 'not_met'; basis = 'analysis'; }
    else if (r.manual_text) { status = 'met_claimed'; basis = 'manual'; }
    else if (metTexts.has(r.text) && !gapIds.has(r.id)) { status = 'met_claimed'; basis = 'memory'; }
    else { status = 'unknown_company'; basis = 'none'; }
    return { id: r.id, text: r.text, mandatory: !!r.mandatory, category: r.category || null, topic, status, basis };
  });
}

const ACTIONS = {
  not_met: 'תנאי-סף לא מתקיים. בדוק אם ניתן להשלים לפני ההגשה (שותף, קבלן משנה, השלמת מסמך) — אחרת לא לגשת.',
  unknown_company: 'חסר מידע על החברה להכרעה. השלם בפרופיל או העלה מסמך שמוכיח עמידה.',
  unknown_tender: 'המכרז לא מגדיר את הסף במפורש. בדוק בחוברת ובנספחים, או שקול שאלת הבהרה לעורך המכרז.',
  needs_clarification: 'ממתין לתשובת הבהרה.',
  met_claimed: 'מוצהר אך לא מגובה במסמך. קשר ראיה בטאב "תנאי סף" (אישור רו״ח / אישור ביצוע / תעודה).',
};

// ---------- השער ----------
// items: בדיקות-סף (כולן תנאי-סף מעצם טבען) + דרישות חובה שאינן מקושרות לבדיקת-סף.
export function computeGate({ checks = [], requirements = [] } = {}) {
  const linkedTopics = new Set(checks.map((c) => c.topic).filter(Boolean));
  const items = [
    ...checks.map((c) => ({ kind: 'threshold', label: c.label, topic: c.topic || null, status: checkStatus(c), required: c.required, have: c.have, evidence_doc: c.evidence_doc || null, action: c.action || null })),
    ...requirements.filter((r) => r.mandatory && !(r.topic && linkedTopics.has(r.topic)))
      .map((r) => ({ kind: 'requirement', id: r.id, label: r.text, status: r.status, action: null })),
  ].map((it) => ({ ...it, action: it.action || ACTIONS[it.status] || null }));

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const it of items) counts[it.status] = (counts[it.status] || 0) + 1;
  const unknowns = counts.unknown_company + counts.unknown_tender + counts.needs_clarification;

  let status, reason;
  if (!items.length) { status = 'HOLD'; reason = 'לא זוהו תנאי-סף מובנים — אי אפשר להכריע. יש לעבור על החוברת ידנית.'; }
  else if (counts.not_met) { status = 'FAIL'; reason = `${counts.not_met} תנאי-סף לא מתקיימים.`; }
  else if (unknowns) { status = 'HOLD'; reason = `${unknowns} תנאי-סף לא הוכרעו — חסר מידע.`; }
  else if (counts.met_claimed) { status = 'CONDITIONAL'; reason = `כל תנאי-הסף מתקיימים, ${counts.met_claimed} מהם על סמך הצהרה — ממתינים לראיה.`; }
  else { status = 'PASS'; reason = 'כל תנאי-הסף מתקיימים ומגובים בראיה.'; }

  // סדר חשיבות להצגה: לא מתקיים → לא ידוע → מוצהר
  const order = { not_met: 0, unknown_tender: 1, unknown_company: 1, needs_clarification: 1, met_claimed: 2, met_verified: 3 };
  const blocking = items.filter((it) => it.status !== 'met_verified').sort((a, b) => order[a.status] - order[b.status]);
  return { status, reason, total: items.length, counts, blocking, items };
}

// ההמלצה הנגזרת מהשער: GO / NO-GO / אין החלטה (HOLD). HOLD לעולם לא נספר בכיול כ-GO.
export function goDecisionFromGate(gateStatus) {
  if (gateStatus === 'PASS' || gateStatus === 'CONDITIONAL') return true;
  if (gateStatus === 'FAIL') return false;
  return null;
}
