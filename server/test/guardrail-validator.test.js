// guardrail-validator.test.js — אוכף את השומר הדטרמיניסטי (guardrail.js).
// זהו הקוד שהופך "גמישות מכרזית" ללגיטימית: מיסגור-מחדש מותר, המצאת עובדה נחסמת.
// רץ עם: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSection, enforceDraft } from '../src/engine/guardrail.js';

// --- 1) פסקה המשתמשת רק בעובדות הממופות → עוברת. ---
test('שומר: body עם עובדות מהמקור בלבד → ok', () => {
  const section = { body: 'בהתבסס על "נתיב ירוק", ניהלנו 11 רשויות בתחום.', needsManual: false };
  const map = { project: 'נתיב ירוק', dimensions: ['11 רשויות', 'ניתוח סקרים'], requirement: 'ניסיון' };
  assert.equal(checkSection(section, map).ok, true);
});

// --- 2) פסקה שממציאה כמות שאין בממדים → הפרה, ומנוטרלת. ---
test('שומר: כמות מומצאת (20 רשויות) → הפרה + ניטרול לסקשן ריק', () => {
  const sections = [{ title: 'x', body: 'ניהלנו 20 רשויות ו-ISO 27001.', needsManual: false, sourceProject: 'נתיב ירוק', confidence: 90 }];
  const mapping = [{ project: 'נתיב ירוק', dimensions: ['11 רשויות'], requirement: 'ניסיון' }];
  const res = enforceDraft(sections, mapping);
  assert.equal(res.ok, false);
  assert.equal(res.violations.length, 1);
  const s = res.sections[0];
  assert.equal(s.needsManual, true, 'חייב להיות מנוטרל');
  assert.equal(s.body, '', 'body חייב להיתרוקן — הטענה הלא-מאומתת לא מגיעה למשתמש');
  assert.equal(s.needsReview, true);
});

// --- 3) מיסגור-מחדש בלי עובדה חדשה → מותר (זו הגמישות המכרזית). ---
test('שומר: מיסגור-מחדש של ממד קיים ("4 מחוזות") לדרישה סמוכה → עובר', () => {
  const sections = [{
    body: 'ניהול "מערך שירותי קהילה" ב-4 מחוזות מדגים יכולת הפעלת מערך ארצי מבוזר.',
    needsManual: false,
  }];
  const mapping = [{
    project: 'מערך שירותי קהילה', dimensions: ['4 מחוזות', 'מוקדי שירות'],
    requirement: 'ניסיון בהפעלת מערך ארצי', relevance: 'adjacent',
    bridge: 'ניהול 4 מחוזות מדגים הפעלת מערך מבוזר',
  }];
  assert.equal(enforceDraft(sections, mapping).ok, true);
});

// --- 4) טקסט ידני של המשתמש → לא נאמת (בא מהמשתמש, לא מהמודל). ---
test('שומר: סקשן manual לא נבדק גם עם מספרים', () => {
  const sections = [{ body: 'השלמנו פרויקט ב-99 ערים.', needsManual: false, manual: true }];
  const mapping = [{ project: null, dimensions: [] }];
  assert.equal(enforceDraft(sections, mapping).ok, true);
});

// --- 5) שנה מומצאת שאינה במקור → נחסמת. ---
test('שומר: שנה מומצאת (2019) שאינה במקור → הפרה', () => {
  const sections = [{ body: 'הפרויקט בוצע בשנת 2019.', needsManual: false }];
  const mapping = [{ project: 'פ', dimensions: ['2023'], requirement: 'r' }];
  assert.equal(enforceDraft(sections, mapping).ok, false);
});
