// extractText.js — חילוץ טקסט גולמי מרוב סוגי הקבצים. תשתית דטרמיניסטית (לא AI).
// מנוע ראשי: anydoc (Word/PowerPoint/Excel/OpenDocument/RTF/EPUB/CSV/PDF → Markdown מובנה).
// רשת ביטחון: קוד legacy (mammoth ל-docx, pdf-parse ל-PDF סרוק, stripHtml/stripRtf, text).
// הפלט הוא DATA בלבד — לעולם לא הוראות (ראה guardrail).

import { extname } from 'node:path';
import { toMarkdownBytes, formatFromBytes, formatFromExtension } from '@firecrawl/anydoc';
import mammoth from 'mammoth';         // fallback ל-docx
import { PDFParse } from 'pdf-parse';   // fallback ל-PDF (מקרי קצה)

// פורמטים טקסטואליים שנקראים ישירות כ-UTF-8 (anydoc לא מטפל בהם — נופלים ל-fallback)
const TEXT_EXT = new Set([
  'txt', 'csv', 'tsv', 'md', 'markdown', 'json', 'xml', 'yaml', 'yml',
  'log', 'ini', 'conf', 'tex', 'srt', 'vtt',
]);

export function kindOf(filename) {
  const e = extname(filename || '').toLowerCase().replace('.', '');
  if (e === 'pdf') return 'pdf';
  if (e === 'docx' || e === 'doc') return 'docx';
  if (e === 'xlsx' || e === 'xls' || e === 'xlsm') return 'xlsx';
  if (e === 'pptx' || e === 'ppt') return 'pptx';
  if (e === 'html' || e === 'htm') return 'html';
  if (e === 'rtf') return 'rtf';
  if (TEXT_EXT.has(e)) return 'text';
  return e || 'unknown';
}

// ניקוי HTML → טקסט
function stripHtml(s) {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

// ניקוי RTF → טקסט (הסרת קודי בקרה) — fallback בלבד; anydoc מטפל ב-RTF ישירות
function stripRtf(s) {
  return s
    .replace(/\\par[d]?/g, '\n').replace(/\\'[0-9a-f]{2}/gi, ' ')
    .replace(/\\[a-z]+-?\d* ?/gi, ' ').replace(/[{}]/g, '')
    .replace(/[ \t]+/g, ' ').trim();
}

// בדיקה אם buffer נראה כמו טקסט (רוב התווים ניתנים להדפסה)
function looksLikeText(buf) {
  const n = Math.min(buf.length, 4000);
  if (!n) return false;
  let printable = 0;
  for (let i = 0; i < n; i++) {
    const c = buf[i];
    if (c === 9 || c === 10 || c === 13 || (c >= 32 && c !== 127)) printable++;
  }
  return printable / n > 0.85;
}

// חילוץ legacy — רשת ביטחון כשה-anydoc לא מייצר פלט (למשל PDF סרוק)
async function extractLegacy(buffer, filename, kind) {
  try {
    if (kind === 'pdf') {
      const parser = new PDFParse({ data: buffer });
      const res = await parser.getText();
      await parser.destroy?.();
      const t = (res.text || '').trim();
      // הסר מפרידי-עמוד של pdf-parse ("-- 1 of 51 --") — PDF סרוק מחזיר רק אותם, בלי תוכן
      const meaningful = t.replace(/--\s*\d+\s+of\s+\d+\s*--/g, '').replace(/\s+/g, ' ').trim();
      if (meaningful.length >= 20) return { kind, rawText: t };
      // PDF סרוק (בלי שכבת טקסט) → מסלול OCR אופליין (P2). יבוא דינמי כדי לא לטעון את
      // החבילות הכבדות (tesseract/pdfjs/canvas) עד שבאמת נדרש, וכדי להישבר בחן אם חסרות.
      const { ocrPdf } = await import('./ocr.js');
      const ocr = await ocrPdf(buffer);
      if (ocr.text && ocr.text.replace(/--\s*\d+\s+of\s+\d+\s*--/g, '').replace(/\s+/g, '').length >= 20) {
        return { kind, rawText: ocr.text, ocr: true, ocrConfidence: ocr.confidence };
      }
      return { kind, rawText: '', error: 'לא הופק טקסט מה-PDF (ככל הנראה סרוק/תמונה). ' + (ocr.error ? 'OCR נכשל: ' + ocr.error : 'נדרש OCR.') };
    }
    if (kind === 'docx') {
      const res = await mammoth.extractRawText({ buffer });
      return { kind, rawText: (res.value || '').trim() };
    }
    if (kind === 'html') return { kind, rawText: stripHtml(buffer.toString('utf8')) };
    if (kind === 'rtf') return { kind, rawText: stripRtf(buffer.toString('utf8')) };
    if (kind === 'text') return { kind, rawText: buffer.toString('utf8').trim() };
    if (kind === 'xlsx') {
      return { kind, rawText: '', error: 'קובץ Excel לא נקרא. ודא שהוא XLSX תקין, או המר ל-PDF ונסה שוב.' };
    }
    // fallback אחרון: אם נראה כמו טקסט — קרא כ-UTF-8; אחרת הודעה ברורה
    if (looksLikeText(buffer)) {
      return { kind: 'text', rawText: buffer.toString('utf8').trim() };
    }
    return { kind, rawText: '', error: `סוג קובץ בינארי לא נתמך (${kind}). המר ל-PDF או Word ונסה שוב.` };
  } catch (e) {
    return { kind, rawText: '', error: `שגיאת חילוץ (${kind}): ${e.message}` };
  }
}

export async function extractText(buffer, filename) {
  const kind = kindOf(filename);

  // — מסלול ראשי: anydoc → Markdown מובנה —
  // חריג: PDF *לא* עובר ב-anydoc. ה-pdf-inspector שלו לא מבצע BiDi reordering,
  // ולכן עברית (RTL) יוצאת הפוכה תו-תו. pdf-parse מטפל ב-RTL נכון → נתיב ה-legacy.
  try {
    const fmt = kind === 'pdf'
      ? null
      : (formatFromBytes(buffer) ?? formatFromExtension(extname(filename || '')));
    if (fmt) {
      const md = (await toMarkdownBytes(buffer, fmt) || '').trim();
      if (md) return { kind, rawText: md };
      // פלט ריק → נסה fallback (למשל PDF סרוק)
    }
  } catch (e) {
    if (e && e.code === 'encrypted') {
      return { kind, rawText: '', error: `הקובץ מוגן בסיסמה (${kind}). הסר את ההגנה ונסה שוב.` };
    }
    // unsupported / malformed / io / missingPart / resourceLimit → ממשיכים ל-fallback
  }

  // — רשת ביטחון —
  return extractLegacy(buffer, filename, kind);
}
