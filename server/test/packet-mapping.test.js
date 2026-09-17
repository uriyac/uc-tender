// packet-mapping.test.js — מיפוי שדה→פרופיל (S3.2). אפס-הזיות: רק שדה עם ערך אמיתי נכתב.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapFields, summarize } from '../src/packet/mapping.js';

const company = {
  name: 'מוריה תשתיות ומערכות בע״מ',
  reg_no: '514123456',
  address: 'רחוב הברזל 3, תל אביב',
  email: 'info@moria.co.il',
  contact_phone: '03-1234567',
  // בכוונה חסר: contact_name, website, avg_turnover
};

test('שדה ממופה עם ערך → filled + source=פרופיל', () => {
  const [m] = mapFields([{ name: 'שם המציע', type: 'TextField' }], company);
  assert.equal(m.status, 'filled');
  assert.equal(m.value, company.name);
  assert.equal(m.source, 'פרופיל החברה');
});

test('ח.פ. ממופה נכון (גרסאות ניסוח)', () => {
  for (const nm of ['ח.פ.', 'מספר חברה', 'מספר עוסק מורשה', 'ח"פ / ע.מ.']) {
    const [m] = mapFields([{ name: nm, type: 'TextField' }], company);
    assert.equal(m.value, company.reg_no, `נכשל על "${nm}"`);
  }
});

test('שדה ממופה בלי ערך בפרופיל → missing, לא ממציא', () => {
  const [m] = mapFields([{ name: 'אתר אינטרנט', type: 'TextField' }], company);
  assert.equal(m.status, 'missing');
  assert.equal(m.value, ''); // אפס-הזיות: אין ערך → ריק
});

test('שדה חתימה/תאריך → manual (לצ׳קליסט)', () => {
  for (const nm of ['חתימת המציע', 'תאריך', 'חותמת החברה']) {
    const [m] = mapFields([{ name: nm, type: 'TextField' }], company);
    assert.equal(m.status, 'manual', `נכשל על "${nm}"`);
  }
  const [sig] = mapFields([{ name: 'field_7', type: 'Signature' }], company);
  assert.equal(sig.status, 'manual');
});

test('שדה לא מזוהה → manual, value ריק', () => {
  const [m] = mapFields([{ name: 'שדה מוזר XYZ', type: 'TextField' }], company);
  assert.equal(m.status, 'manual');
  assert.equal(m.value, '');
});

test('summarize מחשב כיסוי נכון', () => {
  const mapped = mapFields([
    { name: 'שם המציע', type: 'TextField' },     // filled
    { name: 'ח.פ.', type: 'TextField' },          // filled
    { name: 'אתר', type: 'TextField' },           // missing
    { name: 'חתימה', type: 'TextField' },         // manual
  ], company);
  const s = summarize(mapped);
  assert.equal(s.filled, 2);
  assert.equal(s.missing, 1);
  assert.equal(s.manual, 1);
  assert.equal(s.coverage, 50);
});
