// password.js — hashing סיסמאות עם scrypt המובנה של Node (בלי תלות חיצונית).

import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const KEYLEN = 64;

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(password), salt, KEYLEN).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, hash, salt) {
  if (!hash || !salt) return false;
  const candidate = scryptSync(String(password), salt, KEYLEN);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

// סיסמה זמנית קריאה למסירה ללקוח (בלי תווים מבלבלים 0/O/1/l/I). ~10 תווים.
export function genTempPassword(len = 10) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
