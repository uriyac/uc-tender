// source-span.test.js — איתור מקור לדרישה (עמוד + ציטוט), מסמך האב §28.3.
// דרישה שלא מופיעה במסמך חייבת לצאת 'unresolved' — זו גם רשת ביטחון נגד דרישה שהמנוע המציא.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { locate, locateAll, prepare, normalize } from '../src/lib/sourceSpan.js';

// פורמט pdf-parse: סימון סוף-עמוד אחרי תוכן כל עמוד
const PDF = [
  'מכרז פומבי 12/2026 לשירותי ייעוץ', '',
  '-- 1 of 3 --', '',
  'תנאי סף:', '1. למציע מחזור כספי שנתי של 5 מיליון ש"ח לפחות בכל אחת מהשנים 2023-2025.', '',
  '-- 2 of 3 --', '',
  '2. למציע ניסיון של 3 שנים לפחות במתן שירותים',
  'לגופים ציבוריים.', '',
  '-- 3 of 3 --', '',
].join('\n');

test('נוסח מלא → exact + העמוד הנכון', () => {
  const s = locate('למציע מחזור כספי שנתי של 5 מיליון ש"ח לפחות בכל אחת מהשנים 2023-2025.', prepare(PDF));
  assert.equal(s.match, 'exact');
  assert.equal(s.page, 2);
  assert.match(s.quote, /מחזור כספי/);
});

test('דרישה שנשברה לשתי שורות → נמצאת, בעמוד שבו היא מתחילה', () => {
  const s = locate('למציע ניסיון של 3 שנים לפחות במתן שירותים לגופים ציבוריים', prepare(PDF));
  assert.notEqual(s.match, 'unresolved');
  assert.equal(s.page, 3);
});

test('ניסוח מחדש של המנוע (רוב המילים) → approx', () => {
  const s = locate('מחזור כספי שנתי 5 מיליון ש"ח לפחות', prepare(PDF));
  assert.ok(['exact', 'approx'].includes(s.match));
  assert.equal(s.page, 2);
});

test('דרישה שלא קיימת במסמך → unresolved, בלי עמוד ובלי ציטוט', () => {
  const s = locate('נדרשת תעודת ISO 27001 בתוקף', prepare(PDF));
  assert.equal(s.match, 'unresolved');
  assert.equal(s.page, null);
  assert.equal(s.quote, null);
});

test('מסמך בלי סימוני עמוד (Word/טקסט) → נמצא, page=null', () => {
  const s = locate('ערבות הגשה בסך 50,000 ש"ח', prepare('תנאים\nערבות הגשה בסך 50,000 ש"ח\n'));
  assert.equal(s.match, 'exact');
  assert.equal(s.page, null);
});

test('נרמול: Markdown וגרשיים לא מפילים התאמה', () => {
  assert.equal(normalize('**ש״ח** | "ניסיון"'), normalize('ש"ח ניסיון'));
});

test('locateAll — כיסוי: כמה דרישות אותרו מתוך הכלל', () => {
  const reqs = [
    { id: 'a', text: 'למציע מחזור כספי שנתי של 5 מיליון ש"ח לפחות' },
    { id: 'b', text: 'דרישה מומצאת לגמרי שאין לה זכר' },
  ];
  const out = locateAll(reqs, PDF);
  assert.equal(out.located, 1);
  assert.equal(out.total, 2);
  assert.equal(out.hasPages, true);
  assert.equal(out.byId.get('b').match, 'unresolved');
});
