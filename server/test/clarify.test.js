// clarify.test.js — מנוע ההבהרות v1 (03-build/CLARIFICATION-ENGINE.md, מסמך האב §27).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectClarifications, issuerTransition, windowState } from '../src/clarify/index.js';
import { requirementStatuses } from '../src/qualification/index.js';

const item = (status, extra = {}) => ({ kind: 'threshold', label: 'מחזור כספי', topic: 'turnover', status, ...extra });

test('unknown_company → שאלה פנימית שמעדכנת שדה בפרופיל', () => {
  const [c] = detectClarifications([item('unknown_company')]);
  assert.equal(c.target, 'internal');
  assert.equal(c.profile_field, 'avg_turnover');
  assert.equal(c.decision_impact, 'flips_gate');
});

test('unknown_tender → שאלה לעורך המכרז, עם הסעיף והעמוד בנוסח', () => {
  const [c] = detectClarifications([item('unknown_tender', { source: { match: 'exact', page: 4, quote: 'למציע מחזור כספי משמעותי' } })]);
  assert.equal(c.target, 'issuer');
  assert.equal(c.state, 'SUGGESTED');
  assert.match(c.question, /עמ׳ 4/);
  assert.match(c.question, /מחזור כספי משמעותי/);
});

test('מועד שאלות שחלף → WINDOW_CLOSED; ואסור לסמן "נשלח"', () => {
  const today = new Date('2026-10-12');
  const [c] = detectClarifications([item('unknown_tender')], { questionDeadline: '01/10/2026', today });
  assert.equal(c.state, 'WINDOW_CLOSED');
  assert.equal(windowState('01/10/2026', today).open, false);
  assert.equal(windowState('12/10/2026', today).open, true, 'היום האחרון עצמו עדיין פתוח');
  assert.throws(() => issuerTransition('APPROVED', 'sent', { windowOpen: false }), /חלף/);
});

test('מחזור חיים: אין קפיצה ל"נשלח" בלי אישור, ואין "נפתר" בלי תשובה', () => {
  assert.equal(issuerTransition('SUGGESTED', 'approve'), 'APPROVED');
  assert.throws(() => issuerTransition('SUGGESTED', 'sent'));
  assert.equal(issuerTransition('APPROVED', 'sent'), 'SENT');
  assert.throws(() => issuerTransition('SENT', 'resolve'));
  assert.equal(issuerTransition('SENT', 'answer'), 'ANSWERED');
  assert.equal(issuerTransition('ANSWERED', 'ambiguous'), 'AMBIGUOUS');
});

test('תקציב שאלות: מה שהופך את ההחלטה קודם לחיזוק ראיות', () => {
  const out = detectClarifications([item('met_claimed'), item('unknown_company', { topic: 'years', label: 'ניסיון' })]);
  assert.equal(out[0].decision_impact, 'flips_gate');
  assert.equal(out[1].trigger, 'missing_evidence');
});

test('met_verified / not_met → אין שאלה', () => {
  assert.equal(detectClarifications([item('met_verified'), item('not_met')]).length, 0);
});

test('תשובה "לא" בבירור פנימי → not_met; "כן" → לכל היותר met_claimed', () => {
  const reqs = [
    { id: 'r1', text: 'ניסיון בהפעלת מוקד', mandatory: true, company_answer: 'no' },
    { id: 'r2', text: 'צוות דובר ערבית', mandatory: true, company_answer: 'yes', manual_text: 'אושר בבירור פנימי' },
  ];
  const st = requirementStatuses(reqs, {}, []);
  assert.equal(st[0].status, 'not_met');
  assert.equal(st[1].status, 'met_claimed');
});
