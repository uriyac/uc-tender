// admin.js — לוח הספק (superadmin בלבד; נאכף ב-requireSuperadmin ב-index.js).
// צפייה + ניהול: רשימת חשבונות, פרטי חשבון, השעיה/הפעלה, שינוי תוכנית.

import { AsyncRouter } from '../lib/http.js';
import * as store from '../data/store.js';

const r = AsyncRouter();

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

export default r;
