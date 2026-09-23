// admin.js — לוח הספק (superadmin בלבד; נאכף ב-requireSuperadmin ב-index.js).
// צפייה + ניהול: רשימת חשבונות, פרטי חשבון, השעיה/הפעלה, שינוי תוכנית.

import { AsyncRouter } from '../lib/http.js';
import * as store from '../data/store.js';
import { genTempPassword } from '../auth/password.js';

const r = AsyncRouter();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/admin/accounts — כל החשבונות + שימוש
r.get('/accounts', (req, res) => {
  const rows = store.listAccounts().map((a) => ({ ...a, usage: store.accountUsage(a.id) }));
  res.json({ accounts: rows });
});

// GET /api/admin/accounts/:id — פרטי חשבון (משתמשים + חברה + שימוש)
r.get('/accounts/:id', (req, res) => {
  const a = store.getAccount(req.params.id);
  if (!a) return res.status(404).json({ error: 'חשבון לא נמצא' });
  res.json({
    account: a,
    usage: store.accountUsage(a.id),
    users: store.listUsers(a.id),
    company: store.for(a.id).company(),
  });
});

// PUT /api/admin/accounts/:id — שינוי תוכנית/סטטוס (השעיה/הפעלה)
r.put('/accounts/:id', (req, res) => {
  const a = store.getAccount(req.params.id);
  if (!a) return res.status(404).json({ error: 'חשבון לא נמצא' });
  const patch = {};
  if (['free', 'pro'].includes(req.body?.plan)) patch.plan = req.body.plan;
  if (['active', 'suspended'].includes(req.body?.status)) patch.status = req.body.status;
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'אין שינוי חוקי (plan/status)' });
  const updated = store.updateAccount(a.id, patch);
  // השעיית חשבון → ביטול כל ה-sessions של משתמשיו
  if (patch.status === 'suspended') for (const u of store.listUsers(a.id)) store.deleteUserSessions(u.id);
  res.json({ account: updated });
});

// POST /api/admin/accounts — פרוביזיון חשבון-לקוח: חשבון + משתמש owner + סיסמה זמנית.
r.post('/accounts', (req, res) => {
  const { companyName, ownerEmail, ownerName, plan } = req.body || {};
  const email = String(ownerEmail || '').trim();
  const name = String(companyName || '').trim();
  if (!name) return res.status(400).json({ error: 'נדרש שם חברה' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'אימייל לא תקין' });
  if (store.getUserByEmail(email)) return res.status(409).json({ error: 'אימייל זה כבר רשום' });

  const acct = store.createAccount({ name, plan: ['free', 'pro'].includes(plan) ? plan : 'free' });
  const tempPassword = genTempPassword();
  const owner = store.createUser({
    account_id: acct.id, email, password: tempPassword,
    role: 'owner', name: String(ownerName || '').trim(), must_reset: 1,
  });
  store.for(acct.id).updateCompany({ id: acct.id, name, reg_no: '', specialties: [] });
  // הסיסמה הזמנית מוחזרת פעם אחת בלבד — לא נשמרת בטקסט (רק hash דרך createUser).
  res.status(201).json({ account: acct, owner: { id: owner.id, email: owner.email }, tempPassword });
});

// POST /api/admin/accounts/:id/reset-password — סיסמה זמנית חדשה ל-owner של החשבון.
r.post('/accounts/:id/reset-password', (req, res) => {
  const a = store.getAccount(req.params.id);
  if (!a) return res.status(404).json({ error: 'חשבון לא נמצא' });
  const users = store.listUsers(a.id);
  const owner = users.find((u) => u.role === 'owner') || users[0];
  if (!owner) return res.status(404).json({ error: 'לא נמצא משתמש בחשבון' });

  const tempPassword = genTempPassword();
  store.updateUser(owner.id, { password: tempPassword }); // updateUser מנקה must_reset אוטומטית
  store.updateUser(owner.id, { must_reset: 1 });          // ואז מסמנים החלפה נדרשת בכניסה
  store.deleteUserSessions(owner.id);                      // מנתק sessions קיימים
  res.json({ owner: { email: owner.email }, tempPassword });
});

export default r;
