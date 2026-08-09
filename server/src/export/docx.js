// docx.js — ייצוא טיוטה ל-Word עם RTL עברי מלא.

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

const RTL = { bidirectional: true, alignment: AlignmentType.RIGHT };

export async function draftToDocx(draft) {
  const children = [];

  children.push(new Paragraph({
    ...RTL, heading: HeadingLevel.TITLE,
    children: [new TextRun({ text: `טיוטת מענה — ${draft.tender_name || ''}`, rightToLeft: true, bold: true })],
  }));
  children.push(new Paragraph({
    ...RTL,
    children: [new TextRun({ text: `מכרז ${draft.tender_code || ''}`, rightToLeft: true, color: '666666' })],
  }));
  children.push(new Paragraph({ text: '' }));

  for (const s of draft.sections) {
    children.push(new Paragraph({
      ...RTL, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 },
      children: [new TextRun({ text: s.title, rightToLeft: true, bold: true })],
    }));

    if (s.needsManual) {
      children.push(new Paragraph({
        ...RTL,
        children: [new TextRun({ text: '⚠ נדרש השלמה ידנית — לא נמצא מקור בזיכרון הארגוני. המערכת אינה ממציאה נתון זה.', rightToLeft: true, italics: true, color: 'B45309' })],
      }));
      continue;
    }

    children.push(new Paragraph({
      ...RTL,
      children: [new TextRun({ text: s.body, rightToLeft: true })],
    }));

    const tag = s.manual ? 'הושלם ידנית ע"י המשתמש'
      : `מבוסס על: ${s.sourceProject}${s.confidence != null ? ` · ביטחון ${s.confidence}%` : ''}`;
    children.push(new Paragraph({
      ...RTL, spacing: { after: 120 },
      children: [new TextRun({ text: tag, rightToLeft: true, size: 18, color: '2563EB' })],
    }));
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  return Packer.toBuffer(doc);
}
