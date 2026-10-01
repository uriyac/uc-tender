// learning.test.js — לולאת הלמידה (S4.1/S4.2): קטגוריות סגורות, snapshot ניבוי, זיכרון-מפרסם.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REASON_CODES, isValidReasonCode, reasonLabel, snapshotPrediction, issuerMemory, issuerInsight, reasonDistribution, calibration } from '../src/learning/index.js';

test('reasonDistribution — סופר סיבות הפסד, ממוין מהנפוץ לנדיר', () => {
  const outcomes = [
    { result: 'lose', reason_code: 'price' },
    { result: 'lose', reason_code: 'price' },
    { result: 'lose', reason_code: 'threshold' },
    { result: 'win' }, // זכיות לא נספרות
  ];
  const d = reasonDistribution(outcomes);
  assert.equal(d[0].code, 'price');
  assert.equal(d[0].count, 2);
  assert.equal(d[0].label, 'מחיר');
  assert.equal(d.find((x) => x.code === 'threshold').count, 1);
});

test('calibration — Go/No-Go מול תוצאה, וציון ממוצע זכיות>הפסדים', () => {
  const outcomes = [
    { result: 'win', prediction: { go_decision: true, match_score: 80 } },  // GO→win = נכון
    { result: 'lose', prediction: { go_decision: true, match_score: 62 } }, // GO→lose = שגוי
    { result: 'lose', prediction: { go_decision: false, match_score: 40 } },// NO-GO→lose = נכון
    { result: 'pending', prediction: { go_decision: true, match_score: 90 } }, // לא מוכרע — לא נספר
  ];
  const c = calibration(outcomes);
  assert.equal(c.n, 3);
  assert.equal(c.accuracy, 67); // 2 מתוך 3
  assert.equal(c.avgScoreWon, 80);
  assert.equal(c.avgScoreLost, 51); // (62+40)/2=51
});

test('calibration — ללא נתונים מחזיר n=0', () => {
  assert.equal(calibration([]).n, 0);
});

test('reason codes — רשימה סגורה, ולידציה', () => {
  assert.ok(REASON_CODES.length >= 6);
  assert.ok(isValidReasonCode('price'));
  assert.ok(!isValidReasonCode('made_up_reason'));
  assert.equal(reasonLabel('threshold'), 'אי-עמידה בתנאי סף');
});

test('snapshotPrediction — נועל ניבוי לכיול', () => {
  const p = snapshotPrediction({ match_score: 72, red_flags: 3, red_flags_high: 1 });
  assert.equal(p.match_score, 72);
  assert.equal(p.go_decision, true); // 72 >= 60
  assert.equal(p.red_flags, 3);
  const p2 = snapshotPrediction({ match_score: 40 });
  assert.equal(p2.go_decision, false);
});

test('issuerMemory — אגרגציה + סיבת הפסד נפוצה', () => {
  const tenders = [
    { id: 't1', issuer: 'עיריית כפר סבא' },
    { id: 't2', issuer: 'עיריית כפר סבא' },
    { id: 't3', issuer: 'עיריית כפר סבא' },
    { id: 't4', issuer: 'משרד הבריאות' },
  ];
  const outcomes = [
    { tender_id: 't1', result: 'lose', reason_code: 'formal_disqualification' },
    { tender_id: 't2', result: 'lose', reason_code: 'formal_disqualification' },
    { tender_id: 't3', result: 'win' },
    { tender_id: 't4', result: 'win' },
  ];
  const mem = issuerMemory(tenders, outcomes);
  const ks = mem.get('עיריית כפר סבא');
  assert.equal(ks.submissions, 3);
  assert.equal(ks.wins, 1);
  assert.equal(ks.losses, 2);
  assert.equal(ks.win_rate, 33); // 1/3
  assert.equal(ks.top_loss_reason.code, 'formal_disqualification');
  assert.equal(ks.top_loss_reason.count, 2);
});

test('issuerInsight — סף מינימלי מונע "למידה" מדגימה אחת', () => {
  const tenders = [{ id: 't1', issuer: 'רשות יחידה' }];
  const outcomes = [{ tender_id: 't1', result: 'lose', reason_code: 'price' }];
  assert.equal(issuerInsight('רשות יחידה', tenders, outcomes, 2), null); // הגשה אחת < סף 2
  assert.ok(issuerInsight('רשות יחידה', tenders, outcomes, 1)); // סף 1 → מוצג
});
