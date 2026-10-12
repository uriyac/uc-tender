// clarify/index.js — מנוע ההבהרות v1 (03-build/CLARIFICATION-ENGINE.md §3–5, מסמך האב §27). פונקציות טהורות.
//
// שתי מערכות נפרדות:
//   internal — שאלה לבעל ידע בחברה (חסר מידע/ראיה אצלנו). התשובה מעדכנת פרופיל/דרישה → Gate מחושב מחדש.
//   issuer   — שאלה רשמית לעורך המכרז (המכרז עצמו לא מגדיר). לעולם לא נשלחת אוטומטית:
//              SUGGESTED → DRAFT → APPROVED → SENT (ע"י אדם, עם תיעוד) → ANSWERED → RESOLVED / AMBIGUOUS.
//              אחרי המועד האחרון לשאלות — WINDOW_CLOSED: הופכת לסיכון, לא לשאלה.
//
// הזיהוי דטרמיניסטי: נגזר מסטטוסי שער הכשירות (unknown_company / unknown_tender / met_claimed),
// לא מ-LLM. "תקציב שאלות": קודם מה שיכול להפוך את ההחלטה (flips_gate).

import { EVIDENCE_FIELDS, parseDate } from '../qualification/index.js';

// שאלה פנימית לפי נושא בדיקת-סף → שדה בפרופיל + סוג תשובה
const TOPIC_Q = {
  turnover: { q: 'מה המחזור הכספי השנתי הממוצע של החברה?', kind: 'text', hint: 'למשל: 8 מיליון ש״ח' },
  classification: { q: 'מה הסיווג הקבלני של החברה (ענף ודרגה)?', kind: 'text', hint: 'למשל: ג-3' },
  years: { q: 'כמה שנות ניסיון יש לחברה בתחום?', kind: 'number', hint: 'מספר שנים' },
  public: { q: 'האם לחברה ניסיון בעבודה עם גופים ציבוריים?', kind: 'yes_no' },
  staff: { q: 'כמה עובדים מוסמכים (רו״ח/עו״ד) מועסקים בחברה?', kind: 'number', hint: 'מספר עובדים' },
};

// שאלה רשמית לעורך המכרז לפי נושא — נוסח מוצע, ניתן לעריכה
const ISSUER_Q = {
  turnover: 'נא להבהיר מהו סכום המחזור הכספי השנתי המינימלי הנדרש, ולאילו שנות כספים הוא מתייחס.',
  classification: 'נא להבהיר מהו הענף והדרגה של הסיווג הקבלני הנדרש.',
  years: 'נא להבהיר ממתי נמדדות שנות הניסיון הנדרשות (עד מועד ההגשה או עד מועד הפרסום).',
};

const clean = (s) => String(s || '').replace(/^\s*\d+[.)]\s*/, '').trim();
const keyOf = (target, item) => `${target}:${item.kind}:${item.topic || item.id || clean(item.label).slice(0, 40)}`;

// האם חלון השאלות לעורך המכרז נסגר. בלי מועד ידוע — פתוח, אבל מסומן "מועד לא ידוע".
export function windowState(questionDeadline, today = new Date()) {
  const d = parseDate(questionDeadline);
  if (!d) return { open: true, known: false, deadline: null };
  const endOfDay = new Date(d.getTime() + 86399999);
  return { open: endOfDay >= today, known: true, deadline: questionDeadline };
}

// מזהה הבהרות מתוך פריטי השער. items: gate.items (עם source אם יש).
export function detectClarifications(items = [], { questionDeadline = null, today = new Date() } = {}) {
  const win = windowState(questionDeadline, today);
  const out = [];
  for (const it of items) {
    const where = it.source && it.source.match !== 'unresolved'
      ? { page: it.source.page, quote: it.source.quote } : null;

    if (it.status === 'unknown_company') {
      const tq = it.kind === 'threshold' ? TOPIC_Q[it.topic] : null;
      out.push({
        key: keyOf('internal', it), target: 'internal', trigger: 'missing_fact',
        requirement_id: it.id || null, topic: it.topic || null, label: clean(it.label),
        question: tq ? tq.q : `האם החברה עומדת בדרישה: "${clean(it.label)}"?`,
        answer_kind: tq ? tq.kind : 'yes_no', hint: tq?.hint || null,
        profile_field: tq ? EVIDENCE_FIELDS[it.topic] || null : null,
        why_it_matters: 'תנאי-סף שלא הוכרע — בלי תשובה ההמלצה נשארת "עצור".',
        decision_impact: 'flips_gate', source: where,
      });
    } else if (it.status === 'unknown_tender') {
      const where2 = where ? `סעיף במכרז${where.page ? ` (עמ׳ ${where.page})` : ''}: "${where.quote}"` : `תנאי: "${clean(it.label)}"`;
      out.push({
        key: keyOf('issuer', it), target: 'issuer', trigger: 'missing_tender_info',
        requirement_id: it.id || null, topic: it.topic || null, label: clean(it.label),
        question: `${where2}.\n${ISSUER_Q[it.topic] || `נא להבהיר את דרישת הסעיף ואת אופן ההוכחה הנדרש.`}`,
        answer_kind: 'free',
        why_it_matters: 'המכרז לא מגדיר את הסף — אי אפשר להכריע עמידה בלי הבהרה רשמית.',
        decision_impact: 'flips_gate', source: where,
        window: win, state: win.open ? 'SUGGESTED' : 'WINDOW_CLOSED',
      });
    } else if (it.status === 'met_claimed' && it.kind === 'threshold' && EVIDENCE_FIELDS[it.topic]) {
      // רק היכן שאפשר לענות בפועל: בדיקת-סף שניתן לקשר לה מסמך (PUT /company/evidence)
      out.push({
        key: keyOf('internal', { ...it, kind: 'evidence' }), target: 'internal', trigger: 'missing_evidence',
        requirement_id: it.id || null, topic: it.topic || null, label: clean(it.label),
        question: `איזה מסמך מוכיח את "${clean(it.label)}"? (אישור רו״ח / אישור ביצוע / תעודה)`,
        answer_kind: 'upload',
        why_it_matters: 'מוצהר אך לא מגובה — ההמלצה לכל היותר "בכפוף לראיות".',
        decision_impact: 'strengthens', source: where,
      });
    }
  }
  // תקציב שאלות: קודם מה שהופך את ההחלטה, אחר כך חיזוק ראיות
  const rank = { flips_gate: 0, strengthens: 1 };
  return out.sort((a, b) => rank[a.decision_impact] - rank[b.decision_impact]);
}

// מכונת המצבים של שאלה לעורך המכרז. מחזיר את המצב החדש או זורק שגיאה (מעבר לא חוקי).
const ISSUER_FLOW = {
  approve: { from: ['SUGGESTED', 'DRAFT'], to: 'APPROVED' },
  edit: { from: ['SUGGESTED', 'DRAFT', 'APPROVED'], to: 'DRAFT' },
  sent: { from: ['APPROVED'], to: 'SENT' },
  answer: { from: ['SENT'], to: 'ANSWERED' },
  resolve: { from: ['ANSWERED'], to: 'RESOLVED' },
  ambiguous: { from: ['ANSWERED'], to: 'AMBIGUOUS' },
  dismiss: { from: ['SUGGESTED', 'DRAFT', 'APPROVED', 'WINDOW_CLOSED'], to: 'DISMISSED' },
};
export function issuerTransition(state, action, { windowOpen = true } = {}) {
  const f = ISSUER_FLOW[action];
  if (!f) throw new Error('פעולה לא מוכרת');
  if (!f.from.includes(state)) throw new Error(`לא ניתן "${action}" במצב ${state}`);
  if (action === 'sent' && !windowOpen) throw new Error('המועד האחרון לשאלות הבהרה חלף — אין לשלוח שאלה; תעד כסיכון.');
  return f.to;
}
