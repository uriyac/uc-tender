// guardrail.test.js — אוכף את האינווריאנט המרכזי: אפס-הזיות.
// רץ עם: npm test  (node --test, אפס תלויות חיצוניות)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/engine/stub/index.js';

// --- 1) דרישה ללא מקור וללא השלמה ידנית → סעיף ריק המסומן להשלמה. לעולם לא מומצא. ---
test('Guardrail: דרישה ללא מקור ⇒ needsManual + body ריק (לא מומצא)', () => {
  const { sections } = engine.generateDraft([
    { requirement: 'נדרש ניסיון בבניית כור גרעיני ימי', hasSource: false, dimensions: [] },
  ]);
  const s = sections[0];
  assert.equal(s.needsManual, true, 'חייב להיות מסומן להשלמה ידנית');
  assert.equal(s.body, '', 'ה-body חייב להיות ריק — אסור להמציא תוכן');
  assert.equal(s.sourceProject, null);
});

// --- 2) השלמה ידנית → הטקסט של המשתמש נכנס כמו שהוא, מתויג ידני. לא המצאה של המודל. ---
test('Guardrail: השלמה ידנית ⇒ טקסט המשתמש נכנס, מתויג manual', () => {
  const userText = 'ניהלנו מערכי חיישנים מבוזרים ב-4 מחוזות.';
  const { sections } = engine.generateDraft([
    { requirement: 'דרישה כלשהי', hasSource: false, manualText: userText, dimensions: [] },
  ]);
  const s = sections[0];
  assert.equal(s.needsManual, false);
  assert.equal(s.manual, true);
  assert.equal(s.body, userText, 'ה-body חייב להיות בדיוק הטקסט של המשתמש');
});

// --- 3) דרישה עם מקור → body מבוסס על הפרויקט + ציון ביטחון. ---
test('דרישה עם מקור ⇒ body מבוסס-מקור + confidence + sourceProject', () => {
  const { sections } = engine.generateDraft([
    { requirement: 'ניסיון בתחבורה', hasSource: true, project: 'נתיב ירוק', dimensions: ['11 רשויות'] },
  ]);
  const s = sections[0];
  assert.equal(s.needsManual, false);
  assert.equal(s.sourceProject, 'נתיב ירוק');
  assert.ok(s.body.length > 0, 'body חייב להכיל תוכן');
  assert.ok(s.confidence > 0, 'חייב ציון ביטחון');
});

// --- 4) Smoke test של המסע: מכרז → מיפוי → טיוטה. דרישה ללא מקור נשארת פער. ---
test('Smoke: buildMapping→generateDraft — דרישה ללא מקור נשארת needsManual', () => {
  const kb = {
    projects: [{ name: 'פרויקט בלוקצ׳יין', dimensions: ['בלוקצ׳יין', '5 לקוחות'] }],
    certifications: [],
  };
  const requirements = [
    { text: 'נדרש בלוקצ׳יין מבוזר' },           // יש מקור (טוקן "בלוקצ׳יין" תואם)
    { text: 'נדרש ניסיון בהפעלת צי לוויינים' }, // אין מקור
  ];
  const mapping = engine.buildMapping(requirements, kb);
  assert.equal(mapping[0].hasSource, true, 'הדרישה עם החפיפה חייבת למצוא מקור');
  assert.equal(mapping[1].hasSource, false, 'הדרישה ללא חפיפה חייבת להיות פער');

  const { sections } = engine.generateDraft(mapping);
  assert.equal(sections[1].needsManual, true);
  assert.equal(sections[1].body, '', 'הפער חייב לצאת ריק ומסומן — לא מומצא');
});
