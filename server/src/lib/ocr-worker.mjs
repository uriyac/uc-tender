// ocr-worker.mjs — מריץ OCR בתהליך-בן **מבודד**, כדי להתנתק מזיהום-סביבה של pdf-parse
// (שמביא עותקים מקוננים משלו של pdfjs/@napi-rs וגורם לאי-התאמת גרסאות ב-tesseract).
// שימוש: node ocr-worker.mjs <pdfPath>  → מדפיס JSON ל-stdout.

import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

async function rasterize(buffer, { scale = 2, maxPages = 15 } = {}) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { createCanvas } = require('@napi-rs/canvas');
  const task = getDocument({ data: new Uint8Array(buffer), disableWorker: true, isEvalSupported: false, useSystemFonts: true });
  const doc = await task.promise;
  const pages = [];
  const n = Math.min(doc.numPages, maxPages);
  for (let i = 1; i <= n; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    pages.push(canvas.toBuffer('image/png'));
    page.cleanup();
  }
  try { await task.destroy(); } catch {}
  return pages;
}

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath || !existsSync(pdfPath)) return { error: 'קובץ לא נמצא' };
  const images = await rasterize(readFileSync(pdfPath));
  if (!images.length) return { error: 'לא נמצאו עמודים' };

  const { createWorker } = await import('tesseract.js');
  const langPath = join(here, 'tessdata');
  const hasLocal = existsSync(join(langPath, 'heb.traineddata')) || existsSync(join(langPath, 'heb.traineddata.gz'));
  const opts = {};
  try { opts.workerPath = require.resolve('tesseract.js/src/worker-script/node/index.js'); } catch {}
  try { opts.corePath = dirname(require.resolve('tesseract.js-core/package.json')); } catch {}
  if (hasLocal) { opts.langPath = langPath; opts.gzip = existsSync(join(langPath, 'heb.traineddata.gz')); opts.cacheMethod = 'none'; }

  const worker = await createWorker('heb', 1, opts);
  let text = '', confSum = 0, confN = 0;
  for (const img of images) {
    const { data } = await worker.recognize(img);
    text += (data.text || '').trim() + '\n\n';
    if (typeof data.confidence === 'number') { confSum += data.confidence; confN++; }
  }
  await worker.terminate();
  return { text: text.trim(), confidence: confN ? Math.round(confSum / confN) : null, pages: images.length, source: 'ocr' };
}

main()
  .then((r) => { process.stdout.write(JSON.stringify(r)); process.exit(0); })
  .catch((e) => { process.stdout.write(JSON.stringify({ error: e.message })); process.exit(0); });
