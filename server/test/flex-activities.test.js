// flex-activities.test.js — גמישות 2.0 (מסמך האב §28.4, §29): מי ביצע את הפעילות.
// רק פעילות של החברה עצמה נטענת כניסיון המציע. קבלן משנה / עובד / לא ידוע — מוצג, לא נטען.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanActivity, cleanActivities, kbForClaims, countsAsBidder } from '../src/flex/activities.js';
import { tailorRequirements } from '../src/flex/tailor.js';
import { extractKnowledge } from '../src/engine/stub/index.js';

const project = (activities, dimensions = []) => ({ id: 'p1', name: 'קשרי קהילה — כביש 6', year: '2024', dimensions, activities });

test('נרמול: performed_by לא מוכר → unknown (לא מניחים "החברה")', () => {
  assert.equal(cleanActivity({ text: 'ניתוח נתוני סקר', performed_by: 'אנחנו' }, 'a').performed_by, 'unknown');
  assert.equal(cleanActivity({ text: '   ' }, 'a'), null);
  assert.equal(cleanActivities([{ text: 'x' }, null, { text: '' }]).length, 1);
});

test('kbForClaims: רק פעילות של החברה מצטרפת לממדים שמהם נבנות טענות', () => {
  const kb = { projects: [project([
    { text: 'ניתוח נתוני סקר תושבים', performed_by: 'company' },
    { text: 'מוקד טלפוני', performed_by: 'subcontractor' },
    { text: 'ניהול קמפיין', performed_by: 'unknown' },
  ], ['קשרי קהילה'])] };
  const dims = kbForClaims(kb).projects[0].dimensions;
  assert.ok(dims.includes('ניתוח נתוני סקר תושבים'));
  assert.ok(!dims.includes('מוקד טלפוני'), 'פעילות קבלן משנה נכנסה לטענות');
  assert.ok(!dims.includes('ניהול קמפיין'), 'פעילות שלא ידוע מי ביצע נכנסה לטענות');
});

test('תפירה: דרישה שנתמכת רק בפעילות של קבלן משנה → אין מקור, ומוצגת כ"לא נחשבת"', () => {
  const kb = { projects: [project([{ text: 'הפעלת מוקד טלפוני לתושבים', performed_by: 'subcontractor' }], ['קשרי קהילה'])] };
  const [t] = tailorRequirements([{ id: 'r1', text: 'ניסיון בהפעלת מוקד טלפוני' }], kb);
  assert.equal(t.hasSource, false);
  assert.equal(t.excluded.length, 1);
  assert.equal(t.excluded[0].performed_by, 'subcontractor');
});

test('תפירה: אותה פעילות כשהחברה ביצעה → נטענת, ומודגשת', () => {
  const kb = { projects: [project([{ text: 'הפעלת מוקד טלפוני לתושבים', performed_by: 'company' }], ['קשרי קהילה'])] };
  const [t] = tailorRequirements([{ id: 'r1', text: 'ניסיון בהפעלת מוקד טלפוני' }], kb);
  assert.equal(t.hasSource, true);
  assert.ok(t.emphasize.includes('הפעלת מוקד טלפוני לתושבים'));
  assert.equal(t.excluded, undefined);
});

test('stub extractKnowledge: פעילויות מחולצות; קבלן משנה מזוהה; ברירת מחדל unknown', () => {
  const doc = 'סקר תושבים — עיריית חיפה\nשנה: 2023\nתכנון וניתוח סקר תושבים ב-12 שכונות.\nהפעלת מוקד טלפוני לאיסוף תשובות בוצעה על ידי קבלן משנה.';
  const { projects } = extractKnowledge(doc, { filename: 'סקר.docx' });
  const acts = projects[0].activities;
  assert.ok(acts.length >= 2);
  assert.ok(acts.some((a) => a.performed_by === 'subcontractor'));
  assert.ok(acts.every((a) => a.performed_by !== 'company'), 'הניח "החברה" בלי שנכתב במפורש');
  assert.ok(countsAsBidder({ performed_by: 'company' }) && !countsAsBidder({ performed_by: 'employee' }));
});
