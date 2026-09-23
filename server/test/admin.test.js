// admin.test.js — פרוביזיון חשבון-לקוח ע"י מנהל-על: סיסמה זמנית + must_reset + החלפה.
// בודק את ה-primitives שה-routes של admin/auth נשענים עליהם (createUser/updateUser/genTempPassword).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAccount, createUser, updateUser, getUserById, getUserByEmail, for as forAccount } from '../src/data/store.js';
import { genTempPassword, verifyPassword } from '../src/auth/password.js';

test('genTempPassword — אורך תקין, תווים קריאים, אקראי', () => {
  const a = genTempPassword();
  assert.equal(a.length, 10);
  assert.match(a, /^[A-HJ-NP-Za-km-z2-9]+$/); // בלי 0/O/1/l/I
  assert.notEqual(a, genTempPassword()); // אקראי
});

test('פרוביזיון: חשבון + owner עם must_reset וסיסמה זמנית (רק hash נשמר)', () => {
  const email = `client${Date.now()}@x.co.il`;
  const acct = createAccount({ name: 'לקוח דמו ' + Date.now(), plan: 'free' });
  const temp = genTempPassword();
  const owner = createUser({ account_id: acct.id, email, password: temp, role: 'owner', must_reset: 1 });

  const u = getUserById(owner.id);
  assert.equal(u.role, 'owner');
  assert.equal(u.account_id, acct.id);
  assert.equal(u.must_reset, 1, 'owner חדש חייב must_reset=1');
  assert.equal(u.pass_hash && u.pass_salt ? true : false, true);
  assert.ok(!('password' in u), 'סיסמה לא נשמרת בטקסט');
  assert.ok(verifyPassword(temp, u.pass_hash, u.pass_salt), 'הסיסמה הזמנית תקפה');
  assert.equal(getUserByEmail(email).id, owner.id);
});

test('החלפת סיסמה מנקה must_reset; הסיסמה הזמנית מפסיקה לעבוד', () => {
  const email = `reset${Date.now()}@x.co.il`;
  const acct = createAccount({ name: 'לקוח ' + Date.now() });
  const temp = genTempPassword();
  const owner = createUser({ account_id: acct.id, email, password: temp, role: 'owner', must_reset: 1 });

  updateUser(owner.id, { password: 'NewPass123' }); // updateUser מנקה must_reset אוטומטית
  const u = getUserById(owner.id);
  assert.equal(u.must_reset, 0, 'must_reset נוקה אחרי החלפה');
  assert.ok(verifyPassword('NewPass123', u.pass_hash, u.pass_salt), 'הסיסמה החדשה תקפה');
  assert.ok(!verifyPassword(temp, u.pass_hash, u.pass_salt), 'הסיסמה הזמנית כבר לא תקפה');
});

test('אפס-סיסמה: temp חדש + must_reset=1 שוב (שתי קריאות updateUser)', () => {
  const acct = createAccount({ name: 'לקוח ' + Date.now() });
  const owner = createUser({ account_id: acct.id, email: `r2${Date.now()}@x.co.il`, password: 'orig123', role: 'owner' });
  const temp2 = genTempPassword();
  updateUser(owner.id, { password: temp2 }); // מנקה must_reset
  updateUser(owner.id, { must_reset: 1 });    // מסמן שוב
  const u = getUserById(owner.id);
  assert.equal(u.must_reset, 1);
  assert.ok(verifyPassword(temp2, u.pass_hash, u.pass_salt));
});

test('בידוד: חשבון-לקוח חדש לא רואה נתוני חשבון אחר', () => {
  const a = createAccount({ name: 'לקוח A ' + Date.now() });
  const b = createAccount({ name: 'לקוח B ' + Date.now() });
  const pA = forAccount(a.id).insert('tenders', { name: 'מכרז A' });
  assert.equal(forAccount(b.id).find('tenders', pA.id), null, 'B ראה מכרז של A — דליפה!');
});
