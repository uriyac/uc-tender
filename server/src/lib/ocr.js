// ocr.js — OCR למכרזים סרוקים (P2). אופליין, בלי ענן, מתאים ל-on-prem.
// מריץ את ה-OCR בתהליך-בן מבודד (ocr-worker.mjs) כדי להתנתק מזיהום-סביבה של pdf-parse
// (שמביא עותקים מקוננים משלו של pdfjs/@napi-rs). זה גם עובד באפליקציית Electron ארוזה,
// דרך process.execPath + ELECTRON_RUN_AS_NODE.

import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const WORKER = join(here, 'ocr-worker.mjs');
let _unavailable = null;

// ocrPdf — מחלץ טקסט ממכרז סרוק דרך תהליך-בן מבודד. מחזיר { text, confidence, pages, source } או { error }.
export async function ocrPdf(buffer, { timeoutMs = 120000 } = {}) {
  if (_unavailable) return { error: _unavailable };
  let dir;
  try {
    dir = mkdtempSync(join(tmpdir(), 'uct-ocr-'));
    const pdfPath = join(dir, 'in.pdf');
    writeFileSync(pdfPath, buffer);

    const result = await new Promise((resolve) => {
      const child = spawn(process.execPath, [WORKER, pdfPath], {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, // מריץ את Electron כ-Node טהור באפליקציה הארוזה
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let out = '', err = '';
      const timer = setTimeout(() => { try { child.kill(); } catch {} resolve({ error: 'OCR חרג מהזמן המוקצב' }); }, timeoutMs);
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
