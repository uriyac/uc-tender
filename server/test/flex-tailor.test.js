// flex-tailor.test.js — F1: מנוע התפירה (בחירה + תפירה + מד-מתיחה), key-free, עטוף ב-guardrail.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tailorOne, bestAssetFor, tailorRequirements } from '../src/flex/tailor.js';

const water = { name: 'שדרוג מערכת מים כפר סבא', dimensions: ['4 מחוזות', 'בקרת SCADA', 'מוקד שירות 24/7'] };
const data = { name: 'מערכת עיבוד נתונים', dimensions: ['עיבוד נתונים', 'אינטגרציה'] };
const kb = { projects: [water, data] };

test('התאמה ישירה → relevance=direct, ממדים מודגשים, שפת-מכרז מאומצת', () => {
  const t = tailorOne('ניסיון בבקרת SCADA ומוקד שירות', water);
  assert.equal(t.hasSource, true);
  assert.equal(t.relevance, 'direct');
  assert.ok(t.emphasize.includes('בקרת SCADA'));
  assert.ok(t.tender_language.length > 0);         // אימץ מונח מהמכרז
  assert.ok(t.fit_score >= 60);
});

test('התאמה סמוכה (נרדף בלבד, בלי חפיפה מילולית) → adjacent + גשר', () => {
  // "מידע" ↔ "נתונים" נרדפים; אין חפיפה מילולית
  const t = tailorOne('ניהול מידע ארגוני', data);
  assert.equal(t.hasSource, true);
  assert.equal(t.relevance, 'adjacent');
  assert.ok(t.bridge.length > 0);
  assert.ok(t.emphasize.includes('עיבוד נתונים'));
});

test('מחוץ לתחום → gap (לא תופר יש-מאין)', () => {
  const best = bestAssetFor('תכנון כור גרעיני', kb.projects);
  assert.equal(best, null);
  const t = tailorOne('תכנון כור גרעיני', best);
  assert.equal(t.hasSource, false);
  assert.equal(t.bridge, '');
  assert.deepEqual(t.emphasize, []);
});

test('אנטי-הזיה: emphasize תמיד תת-קבוצה של ממדי הנכס (עובר guardrail)', () => {
  const t = tailorOne('בקרה ומוקד ומים', water);
  for (const d of t.emphasize) assert.ok(water.dimensions.includes(d));
  assert.notEqual(t.neutralized, true); // לא נוטרל — כי מעוגן
});

test('אנטי-keyword-stuffing: tender_language רק מונחים שממד תומך בהם', () => {
  // "כור גרעיני" אינו נתמך ע"י אף ממד של water → לא ייכנס ל-tender_language
  const t = tailorOne('בקרת SCADA עבור כור גרעיני', water);
  assert.ok(!t.tender_language.some((w) => /גרעיני|כור/.test(w)));
});

test('בחירת הנכס הטוב ביותר לכל דרישה', () => {
  const out = tailorRequirements([{ text: 'עיבוד נתונים', id: 'r1' }, { text: 'מוקד שירות', id: 'r2' }], kb);
  assert.equal(out[0].project, 'מערכת עיבוד נתונים');
  assert.equal(out[1].project, 'שדרוג מערכת מים כפר סבא');
});
