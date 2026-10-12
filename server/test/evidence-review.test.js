// evidence-review.test.js — שני עקרונות שהיו חסרים בקוד (03-build/SPEC-V2-AUDIT.md §2):
//   2.1 בדיקת-סף שמגובה במסמך שהמשתמש קישר → met_verified (PASS אפשרי בפועל, לא רק בטסט).
//   2.2 ידע שהמנוע חילץ = הצעה (proposed). לא משתתף בהתאמה/בשער עד שאדם מאשר.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyEvidence, checkStatus, computeGate } from '../src/qualification/index.js';
import { createAccount, for as forAccount } from '../src/data/store.js';

const met = (topic) => ({ label: topic, status: 'met', topic, evidence: 'declared' });
const docs = [{ id: 'doc_1', filename: 'אישור רוח 2025.pdf' }];

test('ראיה: met + מסמך מקושר וקיים → met_verified, עם שם המסמך', () => {
  const [c] = applyEvidence([met('turnover')], { turnover: { doc_id: 'doc_1' } }, docs);
  assert.equal(c.evidence, 'document');
  assert.equal(c.evidence_doc.filename, 'אישור רוח 2025.pdf');
  assert.equal(checkStatus(c), 'met_verified');
});

test('ראיה: בלי קישור — נשאר הצהרה (met_claimed)', () => {
  const [c] = applyEvidence([met('turnover')], {}, docs);
  assert.equal(checkStatus(c), 'met_claimed');
});

test('ראיה: קישור למסמך שנמחק לא נחשב', () => {
  const [c] = applyEvidence([met('turnover')], { turnover: { doc_id: 'doc_gone' } }, docs);
  assert.equal(checkStatus(c), 'met_claimed');
});

test('ראיה: מסמך לא הופך פער לעמידה', () => {
  const gap = { label: 'מחזור', status: 'gap', topic: 'turnover', evidence: 'declared' };
  const [c] = applyEvidence([gap], { turnover: { doc_id: 'doc_1' } }, docs);
  assert.equal(checkStatus(c), 'not_met');
});

test('שער: כל תנאי-הסף מגובים במסמכים → PASS (היה בלתי ניתן להשגה)', () => {
  const ev = { turnover: { doc_id: 'doc_1' }, years: { doc_id: 'doc_1' } };
  const checks = applyEvidence([met('turnover'), met('years')], ev, docs);
  assert.equal(computeGate({ checks }).status, 'PASS');
});

test('שער: אחד מגובה ואחד מוצהר → CONDITIONAL', () => {
  const checks = applyEvidence([met('turnover'), met('years')], { turnover: { doc_id: 'doc_1' } }, docs);
  assert.equal(computeGate({ checks }).status, 'CONDITIONAL');
});

test('אישור: פריט proposed לא נכנס ל-knowledge(); אחרי אישור — נכנס; נדחה — לא', () => {
  const s = forAccount(createAccount({ name: 'בדיקת אישור ' + Date.now() }).id);
  const manual = s.insert('projects', { name: 'ידני', dimensions: [] });              // בלי review = מאושר
  const proposed = s.insert('projects', { name: 'הצעה', dimensions: [], review: 'proposed' });
  const toReject = s.insert('certifications', { name: 'ISO 9001', review: 'proposed' });

  let kb = s.knowledge();
  assert.deepEqual(kb.projects.map((p) => p.id), [manual.id]);
  assert.equal(kb.certifications.length, 0);
  assert.equal(s.pendingKnowledge().projects.length, 1);
  assert.equal(s.pendingKnowledge().certifications.length, 1);

  s.update('projects', proposed.id, { review: 'approved' });
  s.update('certifications', toReject.id, { review: 'rejected' });
  kb = s.knowledge();
  assert.ok(kb.projects.some((p) => p.id === proposed.id), 'פרויקט מאושר חסר בידע הפעיל');
  assert.equal(kb.certifications.length, 0, 'אישור שנדחה נכנס לידע הפעיל');
  assert.equal(s.pendingKnowledge().projects.length + s.pendingKnowledge().certifications.length, 0);
});
