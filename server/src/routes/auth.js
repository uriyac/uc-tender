// auth.js — הרשמה, התחברות, התנתקות, זהות. אימייל+סיסמה (hashed), session ב-cookie.

import { AsyncRouter } from '../lib/http.js';
import * as store from '../data/store.js';
import { verifyPassword } from '../auth/password.js';
import { setSessionCookie, clearSessionCookie, currentUser } from '../auth/middleware.js';

const r = AsyncRouter();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// הגבלת ניסיונות התחברות (בזיכרון): נעילה אחרי 5 כשלונות ל-15 דקות
const attempts = new Map();
const MAX = 5, LOCK_MS = 15 * 60 * 1000;
function lockedFor(key) { const a = attempts.get(key); return a && a.until > Date.now() ? Math.ceil((a.until - Date.now()) / 60000) : 0; }
function fail(key) { const a = attempts.get(key) || { n: 0, until: 0 }; a.n += 1; if (a.n >= MAX) { a.until = Date.now() + LOCK_MS; a.n = 0; } attempts.set(key, a); }
function clear(key) { attempts.delete(key); }

function publicUser(u) {
  const acct = u.account_id ? store.getAccount(u.account_id) : null;
  return {
    id: u.id, email: u.email, name: u.name, role: u.role,
    isSuperadmin: !!u.is_superadmin, mustReset: !!u.must_reset,
    account: acct ? { id: acct.id, name: acct.name, plan: acct.plan, status: acct.status } : null,
  };
}

// POST /api/auth/register — יצירת חשבון חדש + משתמש owner
r.post('/register', (req, res) => {
  const { email, password, name, companyName } = req.body || {};
  if (!EMAIL_RE.test(email || '')) return res.status(400).json({ error: 'אימייל לא תקין' });
  if (!password || String(password).length < 6) return res.status(400).json({ error: 'סיסמה חייבת לפחות 6 תווים' });
  if (store.getUserByEmail(email)) return res.status(409).json({ error: 'אימייל זה כבר רשום' });

  const acct = store.createAccount({ name: (companyName || name || 'החשבון שלי').trim(), plan: 'free' });
  const user = store.createUser({ account_id: acct.id, email, password, role: 'owner', name: (name || '').trim() });
  store.for(acct.id).updateCompany({ id: acct.id, name: companyName || '', reg_no: '', specialties: [] });

  const token = store.createSession(user.id);
  setSessionCookie(res, token);
  res.status(201).json({ user: publicUser(user) });
});

// POST /api/auth/login
r.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const key = String(email || '').toLowerCase().trim();
  const mins = lockedFor(key);
  if (mins) return res.status(429).json({ error: `יותר מדי ניסיונות. נסה שוב בעוד ${mins} דקות.` });

  const user = store.getUserByEmail(email);
  if (!user || !verifyPassword(password || '', user.pass_hash, user.pass_salt)) {
    fail(key);
    return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
  }
  if (user.status !== 'active') return res.status(403).json({ error: 'המשתמש מושבת' });
  clear(key);
  store.touchLogin(user.id);
  const token = store.createSession(user.id);
  setSessionCookie(res, token);
  res.json({ user: publicUser(user) });
});

// POST /api/auth/logout
r.post('/logout', (req, res) => {
  const u = currentUser(req);
  const token = (req.headers.cookie || '').match(/uct_sid=([^;]+)/);
  if (token) store.deleteSession(decodeURIComponent(token[1]));
  clearSessionCookie(res);
  res.json({ ok: true });
});

// GET /api/auth/me — זהות נוכחית (או 401)
r.get('/me', (req, res) => {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ error: 'לא מחובר' });
  res.json({ user: publicUser(u) });
});

export default r;
