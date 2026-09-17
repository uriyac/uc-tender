// flexibility-guardrail.test.js — F0: רשת-האימות לשכבת התפירה (אפס-הזיות).
// הכלל: מסגור-מחדש מותר; המצאת עובדה קשיחה או הדגשת ממד-שאינו-קיים — נחסמים.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTailoring, enforceTailoring } from '../src/engine/guardrail.js';

const asset = {
  name: 'שדרוג מערכת מים כפר סבא',
  dimensions: ['4 מחוזות', 'בקרת SCADA', 'מוקד שירות 24/7', 'ISO 9001'],
};

test('תפירה מעוגנת (הדגשת ממדים קיימים) → עוברת', () => {
  const t = {
    requirement: 'ניסיון בבקרה ומוקד', emphasize: ['בקרת SCADA', 'מוקד שירות 24/7'],
    bridge: 'הפרויקט כלל בקרת SCADA ומוקד שירות — רלוונטי ישירות לדרישה.',
    variants: ['ניסיון מוכח בבקרה ומוקד שירות.'],
  };
  assert.equal(checkTailoring(t, asset).ok, true);
});

test('הדגשת ממד שאינו של הנכס → הפרה', () => {
  const t = { requirement: 'x', emphasize: ['ניהול נמלים'], bridge: '', variants: [] };
  const r = checkTailoring(t, asset);
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.type === 'emphasize' && v.value === 'ניהול נמלים'));
});

test('עובדה קשיחה מומצאת ב-bridge (12 מחוזות במקום 4) → הפרה', () => {
  const t = { requirement: 'x', emphasize: ['4 מחוזות'], bridge: 'ניהלנו 12 מחוזות בפרויקט.', variants: [] };
  const r = checkTailoring(t, asset);
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.type === 'fact'));
});

test('שנה מומצאת ב-variant → הפרה', () => {
  const t = { requirement: 'x', emphasize: [], bridge: '', variants: ['הוקם בשנת 2019 עם תקן ISO 9001.'] };
  const r = checkTailoring(t, asset);
  assert.equal(r.ok, false); // 2019 לא בנכס
});

test('מסגור-מחדש של ממד קיים לדרישה סמוכה → עובר (זו הגמישות)', () => {
  const t = {
    requirement: 'ניהול נתונים בזמן אמת', emphasize: ['בקרת SCADA'],
    bridge: 'בקרת SCADA כוללת ניטור נתונים בזמן אמת — יכולת סמוכה רלוונטית.',
    variants: [],
  };
  assert.equal(checkTailoring(t, asset).ok, true); // אין עובדה קשיחה מומצאת; מסגור לגיטימי
});

test('תפירה ריקה (gap) → ok (אין מה לזייף)', () => {
  assert.equal(checkTailoring({ requirement: 'כור גרעיני', emphasize: [], bridge: '', variants: [] }, asset).ok, true);
});

test('enforceTailoring — תפירה מזויפת מנוטרלת ל-gap בטוח', () => {
  const bad = { requirement: 'x', hasSource: true, emphasize: ['ניהול נמלים'], bridge: 'ניהלנו 50 נמלים.', variants: ['x'] };
  const safe = enforceTailoring(bad, asset);
  assert.equal(safe.ok, false);
  assert.equal(safe.neutralized, true);
  assert.equal(safe.hasSource, false);
  assert.equal(safe.bridge, '');
  assert.deepEqual(safe.emphasize, []);
});
