// packet.js — הרכבת "חבילת הגשה" ל-PDF אחד (S3.6).
// עמוד-שער + צ׳קליסט מסמכים + צ׳קליסט חתימות + הטופס הרשמי הממולא (ממוזג).
// הכל ב-pdf-lib בסדר לוגי, ימני-מיושר (אומת שעברית מוצגת נכון בלי היפוך).
// אפס-הזיות: החבילה מציגה רק מה שמופה/קיים; פערים מסומנים ולא "מולאו".

import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { hebFontBytes } from './fonts.js';

const INK = rgb(0.06, 0.11, 0.24);
const MUTED = rgb(0.42, 0.45, 0.52);
const GREEN = rgb(0.15, 0.5, 0.28);
const RED = rgb(0.72, 0.15, 0.15);
const AMBER = rgb(0.7, 0.45, 0.05);
const HAIR = rgb(0.85, 0.86, 0.83);
const A4 = [595.28, 841.89];
const M = 56; // שוליים

// עמוד + סמן-כתיבה לניהול זרימה אנכית ורב-עמודי.
function makeWriter(pdf, font) {
  let page = pdf.addPage(A4);
  let y = A4[1] - M;
  const ensure = (h) => { if (y - h < M) { page = pdf.addPage(A4); y = A4[1] - M; } };
  // טקסט ימני-מיושר בסדר לוגי (RTL): x מחושב מרוחב הטקסט.
  const rtl = (text, { size = 11, color = INK, gap = 6, indent = 0 } = {}) => {
    const t = String(text ?? '');
    ensure(size + gap);
    const w = font.widthOfTextAtSize(t, size);
    page.drawText(t, { x: A4[0] - M - indent - w, y: y - size, size, font, color });
    y -= size + gap;
  };
  // שורת פריט: סמל בצד ימין + טקסט. (הסמל נכתב נפרד כדי להישאר יציב ל-RTL.)
  const item = (symbol, symColor, text, note) => {
    const size = 11; ensure(size + 8);
    page.drawText(symbol, { x: A4[0] - M - font.widthOfTextAtSize(symbol, size), y: y - size, size, font, color: symColor });
    const t = text + (note ? `  — ${note}` : '');
    const w = font.widthOfTextAtSize(t, size);
    page.drawText(t, { x: A4[0] - M - 22 - w, y: y - size, size, font, color: INK });
    y -= size + 8;
  };
  const rule = () => { ensure(14); page.drawLine({ start: { x: M, y: y - 4 }, end: { x: A4[0] - M, y: y - 4 }, thickness: 0.6, color: HAIR }); y -= 14; };
  const space = (h = 10) => { y -= h; };
  return { rtl, item, rule, space, ensure: (h) => ensure(h) };
}

// data = { tender, company, mapping, summary, documents, signatures }
export async function buildPacket({ tender = {}, company = {}, mapping = [], summary = {}, documents = [], signatures = [] }, filledFormBytes = null) {
  const pdf = await PDFDocument.create();
  const fb = hebFontBytes();
  if (!fb) throw new Error('לא נמצא פונט עברי — לא ניתן להפיק חבילה עברית.');
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fb, { subset: true });
  const w = makeWriter(pdf, font);
  const today = new Date().toLocaleDateString('he-IL');

  // ---- עמוד-שער ----
  w.rtl('חבילת הגשה — UC TENDER', { size: 22 });
  w.rtl(`${tender.name || 'מכרז'} · ${tender.code || ''}`, { size: 13, color: MUTED, gap: 4 });
  w.rtl(`גורם מפרסם: ${tender.issuer || '—'}`, { size: 11, color: MUTED, gap: 4 });
  w.rtl(`מגיש: ${company.name || '—'}${company.reg_no ? ` · ח.פ. ${company.reg_no}` : ''}`, { size: 11, color: MUTED, gap: 4 });
  w.rtl(`הופק: ${today}`, { size: 10, color: MUTED });
  w.space(6); w.rule();
  const cov = summary.coverage != null ? `${summary.coverage}%` : '—';
  w.rtl(`מילוי הטופס: ${summary.filled || 0} שדות מולאו מהפרופיל · ${summary.missing || 0} חסרים · ${summary.manual || 0} ידניים · כיסוי ${cov}`, { size: 11, color: MUTED });
  w.rtl('שדות מולאו אך ורק מנתוני הפרופיל — שדה ללא מקור נשאר ריק ומסומן להשלמה (אפס-הזיות).', { size: 9, color: MUTED });
  w.space(8);

  // ---- צ׳קליסט מסמכים נדרשים ----
  w.rtl('מסמכים נדרשים', { size: 15 }); w.rule();
  if (!documents.length) w.rtl('לא זוהו דרישות מסמך מובנות.', { size: 10, color: MUTED });
  for (const d of documents) {
    const [sym, col] = d.status === 'have' ? ['✓', GREEN] : d.status === 'missing' ? ['✗', RED] : ['○', AMBER];
    w.item(sym, col, d.label, d.note);
  }
  w.space(8);

  // ---- צ׳קליסט חתימות / חותמות ----
  w.rtl('חתימות וחותמות', { size: 15 }); w.rule();
  if (!signatures.length) w.rtl('לא זוהו דרישות חתימה מיוחדות.', { size: 10, color: MUTED });
  for (const s of signatures) w.item('○', AMBER, s.label, s.note);
  w.space(8);

  // ---- פירוט מילוי השדות ----
  if (mapping.length) {
    w.rtl('מילוי שדות הטופס', { size: 15 }); w.rule();
    for (const m of mapping) {
      if (m.status === 'filled') w.item('✓', GREEN, `${m.label}: ${m.value}`, 'מהפרופיל');
      else if (m.status === 'missing') w.item('✗', RED, m.label, 'חסר בפרופיל — להשלים');
      else w.item('○', AMBER, m.label, 'ידני');
    }
  }

  // ---- מיזוג הטופס הרשמי הממולא ----
  if (filledFormBytes) {
    const src = await PDFDocument.load(filledFormBytes, { ignoreEncryption: true });
    const pages = await pdf.copyPages(src, src.getPageIndices());
    for (const p of pages) pdf.addPage(p);
  }

  return await pdf.save();
}
