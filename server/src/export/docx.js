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

// תקציר מכרז (summary/index.js) → Word עם RTL. מציג את המכרז בלבד — בלי בדיקת התאמה לחברה.
// כל פרט עם עמוד מקור; מה שלא נמצא מופיע במפורש כ"לא זוהה".
export async function summaryToDocx(s) {
  const P = (text, opts = {}) => new Paragraph({ ...RTL, spacing: { after: 60 }, ...(opts.heading ? { heading: opts.heading, spacing: { before: 240, after: 80 } } : {}),
    children: [new TextRun({ text, rightToLeft: true, bold: !!opts.bold, color: opts.color, size: opts.size, italics: !!opts.italics })] });
  const H = (text) => P(text, { heading: HeadingLevel.HEADING_2, bold: true });
  const where = (src) => (src ? (src.page ? ` (עמ׳ ${src.page})` : '') : '');
  const factLine = (f) => (f.found
    ? P(`${f.label}: ${f.value}${f.note ? ` — ${f.note}` : ''}${where(f.source)}`, { bold: !!f.alert, color: f.alert ? 'B91C1C' : undefined })
    : P(`${f.label}: ${f.note}`, { color: '9A6700', italics: true }));

  // רק פרטים שנמצאו; החסרים מרוכזים בשורה אחת. פרק בלי אף פרט — לא מוצג.
  const section = (title, facts) => { const f = facts.filter((x) => x.found); return f.length ? [H(title), ...f.map(factLine)] : []; };
  const groups = s.condition_groups || [];
  const children = [
    P(`תקציר מכרז — ${s.title.name || ''}`, { heading: HeadingLevel.TITLE, bold: true }),
    P(`מכרז ${s.title.code || ''} · ${s.title.issuer || ''}`, { color: '666666' }),
    ...section('על המכרז', s.about), ...section('איך בוחרים זוכה', s.selection),
    ...section('מועדים', s.dates), ...section('מה נדרש מהמציע', s.costs),
    H(`תנאי סף (${s.conditions.length})`),
    ...(groups.length ? groups.flatMap((g) => [P(`${g.category}:`, { bold: true }), ...g.items.map((c) => P(`• ${c.text}${where(c.source)}`))])
      : [P('לא זוהו תנאי סף מובנים — יש לעבור על החוברת ידנית.', { color: '9A6700' })]),
    ...section('תנאים מסחריים', s.terms),
  ];
  if (s.watch.length) {
    children.push(H('לתשומת לב'));
    for (const w of s.watch) children.push(P(`• ${w.label} — ${w.detail}`));
  }
  if ((s.missing || []).length) children.push(P(''), P(`לא זוהו במכרז: ${s.missing.join(' · ')} — בדוק בחוברת.`, { color: '9A6700', italics: true }));
  children.push(P(''), P(`${s.disclaimer} הופק: ${new Date(s.generated_at).toLocaleDateString('he-IL')}.`, { color: '888888', size: 16, italics: true }));
  return Packer.toBuffer(new Document({ sections: [{ properties: {}, children }] }));
}
