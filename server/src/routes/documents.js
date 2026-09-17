// documents.js — העלאת מסמכי חברה → חילוץ טקסט → למידת ידע → שמירה.

import { AsyncRouter } from '../lib/http.js';
import multer from 'multer';
import { writeFileSync, mkdirSync, createReadStream, existsSync } from 'node:fs';
import { dirname, join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { engine } from '../engine/index.js';
import { extractText } from '../lib/extractText.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = join(__dirname, '..', '..', 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const r = AsyncRouter();

// קטגוריות מסמכים — טקסונומיה יציבה לפי מה שהמנוע מחלץ ומכרזים דורשים
export const DOC_CATEGORIES = [
  { key: 'projects', label: 'פרויקטים וניסיון' },
  { key: 'certifications', label: 'אישורים ותקנים' },
  { key: 'financial', label: 'פיננסי' },
  { key: 'staff', label: 'כוח אדם וכשירות' },
  { key: 'clients', label: 'לקוחות והמלצות' },
];
const CAT_KEYS = new Set(DOC_CATEGORIES.map((c) => c.key));

function computeReadiness(db) {
  const docs = db.all('documents');
  const categories = DOC_CATEGORIES.map((c) => {
    const count = docs.filter((d) => d.category === c.key).length;
    return { key: c.key, label: c.label, count, covered: count > 0 };
  });
  const covered = categories.filter((c) => c.covered).length;
  return { categories, covered, total: DOC_CATEGORIES.length, pct: Math.round((covered / DOC_CATEGORIES.length) * 100) };
}

// POST /api/documents — קובץ אחד או יותר (שדה "files")
r.post('/', upload.array('files'), async (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: 'לא התקבלו קבצים' });

  // קטגוריה מהסל שאליו נגרר הקובץ (אם סופקה); אחרת סיווג אוטומטי
  const providedCat = CAT_KEYS.has(req.body?.category) ? req.body.category : null;

  const results = [];
  for (const f of files) {
    const original = Buffer.from(f.originalname, 'latin1').toString('utf8'); // multer מקודד ל-latin1
    const { kind, rawText, error } = await extractText(f.buffer, original);

    // סיווג: מהסל אם סופק, אחרת המנוע מנחש
    const category = providedCat || (rawText ? await engine().classifyDocument(rawText, { kind, filename: original }) : 'projects');
    const autoClassified = !providedCat;

    // שמירת הקובץ לדיסק
    const safe = `${Date.now()}_${original}`.replace(/[^\w.֐-׿ -]/g, '_');
    const path = join(UPLOAD_DIR, safe);
    try { writeFileSync(path, f.buffer); } catch { /* אחסון בלבד */ }

    const doc = req.store.insert('documents', {
      id: req.store.uid('doc'), filename: original, path: safe, kind, category,
      status: error ? 'error' : 'done', created_at: new Date().toISOString(),
    });

    if (error || !rawText) {
      results.push({ id: doc.id, filename: original, kind, status: 'error', error: error || 'טקסט ריק', category, autoClassified, projects: 0, certifications: 0 });
      continue;
    }

    // המנוע לומד מהטקסט
    const learned = await engine().extractKnowledge(rawText, { kind, filename: original });

    // שמירת פרויקטים + אישורים (מקושרים למסמך המקור)
    for (const p of learned.projects) {
      req.store.insert('projects', {
        id: req.store.uid('p'), name: p.name, year: p.year || null,
        dimensions: p.dimensions || [], source_doc_id: doc.id,
      });
    }
    for (const c of learned.certifications) {
      const exists = req.store.all('certifications').some((x) => x.name === c.name);
      if (!exists) req.store.insert('certifications', {
        id: req.store.uid('cert'), name: c.name, valid_until: c.valid_until || null,
        status: c.status || 'זוהה', source_doc_id: doc.id,
      });
    }

    results.push({
      id: doc.id, filename: original, kind, status: 'done', category, autoClassified,
      projects: learned.projects.length,
      certifications: learned.certifications.length,
    });
  }

  const { counts } = readKnowledge(req.store);
  res.json({ results, counts, readiness: computeReadiness(req.store) });
});

// טיפוסי MIME לתצוגה מוטמעת (PDF נפתח בדפדפן; השאר יורדים)
const MIME = {
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  txt: 'text/plain; charset=utf-8', csv: 'text/csv; charset=utf-8',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

// GET /api/documents/:id/file — הגשת הקובץ המקורי (inline; PDF מוצג בדפדפן)
r.get('/:id/file', (req, res) => {
  const doc = req.store.find('documents', req.params.id);
  if (!doc || !doc.path) return res.status(404).json({ error: 'קובץ לא נמצא' });
  const safe = basename(doc.path); // basename בלבד → מניעת path traversal
  const full = join(UPLOAD_DIR, safe);
  if (!existsSync(full)) return res.status(404).json({ error: 'הקובץ אינו זמין עוד' });
  const ext = extname(safe).slice(1).toLowerCase();
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(doc.filename || safe)}`);
  createReadStream(full).on('error', () => res.sendStatus(500)).pipe(res);
});

// GET /api/documents/readiness — כיסוי קטגוריות (מד מוכנוּת)
r.get('/readiness', (req, res) => res.json(computeReadiness(req.store)));

// GET /api/documents/list — רשימת מסמכים שהועלו (למסך הסקירה)
r.get('/list', (req, res) => {
  res.json(req.store.all('documents').map((d) => ({ id: d.id, filename: d.filename, category: d.category, status: d.status })));
});

// PUT /api/documents/:id/category — שינוי סיווג ידני
r.put('/:id/category', (req, res) => {
  const { category } = req.body || {};
  if (!CAT_KEYS.has(category)) return res.status(400).json({ error: 'קטגוריה לא חוקית' });
  const updated = req.store.update('documents', req.params.id, { category });
  if (!updated) return res.status(404).json({ error: 'מסמך לא נמצא' });
  res.json({ ok: true, readiness: computeReadiness(req.store) });
});

function readKnowledge(db) {
  const { projects, certifications } = db.knowledge();
  const dimensions = projects.reduce((n, p) => n + (p.dimensions?.length || 0), 0);
  return { counts: { projects: projects.length, certifications: certifications.length, dimensions } };
}

export default r;
