// isolation.test.js — S6.3: בידוד ריבוי-דיירים. חשבון אחד לעולם לא רואה נתוני חשבון אחר.
// הבידוד נאכף מבנית ב-store.forAccount — כל שאילתה מזריקה account_id=?.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAccount, for as forAccount } from '../src/data/store.js';

test('בידוד רשומות: A לא רואה את הרשומות של B', () => {
  const a = createAccount({ name: 'חשבון בידוד A ' + Date.now() });
  const b = createAccount({ name: 'חשבון בידוד B ' + Date.now() });
  const sA = forAccount(a.id), sB = forAccount(b.id);

  const pA = sA.insert('projects', { name: 'פרויקט של A', dimensions: ['x'] });
  const pB = sB.insert('projects', { name: 'פרויקט של B', dimensions: ['y'] });

  // A רואה רק את שלו
  const aProjects = sA.all('projects');
  assert.ok(aProjects.some((p) => p.id === pA.id));
  assert.ok(!aProjects.some((p) => p.id === pB.id), 'A ראה פרויקט של B — דליפה!');

  // find חוצה-חשבון מחזיר null (לא ניתן לגשת ל-id של B דרך store של A)
  assert.equal(sA.find('projects', pB.id), null, 'A ניגש לרשומת B לפי id — דליפה!');
  assert.equal(sB.find('projects', pA.id), null);

  // update/remove חוצי-חשבון לא משפיעים
  assert.equal(sA.update('projects', pB.id, { name: 'פריצה' }), null);
  sA.remove('projects', pB.id);
  assert.ok(sB.find('projects', pB.id), 'B נמחק דרך store של A — דליפה!');

  // count מסונן
  assert.equal(sA.count('projects'), 1);
  assert.equal(sB.count('projects'), 1);
});

test('בידוד פרופיל החברה (companies)', () => {
  const a = createAccount({ name: 'חברה A ' + Date.now() });
  const b = createAccount({ name: 'חברה B ' + Date.now() });
  const sA = forAccount(a.id), sB = forAccount(b.id);
  sA.updateCompany({ name: 'מוריה', reg_no: '111' });
  sB.updateCompany({ name: 'אחרת', reg_no: '222' });
  assert.equal(sA.company().reg_no, '111');
  assert.equal(sB.company().reg_no, '222'); // לא נדרס ולא נראה חוצה-חשבון
});

test('forAccount דורש accountId (אין גישה גלובלית)', () => {
  assert.throws(() => forAccount(null), /accountId/);
  assert.throws(() => forAccount(undefined));
});
