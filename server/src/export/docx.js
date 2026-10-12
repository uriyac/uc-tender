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

// תקציר מנהלים (summary/index.js) → Word עם RTL. מציג "לא זוהה" במפורש ומקור (עמוד) לכל פרט.
export async function summaryToDocx(s) {
  const P = (text, opts = {}) => new Paragraph({ ...RTL, spacing: { after: 60 }, ...(opts.heading ? { heading: opts.heading, spacing: { before: 240, after: 80 } } : {}),
    children: [new TextRun({ text, rightToLeft: true, bold: !!opts.bold, color: opts.color, size: opts.size, italics: !!opts.italics })] });
  const where = (src) => (src ? (src.page ? ` (עמ׳ ${src.page})` : ' (מופיע במכרז)') : '');
  const factLine = (f) => (f.found
    ? P(`${f.label}: ${f.value}${f.note ? ` — ${f.note}` : ''}${where(f.source)}`)
    : P(`${f.label}: ${f.note}`, { color: 'B45309', italics: true }));

  const c = s.bottom_line.counts;
  const children = [
    P(`תקציר מנהלים — ${s.title.name || ''}`, { heading: HeadingLevel.TITLE, bold: true }),
    P(`מכרז ${s.title.code || ''} · ${s.title.issuer || ''}`, { color: '666666' }),
    P('השורה התחתונה', { heading: HeadingLevel.HEADING_2, bold: true }),
    P(`${s.bottom_line.text} (${s.bottom_line.gate})`, { bold: true, size: 28 }),
    P(s.bottom_line.reason || ''),
    P(`תנאי סף: ${c.total} · עומד ומגובה ${c.met_verified} · מוצהר ${c.met_claimed} · לא עומד ${c.not_met} · לא הוכרע ${c.unknown}`, { color: '444444' }),
    P('מועדים', { heading: HeadingLevel.HEADING_2, bold: true }), ...s.dates.map(factLine),
    P('כסף, היקף ורישוי', { heading: HeadingLevel.HEADING_2, bold: true }), ...s.money.map(factLine),
    P('תנאי הסף', { heading: HeadingLevel.HEADING_2, bold: true }),
    ...(s.thresholds.length ? s.thresholds.map((t) => P(`• ${t.label} — ${t.status_he}${where(t.source)}${t.action ? `. ${t.action}` : ''}`))
      : [P('לא זוהו תנאי סף מובנים — יש לעבור על החוברת ידנית.', { color: 'B45309' })]),
  ];
  if (s.risks.length) {
    children.push(P('סיכונים', { heading: HeadingLevel.HEADING_2, bold: true }));
    for (const r of s.risks) children.push(P(`• ${r.label} (${r.severity === 'high' ? 'גבוה' : r.severity === 'medium' ? 'בינוני' : 'מידע'}) — ${r.detail}`));
  }
  if (s.actions.length) {
    children.push(P('מה לעשות עכשיו', { heading: HeadingLevel.HEADING_2, bold: true }));
    s.actions.forEach((a, i) => children.push(P(`${i + 1}. ${a}`)));
  }
  children.push(P(''), P(`${s.disclaimer} הופק: ${new Date(s.generated_at).toLocaleDateString('he-IL')}.`, { color: '888888', size: 16, italics: true }));
  return Packer.toBuffer(new Document({ sections: [{ properties: {}, children }] }));
}
