import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMoney, requiredTurnover, compareClassification, parseDate, certExpiryChecks,
  requirementStatuses, computeGate, goDecisionFromGate, checkStatus,
} from '../src/qualification/index.js';
import { checkThresholds, analyzeMatch } from '../src/engine/stub/index.js';
import { snapshotPrediction, calibration } from '../src/learning/index.js';

const th = (text, company) => checkThresholds(text, company).checks;
const byTopic = (checks, topic) => checks.find((c) => c.topic === topic);

// ---------- עוזרי השוואה ----------
test('parseMoney — פורמטים נפוצים', () => {
  assert.equal(parseMoney('₪8M'), 8e6);
  assert.equal(parseMoney('12 מיליון ₪'), 12e6);
  assert.equal(parseMoney('5,000,000 ש"ח'), 5e6);
  assert.equal(parseMoney('500 אלף'), 5e5);
  assert.equal(parseMoney(''), null);
  assert.equal(parseMoney('לא ידוע'), null);
});

test('requiredTurnover — שנה אינה סכום; אין סכום מפורש = null', () => {
  assert.equal(requiredTurnover('מחזור כספי ממוצע בשנים 2022–2024 של 5 מיליון ₪ לפחות'), 5e6);
  assert.equal(requiredTurnover('מחזור שנתי של ₪ 3,000,000'), 3e6);
  assert.equal(requiredTurnover('על המציע להציג מחזור כספי יציב בשנים 2022-2024'), null);
});

test('compareClassification — השוואה סדרתית (משותפת ל-stub ול-claude)', () => {
  assert.equal(compareClassification('ג-5', 'ג-3'), 'gap');
  assert.equal(compareClassification('ג-3', 'ג-5'), 'met');
  assert.equal(compareClassification('ג-3', 'ב-4'), 'gap');
  assert.equal(compareClassification('ג-3', ''), 'unknown');
});

test('parseDate — שנה בלבד = סוף שנה; dd/mm/yyyy', () => {
  assert.equal(parseDate('2027').toISOString().slice(0, 10), '2027-12-31');
  assert.equal(parseDate('15/09/2026').toISOString().slice(0, 10), '2026-09-15');
  assert.equal(parseDate('לא תאריך'), null);
});

// ---------- תיקוני false Met ----------
test('מחזור — הוזן סכום נמוך מהנדרש = פער (קודם: met רק כי השדה מלא)', () => {
  const c = byTopic(th('נדרש מחזור כספי שנתי של 10 מיליון ₪', { avg_turnover: '₪8M' }), 'turnover');
  assert.equal(c.status, 'gap');
});

test('מחזור — סכום גבוה מהנדרש = עומד (מוצהר)', () => {
  const c = byTopic(th('נדרש מחזור כספי שנתי של 5 מיליון ₪', { avg_turnover: '12 מיליון ₪' }), 'turnover');
  assert.equal(c.status, 'met');
  assert.equal(c.evidence, 'declared');
  assert.equal(checkStatus(c), 'met_claimed'); // הצהרת פרופיל ≠ ראיה
});

test('מחזור — המכרז לא מגדיר סכום = unknown מצד המכרז (לא met)', () => {
  const c = byTopic(th('על המציע להציג מחזור כספי יציב', { avg_turnover: '₪8M' }), 'turnover');
  assert.equal(c.status, 'unknown');
  assert.equal(checkStatus(c), 'unknown_tender');
});

test('עובדים מוסמכים — 1 מול דרישה ל-5 = פער (קודם: met כי >0)', () => {
  const c = byTopic(th('נדרשים 5 עובדים מוסמכים', { certified_staff: '1' }), 'staff');
  assert.equal(c.status, 'gap');
});

test('analyzeMatch (stub) — דרישת חובה לא נחשבת עומדת על סמך מילה משותפת אחת', () => {
  // מושג משותף יחיד ("מים") — מספיק לדרישת רשות, לא לתנאי-סף.
  const kb = { projects: [{ name: 'שדרוג תשתיות מים', dimensions: ['7 יישובים'] }], certifications: [] };
  const text = 'תנאי סף: ניסיון בהפעלת מוקד מים לתושבים';
  assert.equal(analyzeMatch([{ id: 'r1', text, mandatory: false }], kb).met.length, 1);
  assert.equal(analyzeMatch([{ id: 'r1', text, mandatory: true }], kb).met.length, 0);
});

// ---------- תוקף אישורים ----------
test('אישור שפג לפני מועד ההגשה ומוזכר במכרז = פער בתנאי-סף', () => {
  const { checks, warnings } = certExpiryChecks(
    [{ name: 'ISO 9001', valid_until: '2025' }, { name: 'ISO 27001', valid_until: '2030' }],
    { deadline: '15/09/2026', rawText: 'על המציע להחזיק בתקן ISO 9001 בתוקף' },
  );
  assert.equal(checks.length, 1);
  assert.equal(checks[0].status, 'gap');
  assert.equal(warnings.length, 0);
});

test('אישור שפג ואינו מוזכר במכרז = אזהרה בלבד', () => {
  const { checks, warnings } = certExpiryChecks([{ name: 'אישור ניהול ספרים', valid_until: '01/01/2026' }],
    { deadline: '15/09/2026', rawText: 'מכרז לשירותי ייעוץ' });
  assert.equal(checks.length, 0);
  assert.equal(warnings.length, 1);
});

// ---------- השער ----------
const chk = (status, extra = {}) => ({ label: 'x', status, evidence: 'declared', ...extra });

test('gate — תנאי-סף אחד לא מתקיים = FAIL גם כשהשאר עומדים', () => {
  const g = computeGate({ checks: [chk('met'), chk('met'), chk('gap')] });
  assert.equal(g.status, 'FAIL');
  assert.equal(g.blocking[0].status, 'not_met'); // הקריטי ראשון
});

test('gate — unknown כלשהו (בלי FAIL) = HOLD, לעולם לא GO', () => {
  const g = computeGate({ checks: [chk('met'), chk('unknown')] });
  assert.equal(g.status, 'HOLD');
  assert.equal(goDecisionFromGate(g.status), null);
});

test('gate — הכל עומד אך על סמך הצהרה = CONDITIONAL', () => {
  assert.equal(computeGate({ checks: [chk('met'), chk('met')] }).status, 'CONDITIONAL');
});

test('gate — הכל מאומת בראיה = PASS', () => {
  assert.equal(computeGate({ checks: [chk('met', { evidence: 'verified' })] }).status, 'PASS');
});

test('gate — לא זוהו תנאי-סף = HOLD (אין החלטה כפויה)', () => {
  assert.equal(computeGate({ checks: [], requirements: [] }).status, 'HOLD');
});

test('gate — דרישת חובה בלי מקור = unknown → HOLD; דרישת רשות לא משפיעה', () => {
  const reqs = [
    { id: 'a', text: 'תנאי סף: ניסיון בניהול מוקד', mandatory: true },
    { id: 'b', text: 'יתרון: היכרות עם מערכת CRM', mandatory: false },
  ];
  const statuses = requirementStatuses(reqs, { met: [], gaps: [{ id: 'a' }, { id: 'b' }], fails: [] }, []);
  assert.equal(statuses[0].status, 'unknown_company');
  assert.equal(computeGate({ checks: [], requirements: statuses }).status, 'HOLD');
});

test('gate — השלמה ידנית = met_claimed (לא verified) → לכל היותר CONDITIONAL', () => {
  const reqs = [{ id: 'a', text: 'תנאי סף: ניסיון בניהול מוקד', mandatory: true, manual_text: 'כן, ניהלנו מוקד 2023' }];
  const statuses = requirementStatuses(reqs, { met: [], gaps: [{ id: 'a' }], fails: [] }, []);
  assert.equal(statuses[0].status, 'met_claimed');
  assert.equal(computeGate({ requirements: statuses }).status, 'CONDITIONAL');
});

test('gate — דרישה מקושרת לבדיקת-סף לא נספרת פעמיים, ומקבלת את סטטוס הבדיקה', () => {
  const checks = [{ label: 'מחזור', status: 'gap', topic: 'turnover', evidence: 'declared' }];
  const reqs = [{ id: 'a', text: 'תנאי סף: מחזור כספי של 10 מיליון ₪', mandatory: true }];
  const statuses = requirementStatuses(reqs, { met: ['תנאי סף: מחזור כספי של 10 מיליון ₪'], gaps: [], fails: [] }, checks);
  assert.equal(statuses[0].status, 'not_met'); // הבדיקה גוברת על התאמת-מילים לזיכרון
  const g = computeGate({ checks, requirements: statuses });
  assert.equal(g.total, 1);
  assert.equal(g.status, 'FAIL');
});

// ---------- למידה: ה-snapshot נשען על השער ----------
test('snapshotPrediction — gate קובע; HOLD = אין החלטה ולא נספר בכיול', () => {
  assert.equal(snapshotPrediction({ match_score: 90, gate: 'FAIL' }).go_decision, false); // ציון גבוה לא מציל FAIL
  assert.equal(snapshotPrediction({ match_score: 30, gate: 'CONDITIONAL' }).go_decision, true);
  const hold = snapshotPrediction({ match_score: 80, gate: 'HOLD' });
  assert.equal(hold.go_decision, null);
  assert.equal(calibration([{ result: 'lose', prediction: hold }]).n, 0);
});
