// fill.js — מילוי שדות AcroForm בערכים הממופים (S3.3).
// אפס-הזיות: כותב אך ורק שדות status='filled' (ערך מהפרופיל). השאר נשארים ריקים.
// עברית: מטמיע פונט עברי (fontkit) ומיישם appearance. הערכים נכתבים בסדר לוגי —
// אומת אמפירית (2026-08-30) ש-pdf-lib + פונט מוטמע מציגים עברית נכון בלי היפוך RTL
// (שלא כמו pdfkit ב-export/pdf.js, שם נדרש היפוך ידני). reorderRTL נשאר כ-fallback אופציונלי.

import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { hebFontBytes } from './fonts.js';

const HAS_HEB = /[֐-ׯ]/;

// היפוך RTL ידני — לא בשימוש כברירת מחדל (pdf-lib לא צריך אותו). נשמר ל-fallback.
export function reorderRTL(s) {
  if (!HAS_HEB.test(s)) return s;
  const out = [...String(s)].reverse().join('');
  return out.replace(/[A-Za-z0-9][A-Za-z0-9.,:%()\/\-" ]*[A-Za-z0-9)]|[A-Za-z0-9]/g,
    (m) => [...m].reverse().join(''));
}

// buffer = ה-PDF המקורי; mapped = פלט mapFields. options.reorder=false (סדר לוגי, הנכון ל-pdf-lib).
// מחזיר { bytes, filled, skipped, flattened }.
export async function fillPdf(buffer, mapped, { reorder = false, flatten = true } = {}) {
  const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
  let font = null;
  const fb = hebFontBytes();
  if (fb) { pdf.registerFontkit(fontkit); font = await pdf.embedFont(fb, { subset: true }); }

  const form = pdf.getForm();
  let filled = 0;
  const skipped = [];
  for (const m of mapped) {
    if (m.status !== 'filled') continue;
    try {
      const field = form.getField(m.name);
      if (field.constructor.name === 'PDFTextField') {
        field.setText(reorder ? reorderRTL(m.value) : m.value);
        if (font) field.updateAppearances(font);
        filled++;
      } else {
        skipped.push({ name: m.name, reason: `סוג לא נתמך למילוי: ${field.constructor.name}` });
      }
    } catch (e) { skipped.push({ name: m.name, reason: e.message }); }
  }

  let flattened = false;
  if (flatten) {
    try { form.flatten(); flattened = true; }
    catch (e) { skipped.push({ name: '(flatten)', reason: e.message }); }
  }
  return { bytes: await pdf.save(), filled, skipped, flattened };
}
