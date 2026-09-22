import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapFields } from '../src/packet/mapping.js';

const company = {
  name: 'אוריה בע״מ', reg_no: '515000000', email: 'a@b.co.il', contact_phone: '050-1',
  classification: 'ג-3', avg_turnover: '₪8M', senior_experience_years: '12', certified_staff: '5',
  address: 'רחוב 1', website: 'https://x.co.il', key_person_title: 'מהנדס',
  main_domain: 'ניהול ידע', legal_entity: 'חברה בע״מ', contact_name: 'דנה',
};
const keyOf = (fieldName) => {
  const [m] = mapFields([{ name: fieldName, type: 'TextField' }], company);
  return m.key || m.status; // key כשממופה, אחרת status (manual)
};

// ניסוחים אמיתיים מטפסי מכרזים → מפתח הפרופיל הצפוי
const cases = [
  ['שם המציע', 'name'], ['שם המשתתף', 'name'], ['שם התאגיד', 'name'],
  ['ח.פ. / מספר תאגיד', 'reg_no'], ['מספר עוסק מורשה', 'reg_no'],
  ['כתובת דואר אלקטרוני', 'email'], ['דוא״ל', 'email'],
  ['מספר טלפון', 'contact_phone'], ['פקס', 'contact_phone'],
  ['דרגת סיווג קבלני', 'classification'], ['סיווג', 'classification'],
  ['מחזור כספי שנתי', 'avg_turnover'], ['היקף כספי', 'avg_turnover'],
  ['שנות ניסיון', 'senior_experience_years'], ['ותק מקצועי', 'senior_experience_years'],
  ['מספר עובדים', 'certified_staff'], ['מצבת כוח אדם', 'certified_staff'],
  ['נציג מטעם המציע', 'contact_name'],
  ['אתר אינטרנט', 'website'],
  ['תפקיד בעל התפקיד', 'key_person_title'],
  ['כתובת למשלוח דואר', 'address'],
];
for (const [name, key] of cases) {
  test(`מיפוי שדה: "${name}" → ${key}`, () => { assert.equal(keyOf(name), key); });
}

test('שדה חתימה → manual (לא ממולא אוטומטית)', () => {
  const [m] = mapFields([{ name: 'חתימת המציע', type: 'TextField' }], company);
  assert.equal(m.status, 'manual');
});

test('שדה לא מזוהה → manual (לא ממציא ערך)', () => {
  const [m] = mapFields([{ name: 'מספר גוש וחלקה', type: 'TextField' }], company);
  assert.equal(m.status, 'manual');
});
