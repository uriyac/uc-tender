// ocr.js — OCR למכרזים סרוקים (P2). אופליין, בלי ענן, מתאים ל-on-prem.
// מריץ את ה-OCR בתהליך-בן מבודד (ocr-worker.mjs) כדי להתנתק מזיהום-סביבה של pdf-parse
// (שמביא עותקים מקוננים משלו של pdfjs/@napi-rs). זה גם עובד באפליקציית Electron ארוזה,
// דרך process.execPath + ELECTRON_RUN_AS_NODE.

import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveMaxPages, resolveTimeoutMs, workerBudgetMs } from './ocr-limits.js';

const here = dirname(fileURLToPath(import.meta.url));
const WORKER = join(here, 'ocr-worker.mjs');
let _unavailable = null;

// ocrPdf — מחלץ טקסט ממכרז סרוק דרך תהליך-בן מבודד.
// מחזיר { text, confidence, pages, pageCount, truncated, warning, source } או { error }.
// timeoutMs ברירת-המחדל גדל עם תקרת העמודים: מודל tessdata_best איטי מה-fast,
// ו-120 שניות (שכיסו 15 עמודי fast) היו חותכות מכרז ארוך באמצע — או הורגות את כל הפלט.
// ה-worker מפסיק בעצמו לפני ההרג (OCR_BUDGET_MS) ומחזיר את מה שחולץ + אזהרה.
export async function ocrPdf(buffer, { timeoutMs, maxPages } = {}) {
  if (_unavailable) return { error: _unavailable };
  const cap = maxPages == null ? resolveMaxPages() : resolveMaxPages(maxPages);
  const timeout = resolveTimeoutMs(cap, timeoutMs);
  const budget = workerBudgetMs(timeout);
  let dir;
  try {
    dir = mkdtempSync(join(tmpdir(), 'uct-ocr-'));
    const pdfPath = join(dir, 'in.pdf');
    writeFileSync(pdfPath, buffer);

    const result = await new Promise((resolve) => {
      const child = spawn(process.execPath, [WORKER, pdfPath], {
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1', // מריץ את Electron כ-Node טהור באפליקציה הארוזה
          OCR_MAX_PAGES: Number.isFinite(cap) ? String(cap) : '0',
          OCR_BUDGET_MS: String(budget),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let out = '', err = '';
      const timer = setTimeout(() => { try { child.kill(); } catch {} resolve({ error: 'OCR חרג מהזמן המוקצב' }); }, timeout);
      child.stdout.on('data', (d) => (out += d));
      child.stderr.on('data', (d) => (err += d));
      child.on('error', (e) => { clearTimeout(timer); resolve({ error: e.message }); });
      child.on('close', () => {
        clearTimeout(timer);
        try { resolve(JSON.parse(out.trim() || '{}')); }
        catch { resolve({ error: 'פלט OCR לא תקין' + (err ? ': ' + err.slice(0, 200) : '') }); }
      });
    });
    if (result && /Cannot find|ERR_MODULE_NOT_FOUND/.test(result.error || '')) _unavailable = 'מנוע ה-OCR אינו זמין בסביבה זו';
    return result;
  } catch (e) {
    return { error: 'OCR נכשל: ' + e.message };
  } finally {
    if (dir) try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}
