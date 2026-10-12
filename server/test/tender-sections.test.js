// tender-sections.test.js — קריאת פרק "תנאי הסף" לפי מספור סעיפים.
// הבעיה שזה פותר (מכרז אמיתי, 55 עמ'): איסוף לפי מילות-רמז הניב 80 "דרישות" — רקע, הוראות הגשה
// ושברי משפטים — ופספס את התנאים עצמם; ובדיקות-סף על כל הטקסט המציאו תנאים ("רו"ח 9+" → לא עומד).
// הדוגמה כאן סינתטית, במבנה של מכרז ממשלתי טיפוסי (כולל טאבים של pdf-parse).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractThresholdSection, thresholdScope, normalizeText } from '../src/lib/tenderSections.js';
import { parseTender, checkThresholds } from '../src/engine/stub/index.js';

const DOC = [
  'מסמך א\'',
  'מכרז ממוכן (מקוון) מס\'\t12/26',
  'מכרז ל\tמתן\tשירותי ייעוץ\tעבור חברת דרכי הצפון\tבע"מ',
  '1 . מבוא',
  '1.1 החברה מזמינה בזאת הצעות. מאז הקמתה צברה החברה ניסיון רב בפרויקטים.',
  'המועד האחרון לשאלות הבהרה - 01.03.2026 בשעה 12:00',
  'המועד האחרון להגשת ה הצעות - 20.03.2026 בשעה 12:00',
  '-- 1 of 3 --',
  '2 . תנאי הסף',
  '2.1 תנאי סף מנהליים למציע :',
  '2.1.1 המציע הינו עוסק מורשה או תאגיד הרשום כדין בישראל.',
  '2.2 תנאי סף מקצועיים למציע :',
  '2.2.1 החל מיום 1.1.2020 המציע ביצע לפחות 3 פרויקטים, העומדים בתנאים:',
  '2.2.1.1 הפרויקטים הוענקו לגופים ציבוריים.',
  '2.2.1.2 היקף כל פרויקט לא פחת מ - 1,000,000 ש"ח.',
  '2.3 תנאי סף למנהל הצוות המוצע :',
  '2.3.1 מנהל הצוות בעל ותק של 5 שנים לפחות.',
  '2.4 קבלת ניקוד איכות של לפחות 70 נקודות.',
  '2.5 הגדרות והבהרות ביחס לתנאי הסף :',
  '2.5.1 "גוף ציבורי" – כמשמעותו בחוק.',
  '3 . תוואי הפרויקט עובר ברחובות קיימים ופעילים בהם התאפשרה תנועה',
  '-- 2 of 3 --',
  '3 . שקילת ההצעות',
  '3.1 ההצעות ינוקדו: 60% איכות ו-40% מחיר.',
  '4 . מסמכים שיש לצרף',
  '4.1 תצהיר חתום בידי עו"ד ו/או רו"ח בנוסח נספח 9.',
  '-- 3 of 3 --',
  'עסק בשליטת אישה — מחזור העסקאות השנתי שלו עולה על 100 מיליון שקלים.',
].join('\n');

test('פרק תנאי הסף: דרישה לכל סעיף, תתי-סעיפים מצטרפים, הגדרות מושמטות', () => {
  const s = extractThresholdSection(DOC);
  assert.equal(s.found, true);
  assert.deepEqual(s.requirements.map((r) => r.clause), ['2.1.1', '2.2.1', '2.3.1', '2.4']);
  const pro = s.requirements.find((r) => r.clause === '2.2.1');
  assert.match(pro.text, /\(1\) הפרויקטים הוענקו לגופים ציבוריים/);
  assert.match(pro.text, /\(2\) היקף כל פרויקט/);
  assert.equal(pro.category, 'ניסיון מקצועי');
  assert.equal(s.requirements.find((r) => r.clause === '2.3.1').category, 'מנהל הצוות');
  assert.ok(!s.requirements.some((r) => /גוף ציבורי" –/.test(r.text)), 'הגדרה נכנסה כדרישה');
});

test('"3 . <משפט ארוך>" בתוך רשימה אינו סוגר את הפרק; "3 . שקילת ההצעות" כן', () => {
  const s = extractThresholdSection(DOC);
  assert.ok(!s.requirements.some((r) => /שקילת|60% איכות/.test(r.text)));
});

test('parseTender: שם וגוף מפרסם משורת-הכותרת, מועד הגשה עם "המועד האחרון", דרישות = התנאים בלבד', () => {
  const p = parseTender(DOC);
  assert.equal(p.issuer, 'דרכי הצפון בע"מ');
  assert.match(p.name, /^מתן שירותי ייעוץ/);
  assert.equal(p.deadline, '20.03.2026');
  assert.equal(p.question_deadline, '01.03.2026');
  assert.equal(p.requirements.length, 4);
  assert.ok(p.requirements.every((r) => r.mandatory));
  assert.equal(p.min_turnover, null, '"מחזור 100 מיליון" מהגדרה בסוף המסמך אינו תנאי סף');
});

test('בדיקות-סף רצות רק על פרק תנאי הסף — בלי תנאים מומצאים', () => {
  const co = { avg_turnover: '₪8M', certified_staff: '2', public_sector_experience: 'כן' };
  const labels = checkThresholds(thresholdScope(DOC), co).checks.map((c) => c.label);
  assert.ok(!labels.some((l) => /מחזור/.test(l)), 'מחזור מהגדרה בעמ\' 3 הפך לתנאי');
  assert.ok(!labels.some((l) => /עובדים מוסמכים/.test(l)), '"רו"ח" מטופס בנספח הפך לתנאי');
  assert.ok(labels.some((l) => /גופים ציבוריים/.test(l)), 'תנאי אמיתי מסעיף 2.2.1.1 פוספס');
});

test('בלי פרק תנאי-סף מזוהה — הטקסט כולו (התנהגות קודמת)', () => {
  const plain = 'מכרז לשירותי ניקיון\nנדרש מחזור כספי של 2 מיליון ש"ח';
  assert.equal(extractThresholdSection(plain).found, false);
  assert.equal(thresholdScope(plain), plain);
  assert.equal(normalizeText('א\tב  ג'), 'א ב ג');
});
