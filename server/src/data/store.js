// store.js — Repository layer. אחסון JSON פשוט מאחורי ממשק אחיד.
// אפס תלויות native. ניתן להחליף בעתיד ל-SQLite/Postgres בלי לגעת ב-routes.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seed, emptySeed } from './schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'db.json');

// SEED=empty → מתחילים ריק (בדיקת לקוח חדש). ברירת מחדל: נתוני הדגמה.
function chooseSeed() {
  return (process.env.SEED || '').toLowerCase() === 'empty' ? emptySeed() : seed();
}

let db = null;

function load() {
  if (db) return db;
  if (existsSync(DB_PATH)) {
    db = JSON.parse(readFileSync(DB_PATH, 'utf8'));
  } else {
    db = chooseSeed();
    persist();
  }
  return db;
}

function persist() {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

// מזהה קצר וייחודי
export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// גישה גנרית לאוסף
export function all(collection) {
  return load()[collection] ?? [];
}

export function find(collection, id) {
  return all(collection).find((x) => x.id === id) ?? null;
}

export function insert(collection, record) {
  load()[collection].push(record);
  persist();
  return record;
}

export function update(collection, id, patch) {
  const list = all(collection);
  const i = list.findIndex((x) => x.id === id);
  if (i === -1) return null;
  list[i] = { ...list[i], ...patch };
  persist();
  return list[i];
}

export function remove(collection, id) {
  const d = load();
  d[collection] = all(collection).filter((x) => x.id !== id);
  persist();
}

export function company() {
  return load().company;
}

export function updateCompany(patch) {
  const d = load();
  d.company = { ...d.company, ...patch };
  persist();
  return d.company;
}

// מאגר הידע כאובייקט אחד — הקלט הקבוע של המנוע
export function knowledge() {
  const d = load();
  return { projects: d.projects, certifications: d.certifications };
}

// איפוס לצורכי פיתוח
export function reset() {
  db = chooseSeed();
  persist();
  return db;
}
