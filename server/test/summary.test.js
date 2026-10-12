// summary.test.js — תקציר מכרז למנהל המכרזים: מציג את המכרז בלבד (בלי התאמה לחברה),
// כל פרט כציטוט עם מקור, ו"לא זוהה" במקום ניחוש.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildExecutiveSummary, tenderFacts } from '../src/summary/index.js';

const RAW = [
  'מכרז 61/2026 לשירותי ייעוץ ארגוני — משרד החינוך',
  'אומדן ההתקשרות: 4.5 מיליון ש"ח לשלוש שנים.',
  'לרשות המזמין אופציה להארכת ההתקשרות בשנתיים נוספות.',
  'ייבחר זוכה אחד.',
  '', '-- 1 of 2 --', '',
  'ההצעות ינוקדו: 60% איכות ו-40% מחיר.',
  'כנס מציעים (השתתפות חובה) יתקיים ביום 20/11/2026.',
  'ערבות הגשה בסך 50,000 ש"ח',
  'על הזוכה להציג ביטוח אחריות מקצועית.',
  'פיצוי מוסכם של 1,000 ש"ח לכל יום איחור. תנאי תשלום: שוטף + 60.',
  'מועד הגשה 25/11/2026',
  '', '-- 2 of 2 --', '',
].join('\n');
const tender = { name: 'ייעוץ ארגוני', code: '#61/2026', issuer: 'משרד החינוך', raw_text: RAW,
  deadline: '25/11/2026', question_deadline: null, guarantee: 'ערבות הגשה בסך 50,000 ש"ח', min_turnover: null, classification: null, duration: null };
const reqs = [
  { id: 'r1', text: 'ערבות הגשה בסך 50,000 ש"ח', mandatory: true, category: 'ערבות וביטוח' },
  { id: 'r2', text: 'ניסיון בייעוץ', mandatory: false, category: 'ניסיון' },
];
const today = new Date(2026, 10, 18); // 18/11/2026

test('חילוץ פרטי מכרז: אומדן, אופציה, זוכים, משקלות, כנס חובה, ביטוח, קנסות, תשלום', () => {
  const f = tenderFacts(RAW);
  assert.match(f.estimate, /4\.5 מיליון/);
  assert.match(f.options, /אופציה/);
  assert.match(f.winners, /זוכה אחד/);
  assert.equal(f.evaluation.value, 'איכות 60% · מחיר 40%');
  assert.equal(f.conference.mandatory, true);
  assert.equal(f.conference.date, '20/11/2026');
  assert.match(f.insurance, /אחריות מקצועית/);
  assert.match(f.penalties, /פיצוי מוסכם/);
  assert.match(f.payment, /שוטף \+ 60/);
});

test('"המחיר הנמוך ביותר" → מחיר בלבד', () => {
  assert.equal(tenderFacts('תיבחר ההצעה הזולה ביותר').evaluation.value, 'מחיר בלבד (ההצעה הזולה)');
});

test('התקציר אינו בודק התאמה: אין שער, אין סטטוס עמידה, אין "מה לעשות"', () => {
  const s = buildExecutiveSummary({ tender, requirements: reqs, today });
  assert.equal(s.bottom_line, undefined);
  assert.equal(s.actions, undefined);
  assert.ok(s.conditions.every((c) => !('status' in c)));
  assert.equal(s.conditions.length, 1, 'רק תנאי חובה ברשימת התנאים');
  assert.equal(s.requirements.total, 2);
});

test('כנס מציעים חובה — ראשון במועדים, מסומן, עם ימים שנותרו ועמוד', () => {
  const s = buildExecutiveSummary({ tender, requirements: reqs, today });
  assert.equal(s.dates[0].label, 'כנס מציעים — חובה');
  assert.equal(s.dates[0].alert, true);
  assert.equal(s.dates[0].note, 'בעוד 2 ימים');
  assert.equal(s.dates[0].source.page, 2);
  assert.equal(s.dates.find((d) => d.label === 'מועד הגשה').note, 'בעוד 7 ימים');
});

test('פרט שלא נמצא → "לא זוהה", בלי ערך ממולא', () => {
  const s = buildExecutiveSummary({ tender, requirements: reqs, today });
  const q = s.dates.find((d) => d.label === 'מועד אחרון לשאלות הבהרה');
  assert.equal(q.found, false);
  assert.equal(q.value, null);
  assert.match(q.note, /לא זוהה/);
  const est = buildExecutiveSummary({ tender: { ...tender, raw_text: 'מכרז ללא סכומים' }, today }).about.find((a) => a.label.startsWith('אומדן'));
  assert.equal(est.found, false);
});

test('ספירת ימים קלנדרית; היום עצמו = "יום אחרון"', () => {
  const s = buildExecutiveSummary({ tender: { ...tender, raw_text: '', deadline: '18/11/2026' }, today });
  assert.equal(s.dates.find((d) => d.label === 'מועד הגשה').note, 'היום — יום אחרון');
});
