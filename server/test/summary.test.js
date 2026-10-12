// summary.test.js — תקציר מנהלים: הרכבה בלבד, מקור לכל פרט, "לא זוהה" במקום ניחוש.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildExecutiveSummary } from '../src/summary/index.js';

const RAW = 'מכרז 61/2026 — משרד החינוך\nערבות הגשה בסך 50,000 ש"ח\n\n-- 1 of 2 --\n\nמועד הגשה 25/11/2026\n\n-- 2 of 2 --\n';
const tender = { name: 'ייעוץ ארגוני', code: '#61/2026', issuer: 'משרד החינוך', raw_text: RAW,
  deadline: '25/11/2026', question_deadline: null, guarantee: 'ערבות הגשה בסך 50,000 ש"ח', min_turnover: null, classification: null, duration: null };
const gate = { status: 'HOLD', reason: '1 תנאי-סף לא הוכרעו', items: [
  { label: 'מחזור כספי', status: 'unknown_company', action: 'השלם בפרופיל' },
  { label: 'ניסיון 5 שנים', status: 'met_verified' },
] };
const today = new Date('2026-11-20T09:00:00Z');

test('השורה התחתונה = שער הכשירות המחושב, עם ספירת תנאים', () => {
  const s = buildExecutiveSummary({ tender, gate, today });
  assert.equal(s.bottom_line.gate, 'HOLD');
  assert.match(s.bottom_line.text, /עצור/);
  assert.equal(s.bottom_line.counts.met_verified, 1);
  assert.equal(s.bottom_line.counts.unknown, 1);
});

test('פרט שנמצא — עם ערך, עמוד במקור, וימים שנותרו', () => {
  const s = buildExecutiveSummary({ tender, gate, today });
  const sub = s.dates.find((d) => d.label === 'מועד הגשה');
  assert.equal(sub.found, true);
  assert.equal(sub.source.page, 2);
  assert.match(sub.note, /בעוד 5 ימים/); // 20/11 → 25/11 = 5 ימים קלנדריים
  assert.equal(s.money.find((m) => m.label === 'ערבות').source.page, 1);
});

test('פרט שלא נמצא במכרז → "לא זוהה", בלי ערך ממולא', () => {
  const s = buildExecutiveSummary({ tender, gate, today });
  const q = s.dates.find((d) => d.label === 'מועד אחרון לשאלות הבהרה');
  assert.equal(q.found, false);
  assert.equal(q.value, null);
  assert.match(q.note, /לא זוהה/);
  assert.ok(s.coverage.missing_fields.includes('משך ההתקשרות'));
  assert.ok(!s.coverage.missing_fields.includes('סיווג קבלני נדרש'), 'סיווג חסר = לא נדרש, לא "חסר"');
});

test('פעולות: תנאי שלא מתקיים בראש הרשימה; תנאי מאומת ללא פעולה', () => {
  const g = { status: 'FAIL', reason: '', items: [{ label: 'סיווג', status: 'not_met', action: 'x' }, { label: 'ניסיון', status: 'met_verified', action: 'y' }] };
  const s = buildExecutiveSummary({ tender, gate: g, today });
  assert.match(s.actions[0], /לא מתקיימים/);
  assert.equal(s.thresholds.find((t) => t.status === 'met_verified').action, null);
});
