// packet-smoke.mjs — בדיקת קצה-לקצה של צינור חבילת ההגשה (S3).
// מייצר טופס-דמו עברי עם שדות AcroForm, ואז: extractFields → mapFields → fillPdf.
// הרצה: node tools/packet-smoke.mjs   (הפלט נשמר ל-tools/out/)

import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hebFontBytes, HEB_FONT_PATH } from '../src/packet/fonts.js';
import { extractFields, hasAcroForm } from '../src/packet/fields.js';
import { mapFields, summarize } from '../src/packet/mapping.js';
import { fillPdf, reorderRTL } from '../src/packet/fill.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'out');
mkdirSync(OUT, { recursive: true });

// --- 1) ליצור טופס-דמו עברי עם 4 שדות + שדה חתימה ---
async function makeSampleForm() {
  const pdf = await PDFDocument.create();
  const fb = hebFontBytes();
  pdf.registerFontkit(fontkit);
  const font = fb ? await pdf.embedFont(fb, { subset: false }) : await pdf.embedFont('Helvetica');
  const page = pdf.addPage([595, 842]); // A4
  const form = pdf.getForm();
  // תוויות בסדר לוגי (בלי היפוך) — הנכון ל-pdf-lib. יישור לימין ע"י התחלה מ-x גבוה פחות רוחב-הטקסט.
  const label = (txt, y) => {
    const size = 12, w = font.widthOfTextAtSize(txt + ':', size);
    page.drawText(txt + ':', { x: 535 - w, y, size, font, color: rgb(0.1, 0.12, 0.24) });
  };
  const rows = [
    ['שם המציע', 'שם המציע'],
    ['ח.פ. / מספר רישום', 'ח.פ. / מספר רישום'],
    ['טלפון', 'טלפון'],
    ['דואל', 'דואל'],
    ['חתימת המציע', 'חתימת המציע'],
  ];
  let y = 760;
  for (const [labelText, fieldName] of rows) {
    label(labelText + ':', y);
    const tf = form.createTextField(fieldName);
    tf.addToPage(page, { x: 60, y: y - 6, width: 320, height: 22, borderWidth: 1, borderColor: rgb(0.7, 0.7, 0.7) });
    y -= 60;
  }
  return await pdf.save();
}

const company = {
  name: 'מוריה תשתיות ומערכות בע״מ',
  reg_no: '514123456',
  contact_phone: '03-1234567',
  // בכוונה חסר: email → ייחשב 'missing' (אפס-הזיות)
};

console.log(`\n  פונט עברי: ${HEB_FONT_PATH || '(אין — עברית תדולג)'}\n  ${'─'.repeat(46)}`);

const sample = await makeSampleForm();
writeFileSync(join(OUT, 'sample-form.pdf'), sample);

// --- 2) חילוץ שדות ---
const fields = await extractFields(sample);
console.log(`\n  שדות שחולצו (${fields.length}):`);
for (const f of fields) console.log(`   • ${f.name}  [${f.type}]`);
console.log(`  hasAcroForm: ${hasAcroForm(fields)}`);

// --- 3) מיפוי ---
const mapped = mapFields(fields, company);
console.log(`\n  מיפוי:`);
for (const m of mapped) console.log(`   • ${m.name.padEnd(22)} → ${m.status.padEnd(8)} ${m.value ? '"' + m.value + '"' : (m.reason || '')}`);
const s = summarize(mapped);
console.log(`  סיכום: ${s.filled} ממולאים · ${s.missing} חסרים · ${s.manual} ידניים · כיסוי ${s.coverage}%`);

// --- 4) מילוי ---
const res = await fillPdf(sample, mapped);
writeFileSync(join(OUT, 'filled-form.pdf'), res.bytes);
console.log(`\n  מילוי: ${res.filled} שדות מולאו · flatten=${res.flattened} · דילוגים=${res.skipped.length}`);
for (const sk of res.skipped) console.log(`     ⚠ ${sk.name}: ${sk.reason}`);

// --- 5) חבילה מלאה (S3.6) ---
const { buildSubmissionPacket } = await import('../src/packet/index.js');
const tender = {
  name: 'אספקה, התקנה ותחזוקה של מערכת בקרה ומוקד שירות', code: '#14/2026', issuer: 'עיריית כפר סבא',
  raw_text: 'נדרש ISO 9001. סיווג קבלני ג-3. ערבות בנקאית. ביטוח אחריות מקצועית. מאזן מבוקר. קורות חיים של הצוות. ' +
    'נדרשת חתימת מורשה חתימה וחותמת החברה. אישור ניהול ספרים.',
};
const knowledge = { certifications: [{ name: 'ISO 9001' }, { name: 'אישור ניהול ספרים' }], documentCategories: ['staff'], classification: 'ג-2' };
const { packetBytes, meta } = await buildSubmissionPacket(sample, { tender, company, knowledge });
writeFileSync(join(OUT, 'submission-packet.pdf'), packetBytes);
console.log(`\n  חבילה: ${meta.documents.length} מסמכים נדרשים · ${meta.signatures.length} חתימות · כיסוי טופס ${meta.summary.coverage}%`);
console.log('   מסמכים:', meta.documents.map((d) => `${d.label}[${d.status}]`).join(', '));
console.log('   חתימות:', meta.signatures.map((s) => s.label).join(', '));
console.log(`\n  קבצים: tools/out/sample-form.pdf · filled-form.pdf · submission-packet.pdf\n`);
