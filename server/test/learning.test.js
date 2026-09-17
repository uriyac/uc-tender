// learning.test.js — לולאת הלמידה (S4.1/S4.2): קטגוריות סגורות, snapshot ניבוי, זיכרון-מפרסם.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REASON_CODES, isValidReasonCode, reasonLabel, snapshotPrediction, issuerMemory, issuerInsight } from '../src/learning/index.js';

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
