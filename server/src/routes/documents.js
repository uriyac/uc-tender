// documents.js — העלאת מסמכי חברה → חילוץ טקסט → למידת ידע → שמירה.

import { Router } from 'express';
import multer from 'multer';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as store from '../data/store.js';
import { engine } from '../engine/index.js';
import { extractText } from '../lib/extractText.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = join(__dirname, '..', '..', 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const r = Router();

// קטגוריות מסמכים — טקסונומיה יציבה לפי מה שהמנוע מחלץ ומכרזים דורשים
export const DOC_CATEGORIES = [
  { key: 'projects', label: 'פרויקטים וניסיון' },
  { key: 'certifications', label: 'אישורים ותקנים' },
  { key: 'financial', label: 'פיננסי' },
  { key: 'staff', label: 'כוח אדם וכשירות' },
  { key: 'clients', label: 'לקוחות והמלצות' },
];
const CAT_KEYS = new Set(DOC_CATEGORIES.map((c) => c.key));

function computeReadiness() {
  const docs = store.all('documents');
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

    const doc = store.insert('documents', {
      id: store.uid('doc'), filename: original, path: safe, kind, category,
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
      store.insert('projects', {
        id: store.uid('p'), name: p.name, year: p.year || null,
        dimensions: p.dimensions || [], source_doc_id: doc.id,
      });
    }
    for (const c of learned.certifications) {
      const exists = store.all('certifications').some((x) => x.name === c.name);
      if (!exists) store.insert('certifications', {
        id: store.uid('cert'), name: c.name, valid_until: c.valid_until || null,
        status: c.status || 'זוהה', source_doc_id: doc.id,
      });
    }

    results.push({
      id: doc.id, filename: original, kind, status: 'done', category, autoClassified,
      projects: learned.projects.length,
      certifications: learned.certifications.length,
    });
  }

  const { counts } = readKnowledge();
  res.json({ results, counts, readiness: computeReadiness() });
});

// GET /api/documents/readiness — כיסוי קטגוריות (מד מוכנוּת)
r.get('/readiness', (req, res) => res.json(computeReadiness()));

// GET /api/documents/list — רשימת מסמכים שהועלו (למסך הסקירה)
r.get('/list', (req, res) => {
  res.json(store.all('documents').map((d) => ({ id: d.id, filename: d.filename, category: d.category, status: d.status })));
});

// PUT /api/documents/:id/category — שינוי סיווג ידני
r.put('/:id/category', (req, res) => {
  const { category } = req.body || {};
  if (!CAT_KEYS.has(category)) return res.status(400).json({ error: 'קטגוריה לא חוקית' });
  const updated = store.update('documents', req.params.id, { category });
  if (!updated) return res.status(404).json({ error: 'מסמך לא נמצא' });
  res.json({ ok: true, readiness: computeReadiness() });
});

function readKnowledge() {
  const { projects, certifications } = store.knowledge();
  const dimensions = projects.reduce((n, p) => n + (p.dimensions?.length || 0), 0);
  return { counts: { projects: projects.length, certifications: certifications.length, dimensions } };
}

export default r;
