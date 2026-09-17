// fields.js — חילוץ שדות טופס (AcroForm) מ-PDF, דרך pdf-lib.
// שלב S3.1: קלט = buffer של PDF; פלט = רשימת שדות { name, type, options? }.
// טופס בלי שדות → מערך ריק (מסלול overlay/תבנית יטופל בהמשך).

import { PDFDocument } from 'pdf-lib';

const TYPE = (f) => f.constructor.name.replace(/^PDF/, ''); // TextField / CheckBox / Dropdown / RadioGroup / OptionList / Button / Signature

export async function extractFields(buffer) {
  const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const form = pdf.getForm();
  const fields = form.getFields();
  return fields.map((f) => {
    const type = TYPE(f);
    const out = { name: f.getName(), type };
    if (typeof f.getOptions === 'function') {
      try { out.options = f.getOptions(); } catch { /* לא לכל סוג יש אפשרויות */ }
    }
    return out;
  });
}

export function hasAcroForm(fields) {
  return Array.isArray(fields) && fields.some((f) => f.type === 'TextField' || f.type === 'CheckBox' || f.type === 'Dropdown' || f.type === 'RadioGroup' || f.type === 'OptionList');
}
