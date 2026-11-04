// store.js — שכבת Repository מעל SQLite (node:sqlite המובנה, אפס תלות חיצונית).
// ריבוי-דיירים: כל הנתונים העסקיים מסוננים לפי account_id דרך store.for(accountId).
// הבידוד נאכף *מבנית* — accessor מסונן תמיד מזריק account_id=? לכל שאילתה.

import { config } from '../config.js'; // ראשון: מבטיח ש-.env טעון לפני ההזרעה (SEED)
import Database from '../lib/wasmdb.js'; // SQLite ב-WASM (בלי native) — בונה בכל מקום, בלי electron-rebuild
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, copyFileSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { hashPassword } from '../auth/password.js';
import { legacySeed } from './schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// באפליקציה ארוזה תיקיית-האפליקציה read-only → ה-DB נכתב ל-config.dataDir (userData).
// בפיתוח (dataDir=null) — ליד הקוד, כמו קודם.
const DATA_DIR = config.dataDir || __dirname;
// הגנה: תחת node --test (NODE_TEST_CONTEXT) או NODE_ENV=test — אסור לפתוח את DB הפיתוח.
// `npm test` מכוון את UCT_DATA_DIR לתיקייה זמנית (tools/isolated-data-dir.mjs).
if (!config.dataDir && (process.env.NODE_TEST_CONTEXT || process.env.NODE_ENV === 'test')) {
  throw new Error('store: בדיקות לא רשאיות לפתוח את DB הפיתוח — הרץ דרך `npm test` או קבע UCT_DATA_DIR');
}
const DB_PATH = join(DATA_DIR, 'app.sqlite');
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
// WASM SQLite (תהליך יחיד) — journal ברירת-מחדל (rollback), לא WAL. עמיד לשמירה per-פעולה.
db.pragma('foreign_keys = ON');

// --- סכימה ---
db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY, name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free', status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, account_id TEXT, email TEXT UNIQUE NOT NULL,
    pass_hash TEXT NOT NULL, pass_salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member', name TEXT, status TEXT NOT NULL DEFAULT 'active',
    is_superadmin INTEGER NOT NULL DEFAULT 0,
    must_reset INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL, last_login TEXT
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS companies (
    account_id TEXT PRIMARY KEY, data TEXT NOT NULL
  );
  -- אוסף גנרי: כל רשומה עסקית כ-JSON, מסוננת לפי account_id + collection
  CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY, account_id TEXT NOT NULL, collection TEXT NOT NULL, data TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_records_acct_coll ON records(account_id, collection);
  CREATE INDEX IF NOT EXISTS idx_users_account ON users(account_id);
`);

// מזהה קצר וייחודי
export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
const now = () => new Date().toISOString();

// פריט ידע פעיל = לא ממתין לאישור ולא נדחה.
export const isActive = (x) => x.review !== 'proposed' && x.review !== 'rejected';

// ============================ Accounts ============================
export function createAccount({ name, plan = 'free' }) {
  const id = uid('acct');
  db.prepare('INSERT INTO accounts (id,name,plan,status,created_at) VALUES (?,?,?,?,?)')
    .run(id, name, plan, 'active', now());
  return getAccount(id);
}
export function getAccount(id) { return db.prepare('SELECT * FROM accounts WHERE id=?').get(id) || null; }
export function listAccounts() { return db.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all(); }
export function updateAccount(id, patch) {
  const a = getAccount(id); if (!a) return null;
  const next = { ...a, ...patch };
  db.prepare('UPDATE accounts SET name=?,plan=?,status=? WHERE id=?').run(next.name, next.plan, next.status, id);
  return getAccount(id);
}
export function accountUsage(id) {
  const c = (coll) => db.prepare('SELECT COUNT(*) n FROM records WHERE account_id=? AND collection=?').get(id, coll).n;
  const users = db.prepare('SELECT COUNT(*) n FROM users WHERE account_id=?').get(id).n;
  return { users, documents: c('documents'), tenders: c('tenders'), projects: c('projects') };
}

// ============================ Users ============================
export function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE lower(email)=lower(?)').get(String(email || '').trim()) || null;
}
export function getUserById(id) { return db.prepare('SELECT * FROM users WHERE id=?').get(id) || null; }
export function listUsers(accountId) {
  return db.prepare('SELECT id,account_id,email,role,name,status,must_reset,created_at,last_login FROM users WHERE account_id=? ORDER BY created_at').all(accountId);
}
export function countUsers(accountId) { return db.prepare('SELECT COUNT(*) n FROM users WHERE account_id=?').get(accountId).n; }
export function createUser({ account_id, email, password, role = 'member', name = '', is_superadmin = 0, must_reset = 0 }) {
  const { hash, salt } = hashPassword(password);
  const id = uid('u');
  db.prepare(`INSERT INTO users (id,account_id,email,pass_hash,pass_salt,role,name,status,is_superadmin,must_reset,created_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, account_id, String(email).trim(), hash, salt, role, name, 'active', is_superadmin ? 1 : 0, must_reset ? 1 : 0, now());
  return getUserById(id);
}
export function updateUser(id, patch) {
  const u = getUserById(id); if (!u) return null;
  if (patch.password) { const { hash, salt } = hashPassword(patch.password); patch = { ...patch, pass_hash: hash, pass_salt: salt, must_reset: 0 }; delete patch.password; }
  const next = { ...u, ...patch };
  db.prepare('UPDATE users SET account_id=?,email=?,pass_hash=?,pass_salt=?,role=?,name=?,status=?,is_superadmin=?,must_reset=?,last_login=? WHERE id=?')
    .run(next.account_id, next.email, next.pass_hash, next.pass_salt, next.role, next.name, next.status, next.is_superadmin ? 1 : 0, next.must_reset ? 1 : 0, next.last_login || null, id);
  return getUserById(id);
}
export function deleteUser(id) { db.prepare('DELETE FROM users WHERE id=?').run(id); }
export function touchLogin(id) { db.prepare('UPDATE users SET last_login=? WHERE id=?').run(now(), id); }

// ============================ Sessions ============================
export function createSession(userId, ttlDays = 14) {
  const token = uid('sess') + Math.random().toString(36).slice(2);
  const expires = Date.now() + ttlDays * 864e5;
  db.prepare('INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,?)').run(token, userId, expires);
  return token;
}
export function getSessionUser(token) {
  if (!token) return null;
  const s = db.prepare('SELECT * FROM sessions WHERE token=?').get(token);
  if (!s) return null;
  if (s.expires_at < Date.now()) { db.prepare('DELETE FROM sessions WHERE token=?').run(token); return null; }
  return getUserById(s.user_id);
}
export function deleteSession(token) { if (token) db.prepare('DELETE FROM sessions WHERE token=?').run(token); }
export function deleteUserSessions(userId) { db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId); }

// ============================ Scoped store (per account) ============================
// מחזיר accessor שכל פעולותיו מסוננות ל-account_id נתון — הבידוד המבני.
export function forAccount(accountId) {
  if (!accountId) throw new Error('store.for: accountId is required');
  const parse = (row) => ({ ...JSON.parse(row.data), id: row.id });
  return {
    accountId,
    uid,
    all(collection) {
      return db.prepare('SELECT id,data FROM records WHERE account_id=? AND collection=?').all(accountId, collection).map(parse);
    },
    find(collection, id) {
      const row = db.prepare('SELECT id,data FROM records WHERE account_id=? AND collection=? AND id=?').get(accountId, collection, id);
      return row ? parse(row) : null;
    },
    insert(collection, record) {
      const id = record.id || uid(collection.slice(0, 3));
      const rec = { ...record, id };
      db.prepare('INSERT INTO records (id,account_id,collection,data) VALUES (?,?,?,?)')
        .run(id, accountId, collection, JSON.stringify(rec));
      return rec;
    },
    update(collection, id, patch) {
      const cur = this.find(collection, id);
      if (!cur) return null;
      const next = { ...cur, ...patch, id };
      db.prepare('UPDATE records SET data=? WHERE account_id=? AND collection=? AND id=?')
        .run(JSON.stringify(next), accountId, collection, id);
      return next;
    },
    remove(collection, id) {
      db.prepare('DELETE FROM records WHERE account_id=? AND collection=? AND id=?').run(accountId, collection, id);
    },
    count(collection) {
      return db.prepare('SELECT COUNT(*) n FROM records WHERE account_id=? AND collection=?').get(accountId, collection).n;
    },
    // מוחק את כל הרשומות של אוסף אחד בחשבון הזה (מסונן מבנית). מחזיר כמה נמחקו.
    clear(collection) {
      return db.prepare('DELETE FROM records WHERE account_id=? AND collection=?').run(accountId, collection).changes;
    },
    company() {
      const row = db.prepare('SELECT data FROM companies WHERE account_id=?').get(accountId);
      return row ? JSON.parse(row.data) : { id: accountId, name: '', reg_no: '', specialties: [] };
    },
    updateCompany(patch) {
      const cur = this.company();
      const next = { ...cur, ...patch };
      db.prepare('INSERT INTO companies (account_id,data) VALUES (?,?) ON CONFLICT(account_id) DO UPDATE SET data=excluded.data')
        .run(accountId, JSON.stringify(next));
      return next;
    },
    // הידע הפעיל בלבד — מה שאדם אישר. פריט שהמנוע חילץ נשמר כ-review:'proposed' ואינו משתתף
    // בהתאמה/בטיוטה/בשער עד אישור (AI מציע, אדם מאשר). פריט בלי review (ידני/ישן) = מאושר.
    knowledge() {
      return { projects: this.all('projects').filter(isActive), certifications: this.all('certifications').filter(isActive) };
    },
    // פריטים שממתינים לאישור המשתמש.
    pendingKnowledge() {
      const pending = (x) => x.review === 'proposed';
      return { projects: this.all('projects').filter(pending), certifications: this.all('certifications').filter(pending) };
    },
  };
}
export { forAccount as for };

// ============================ Seed ============================
function isEmpty() { return db.prepare('SELECT COUNT(*) n FROM accounts').get().n === 0 &&
                            db.prepare('SELECT COUNT(*) n FROM users WHERE is_superadmin=1').get().n === 0; }

function seedIfNeeded() {
  if (!isEmpty()) return;
  const emptyMode = config.seedMode === 'empty';

  // superadmin (הספק) — קיים תמיד. סיסמת ברירת מחדל מ-.env או קבועה לפיתוח.
  createUser({
    account_id: null, email: process.env.SUPERADMIN_EMAIL || 'admin@uctender.local',
    password: process.env.SUPERADMIN_PASSWORD || 'admin1234', role: 'owner', name: 'ספק המערכת',
    is_superadmin: 1,
  });

  if (emptyMode) return; // SEED=empty → רק superadmin, בלי חשבון דמו

  // חשבון דמו + owner + נתוני הדמו הקיימים (parity)
  const acct = createAccount({ name: 'פתרונות דיגיטליים לישראל בע״מ', plan: 'free' });
  createUser({ account_id: acct.id, email: 'demo@uctender.local', password: 'demo1234', role: 'owner', name: 'משתמש דמו' });
  const s = forAccount(acct.id);
  const L = legacySeed();
  s.updateCompany(L.company);
  for (const p of L.projects) s.insert('projects', p);
  for (const c of L.certifications) s.insert('certifications', c);
  for (const t of L.tenders) s.insert('tenders', t);
}
seedIfNeeded();

// גיבוי מקומי (P3): checkpoint ל-WAL ואז עותק מתוארך ל-<dataDir>/backups. שומר את N האחרונים.
// דטרמיניסטי, מקומי, בלי ענן — מתאים ל-on-prem. נכשל בשקט (לא מפיל את השרת).
export function backup(keep = 5) {
  try {
    const dir = join(DATA_DIR, 'backups');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = join(dir, `app-${stamp}.sqlite`);
    copyFileSync(DB_PATH, dest);
    const files = readdirSync(dir).filter((f) => /^app-.*\.sqlite$/.test(f)).sort();
    while (files.length > keep) { const old = files.shift(); if (existsSync(join(dir, old))) unlinkSync(join(dir, old)); }
    return dest;
  } catch (e) { console.error('[backup] נכשל:', e.message); return null; }
}

// איפוס לצורכי פיתוח (מוחק הכל ומזריע מחדש)
export function reset() {
  db.exec('DELETE FROM records; DELETE FROM companies; DELETE FROM sessions; DELETE FROM users; DELETE FROM accounts;');
  seedIfNeeded();
}
