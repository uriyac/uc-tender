// pdf.js — ייצוא טיוטה ל-PDF. עברית עם פונט מערכת + סידור RTL בסיסי (best-effort).
// הערה: לעברית מדויקת עם BiDi מלא — DOCX הוא הפורמט המומלץ.

import PDFDocument from 'pdfkit';
import { existsSync } from 'node:fs';

const FONT_CANDIDATES = [
  'C:/Windows/Fonts/arial.ttf',
  'C:/Windows/Fonts/david.ttf',
  '/Library/Fonts/Arial.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
];
const HEB_FONT = FONT_CANDIDATES.find((p) => existsSync(p)) || null;

// סידור RTL בסיסי: היפוך הסדר, עם תיקון ריצות לטיניות/ספרות
function reorderLine(line) {
  const out = [...line].reverse().join('');
  return out.replace(/[A-Za-z0-9][A-Za-z0-9.,:%()\/\- ]*[A-Za-z0-9)]|[A-Za-z0-9]/g,
    (m) => [...m].reverse().join(''));
}
// עטיפת טקסט לרוחב תווים קבוע ואז היפוך כל שורה
function rtlWrap(text, width = 80) {
  const lines = [];
  for (const para of String(text).split('\n')) {
    let cur = '';
    for (const word of para.split(/\s+/)) {
      if ((cur + ' ' + word).trim().length > width) { lines.push(cur.trim()); cur = word; }
      else cur = (cur + ' ' + word).trim();
    }
    lines.push(cur.trim());
  }
  return lines.map(reorderLine);
}

export function draftToPdf(draft, stream) {
  const doc = new PDFDocument({ size: 'A4', margin: 56 });
  doc.pipe(stream);
  const F = HEB_FONT ? () => doc.font(HEB_FONT) : () => doc.font('Helvetica');
  const line = (txt, opts = {}) => {
    F();
    for (const l of rtlWrap(txt, opts.width || 80)) {
      doc.fontSize(opts.size || 11).fillColor(opts.color || '#0F1E3D')
        .text(l, { align: 'right', ...opts });
    }
  };

  line(`טיוטת מענה — ${draft.tender_name || ''}`, { size: 20, color: '#0E1B33' });
  line(`מכרז ${draft.tender_code || ''}`, { size: 11, color: '#666666' });
  doc.moveDown(0.8);

  for (const s of draft.sections) {
    doc.moveDown(0.6);
    line(s.title, { size: 14, color: '#0E1B33' });
    doc.moveDown(0.2);
    if (s.needsManual) {
      line('⚠ נדרש השלמה ידנית — לא נמצא מקור בזיכרון. המערכת אינה ממציאה נתון זה.', { size: 10, color: '#B45309' });
    } else {
      line(s.body, { size: 11 });
      const tag = s.manual ? 'הושלם ידנית ע"י המשתמש'
        : `מבוסס על: ${s.sourceProject}${s.confidence != null ? ` · ביטחון ${s.confidence}%` : ''}`;
      line(tag, { size: 9, color: '#2563EB' });
    }
  }
  doc.end();
}
