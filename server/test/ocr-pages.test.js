// ocr-pages.test.js — תקרת עמודים, סימון "-- N of M --" עם M אמיתי, ואזהרה כשדילגנו.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import {
  resolveMaxPages, resolveTimeoutMs, workerBudgetMs, truncationWarning, pageMarker, DEFAULT_MAX_PAGES,
} from '../src/lib/ocr-limits.js';
import { scanPdf } from '../src/lib/ocr-worker.mjs';
import { ocrPdf } from '../src/lib/ocr.js';
import { prepare } from '../src/lib/sourceSpan.js';

async function pdfWithPages(n) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < n; i++) doc.addPage([240, 320]);
  return Buffer.from(await doc.save());
}

const stub = async () => ({ text: 'מכרז פומבי מספר 22/2026 לניסיון', confidence: 91 });

test('תקרת עמודים: ברירת מחדל 200, 0 = בלי תקרה, ערך לא חוקי נופל לברירת המחדל', () => {
  assert.equal(resolveMaxPages(undefined), DEFAULT_MAX_PAGES);
  assert.equal(resolveMaxPages(''), 200);
  assert.equal(resolveMaxPages('0'), Infinity);
  assert.equal(resolveMaxPages('89'), 89);
  assert.equal(resolveMaxPages('-1'), 200);
  assert.equal(resolveMaxPages('foo'), 200);
});

test('תקציב הזמן ארוך מ-120ש של מודל ה-fast, וניתן לדרוס', () => {
  assert.ok(resolveTimeoutMs(15) > 120000, '15 עמודים של המודל המדויק לא נכנסים ל-120ש הישנות');
  assert.equal(resolveTimeoutMs(15, 120000), 120000);
  assert.equal(resolveTimeoutMs(200), 20 * 60 * 1000);
  assert.ok(workerBudgetMs(180000) < 180000);
});

test('אזהרה בעברית רק כשדילגנו על עמודים', () => {
  assert.equal(truncationWarning(89, 89), null);
  const w = truncationWarning(15, 89);
  assert.match(w, /89/);
  assert.match(w, /15/);
  assert.match(w, /לא נותח/);
  assert.equal(pageMarker(15, 89), '-- 15 of 89 --');
});

test('תקרה: 2 מתוך 4, הסימון מדווח 4, ויש אזהרה', async () => {
  const res = await scanPdf(await pdfWithPages(4), { maxPages: 2, recognize: stub });
  assert.equal(res.pageCount, 4);
  assert.equal(res.pages, 2);
  assert.equal(res.truncated, true);
  assert.match(res.text, /-- 1 of 4 --/);
  assert.match(res.text, /-- 2 of 4 --/);
  assert.doesNotMatch(res.text, /of 2 --/);
  assert.match(res.warning, /4/);
  assert.match(res.warning, /רק 2 עברו OCR/);
  const ends = prepare(res.text).ends;
  assert.equal(ends.length, 2, 'שני סמני עמוד, לא ארבעה');
});

test('בלי תקרה — כל העמודים, בלי אזהרה, M אמיתי', async () => {
  const res = await scanPdf(await pdfWithPages(3), { maxPages: 0, recognize: stub });
  assert.equal(res.pages, 3);
  assert.equal(res.pageCount, 3);
  assert.equal(res.truncated, false);
  assert.equal(res.warning, null);
  assert.match(res.text, /-- 3 of 3 --/);
});

test('תקציב זמן עוצר באמצע ומזהיר, בלי להרוג את מה שכבר חולץ', async () => {
  let ticks = 0;
  const now = () => (ticks += 10);
  const res = await scanPdf(await pdfWithPages(4), { maxPages: 10, budgetMs: 5, now, recognize: stub });
  assert.equal(res.pages, 1);
  assert.equal(res.pageCount, 4);
  assert.match(res.text, /-- 1 of 4 --/);
  assert.match(res.warning, /רק 1 עברו OCR/);
});

test('ocrPdf (תהליך-בן) מכבד OCR ומחזיר את אותו חוזה', async () => {
  const prev = process.env.OCR_STUB_TEXT;
  process.env.OCR_STUB_TEXT = 'מכרז סרוק לבדיקה עם מספיק תווים';
  try {
    const res = await ocrPdf(await pdfWithPages(4), { maxPages: 2, timeoutMs: 60000 });
    assert.equal(res.error, undefined, res.error);
    assert.equal(res.pages, 2);
    assert.equal(res.pageCount, 4);
    assert.match(res.text, /-- 1 of 4 --/);
    assert.match(res.text, /-- 2 of 4 --/);
    assert.match(res.warning, /לא נותח/);
    assert.equal(res.source, 'ocr');
  } finally {
    if (prev == null) delete process.env.OCR_STUB_TEXT;
    else process.env.OCR_STUB_TEXT = prev;
  }
});
