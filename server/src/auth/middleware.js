// middleware.js — אימות, הרשאות ובידוד. הבידוד נאכף כאן: req.accountId נקבע מה-session.

import * as store from '../data/store.js';

const COOKIE = 'uct_sid';
const RANK = { viewer: 0, member: 1, admin: 2, owner: 3 };
const SECURE = process.env.SECURE_COOKIES === '1'; // http מקומי → ללא Secure; production → 1

export function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

export function setSessionCookie(res, token, days = 14) {
  const parts = [`${COOKIE}=${token}`, 'HttpOnly', 'SameSite=Lax', 'Path=/', `Max-Age=${days * 86400}`];
  if (SECURE) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}
export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

// המשתמש הנוכחי מה-session (או null)
export function currentUser(req) {
  return store.getSessionUser(parseCookies(req)[COOKIE]);
}

// כל /api/* (פרט ל-auth/health) — חייב משתמש מחובר + חשבון פעיל. קובע req.accountId (הבידוד).
export function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'נדרשת התחברות' });
  if (user.status !== 'active') return res.status(403).json({ error: 'המשתמש מושבת' });
  if (!user.is_superadmin) {
    const acct = store.getAccount(user.account_id);
    if (!acct || acct.status !== 'active') return res.status(403).json({ error: 'החשבון מושהה — פנה למנהל המערכת' });
  }
  req.user = user;
  req.accountId = user.account_id;
  req.store = user.account_id ? store.for(user.account_id) : null; // accessor מסונן — הבידוד
  next();
}

// תפקיד מינימלי נדרש (owner>admin>member>viewer). superadmin עוקף.
export function requireRole(min) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'נדרשת התחברות' });
    if (req.user.is_superadmin) return next();
    if ((RANK[req.user.role] ?? -1) < (RANK[min] ?? 99)) return res.status(403).json({ error: 'אין לך הרשאה לפעולה זו' });
    next();
  };
}

// לוח האדמין של הספק בלבד
export function requireSuperadmin(req, res, next) {
  const user = currentUser(req);
  if (!user || !user.is_superadmin) return res.status(403).json({ error: 'גישת מנהל מערכת בלבד' });
  req.user = user;
  next();
}
