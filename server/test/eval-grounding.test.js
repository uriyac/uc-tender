// eval-grounding.test.js — אותה טענה כמו promptfoo, בלי רשת: דרישה שלא במסמך נכשלת.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import assertGrounded from '../eval/assert-grounded.mjs';

const TEXT = 'על המציע להיות בעל ניסיון של 5 שנים לפחות בביצוע פרויקטים דומים.';

test('דרישה שמופיעה במכרז עוברת', () => {
  const result = assertGrounded(JSON.stringify({
    requirements: [{ text: 'על המציע להיות בעל ניסיון של 5 שנים לפחות בביצוע פרויקטים דומים.' }],
  }), { vars: { text: TEXT } });
  assert.equal(result.pass, true);
  assert.equal(result.score, 1);
});

test('דרישה שהומצאה ולא נמצאת במסמך נכשלת', () => {
  const result = assertGrounded(JSON.stringify({
    requirements: [
      { text: 'על המציע להיות בעל ניסיון של 5 שנים לפחות בביצוע פרויקטים דומים.' },
      { text: 'נדרשת תעודת ISO 27001 בתוקף ורישיון טיס מסחרי' },
    ],
  }), { vars: { text: TEXT } });
  assert.equal(result.pass, false);
  assert.ok(result.score < 1);
  assert.match(result.reason, /ISO 27001/);
});

test('בלי דרישות — נכשל', () => {
  const result = assertGrounded(JSON.stringify({ requirements: [] }), { vars: { text: TEXT } });
  assert.equal(result.pass, false);
});
