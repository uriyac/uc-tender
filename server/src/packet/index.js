// packet/index.js — תזמור חבילת ההגשה (S3). נקודת-הכניסה שה-route קורא לה.
//
// זרימה: טופס רשמי (buffer) + הקשר המכרז/החברה →
//   1. extractFields  (AcroForm)
//   2. mapFields      (שדה→פרופיל, אפס-הזיות)
//   3. fillPdf        (מילוי ה-filled בלבד)
//   4. checklists     (מסמכים נדרשים + חתימות)
//   5. buildPacket    (עמוד-שער + צ׳קליסטים + טופס ממולא → PDF אחד)

import { extractFields, hasAcroForm } from './fields.js';
import { mapFields, summarize } from './mapping.js';
import { fillPdf } from './fill.js';
import { documentsChecklist, signaturesChecklist, checklistSummary } from './checklist.js';
import { buildPacket } from './packet.js';

// analyzeForm — תצוגה מקדימה בלי להפיק PDF (למסך "מה יתמלא").
export async function analyzeForm(formBuffer, company = {}) {
  const fields = await extractFields(formBuffer);
  const acro = hasAcroForm(fields);
  const mapping = acro ? mapFields(fields, company) : [];
  return { acroForm: acro, fieldCount: fields.length, mapping, summary: summarize(mapping) };
}

// buildSubmissionPacket — הפקת החבילה המלאה.
//   ctx = { tender, company, requirements, redFlags, knowledge }
//   knowledge = { certifications:[], documentCategories:[], classification }
export async function buildSubmissionPacket(formBuffer, ctx = {}) {
  const { tender = {}, company = {}, redFlags = { flags: [] }, knowledge = {} } = ctx;
  const rawText = tender.raw_text || '';

  const fields = await extractFields(formBuffer);
  const acro = hasAcroForm(fields);
  const mapping = acro ? mapFields(fields, company) : [];
  const summary = summarize(mapping);

  let filledBytes = null;
  if (acro) {
    const res = await fillPdf(formBuffer, mapping);
    filledBytes = res.bytes;
    summary.filledSkipped = res.skipped;
  } else {
    // טופס שטוח (בלי שדות): מצרפים את המקור כמו שהוא; המילוי ידני מהצ׳קליסט.
    filledBytes = formBuffer;
  }

  const documents = documentsChecklist(rawText, knowledge);
  const manualFields = mapping.filter((m) => m.status === 'manual');
  const signatures = signaturesChecklist(manualFields, rawText);

  const packetBytes = await buildPacket(
    { tender, company, mapping, summary, documents, signatures },
    filledBytes,
  );

  return {
    packetBytes,
    meta: {
      acroForm: acro,
      summary,
      documents,
      signatures,
      checklistSummary: checklistSummary(documents, signatures),
    },
  };
}

export { extractFields, mapFields, summarize, hasAcroForm };
