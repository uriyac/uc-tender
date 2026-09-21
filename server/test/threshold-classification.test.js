import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkThresholds } from '../src/engine/stub/index.js';

const clsStatus = (reqText, have) => {
  const { checks } = checkThresholds(reqText, { classification: have });
  const c = checks.find((x) => x.label.includes('סיווג'));
  return c ? c.status : null;
};

test('סיווג קבלני — דרגה נמוכה מהנדרש = פער', () => {
  assert.equal(clsStatus('סיווג קבלני ג-5 לפחות', 'ג-3'), 'gap');
});

test('סיווג קבלני — דרגה שווה לנדרש = עומד', () => {
  assert.equal(clsStatus('סיווג קבלני ג-5 לפחות', 'ג-5'), 'met');
});

test('סיווג קבלני — דרגה גבוהה מהנדרש = עומד', () => {
  assert.equal(clsStatus('סיווג קבלני ג-3 לפחות', 'ג-5'), 'met');
});

test('סיווג קבלני — ענף אחר = פער', () => {
  assert.equal(clsStatus('סיווג קבלני ג-3', 'ב-4'), 'gap');
});

test('סיווג קבלני — לא הוזן = unknown', () => {
  assert.equal(clsStatus('סיווג קבלני ג-5', ''), 'unknown');
});

test('סיווג קבלני — דרישה בלי דרגה + יש סיווג = עומד', () => {
  assert.equal(clsStatus('נדרש סיווג קבלני בתוקף', 'ג-2'), 'met');
});
