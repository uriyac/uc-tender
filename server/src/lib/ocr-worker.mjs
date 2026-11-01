// ocr-worker.mjs — מריץ OCR בתהליך-בן **מבודד**, כדי להתנתק מזיהום-סביבה של pdf-parse
// (שמביא עותקים מקוננים משלו של pdfjs/@napi-rs וגורם לאי-התאמת גרסאות ב-tesseract).
// שימוש: node ocr-worker.mjs <pdfPath>  → מדפיס JSON ל-stdout.
//
// עמודים: ברירת המחדל OCR_MAX_PAGES (200, או 0 = בלי תקרה). סימון העמוד הוא
// "-- N of M --" כש-M הוא מספר העמודים האמיתי במסמך, גם אם נעצרנו באמצע.
// אם לא כל העמודים עברו OCR — warning בעברית (תקרה או תקציב זמן).

import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pageMarker, resolveMaxPages, truncationWarning } from './ocr-limits.js';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

async function openPdf(buffer) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(buffer), disableWorker: true, isEvalSupported: false, useSystemFonts: true });
  const doc = await task.promise;
  return {
    total: doc.numPages,
    async rasterize(pageNumber, scale, createCanvas) {
      const page = await doc.getPage(pageNumber);
      const vp = page.getViewport({ scale });
      const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      const png = canvas.toBuffer('image/png');
      page.cleanup();
      return png;
    },
    async close() { try { await task.destroy(); } catch { /* כבר נסגר */ } },
  };
}

async function createRecognizer() {
  // OCR_STUB_TEXT — רק לבדיקות: מדלג על tesseract ומחזיר טקסט קבוע לכל עמוד.
  if (process.env.OCR_STUB_TEXT) {
    const text = process.env.OCR_STUB_TEXT;
    return { recognize: async () => ({ text, confidence: 80 }), close: async () => {} };
  }
  const { createWorker } = await import('tesseract.js');
  const langPath = join(here, 'tessdata');
  const hasLocal = existsSync(join(langPath, 'heb.traineddata')) || existsSync(join(langPath, 'heb.traineddata.gz'));
  const opts = {};
  try { opts.workerPath = require.resolve('tesseract.js/src/worker-script/node/index.js'); } catch { /* ברירת מחדל של החבילה */ }
  try { opts.corePath = dirname(require.resolve('tesseract.js-core/package.json')); } catch { /* ברירת מחדל של החבילה */ }
  if (hasLocal) { opts.langPath = langPath; opts.gzip = existsSync(join(langPath, 'heb.traineddata.gz')); opts.cacheMethod = 'none'; }
  const worker = await createWorker('heb', 1, opts);
  return {
    recognize: async (png) => {
      const { data } = await worker.recognize(png);
      return { text: data.text || '', confidence: typeof data.confidence === 'number' ? data.confidence : null };
    },
    close: () => worker.terminate(),
  };
}

// סורק את ה-PDF עמוד-עמוד (לא צובר את כל התמונות בזיכרון). recognize אופציונלי לבדיקות.
export async function scanPdf(buffer, { scale = 2, maxPages, budgetMs, recognize, now = Date.now } = {}) {
  const cap = maxPages == null ? resolveMaxPages() : (maxPages === 0 ? Infinity : maxPages);
  const pdf = await openPdf(buffer);
  const { createCanvas } = require('@napi-rs/canvas');
  const rec = recognize ? { recognize, close: async () => {} } : await createRecognizer();
  const total = pdf.total;
  const limit = Math.min(total, Number.isFinite(cap) ? cap : total);
  let text = '';
  let confSum = 0, confN = 0, processed = 0;
  const started = now();
  try {
    for (let i = 1; i <= limit; i++) {
      if (processed > 0 && budgetMs && (now() - started) >= budgetMs) break;
      const png = await pdf.rasterize(i, scale, createCanvas);
      const data = await rec.recognize(png);
      text += `${String(data.text || '').trim()}\n\n${pageMarker(i, total)}\n\n`;
      if (typeof data.confidence === 'number') { confSum += data.confidence; confN++; }
      processed++;
    }
  } finally {
    await rec.close();
    await pdf.close();
  }
  if (!processed) return { error: 'לא נמצאו עמודים' };
  return {
    text: text.trim(),
    confidence: confN ? Math.round(confSum / confN) : null,
    pages: processed,
    pageCount: total,
    truncated: processed < total,
    warning: truncationWarning(processed, total),
    source: 'ocr',
  };
}

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath || !existsSync(pdfPath)) return { error: 'קובץ לא נמצא' };
  const budget = Number(process.env.OCR_BUDGET_MS);
  return scanPdf(readFileSync(pdfPath), {
    maxPages: resolveMaxPages(),
    budgetMs: Number.isFinite(budget) && budget > 0 ? budget : undefined,
  });
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main()
    .then((r) => { process.stdout.write(JSON.stringify(r)); process.exit(0); })
    .catch((e) => { process.stdout.write(JSON.stringify({ error: e.message })); process.exit(0); });
}
