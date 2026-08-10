// tenders.js — מכרזים: הזנה, פענוח, ניתוח, רשימה.

import { Router } from 'express';
import multer from 'multer';
import * as store from '../data/store.js';
import { engine } from '../engine/index.js';
import { extractText } from '../lib/extractText.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const r = Router();

// GET /api/tenders — pipeline לדשבורד
r.get('/', (req, res) => res.json(store.all('tenders')));

// POST /api/tenders — הזנת מכרז (קובץ בשדה "file" או טקסט מודבק ב-body.text)
r.post('/', upload.single('file'), async (req, res) => {
  let text = (req.body?.text || '').trim();

  if (!text && req.file) {
    const original = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const ext = await extractText(req.file.buffer, original);
    if (ext.error) return res.status(422).json({ error: ext.error });
    text = ext.rawText;
  }
  if (!text) return res.status(400).json({ error: 'לא התקבל מכרז (קובץ או טקסט)' });

  // פענוח + ניתוח
  const parsed = await engine().parseTender(text);
  const kb = store.knowledge();
  const analysis = await engine().analyzeMatch(parsed.requirements, kb);

  // שמירת המכרז
  const tender = store.insert('tenders', {
    id: store.uid('t'),
    code: parsed.code || '#—',
    name: parsed.name || 'מכרז חדש',
    issuer: parsed.issuer || 'גורם מפרסם',
    stage: 'התאמה',
    days: parsed.deadline ? daysUntil(parsed.deadline) : 14,
    progress: 0,
    match_score: analysis.matchScore,
    // סיכום מובנה (B11)
    deadline: parsed.deadline || null,
    guarantee: parsed.guarantee || null,
    classification: parsed.classification || null,
    min_turnover: parsed.min_turnover || null,
    duration: parsed.duration || null,
    raw_text: text.slice(0, 20000),
    created_at: new Date().toISOString(),
  });

  // שמירת הדרישות
  for (const req0 of parsed.requirements) {
    store.insert('requirements', {
      id: store.uid('req'), tender_id: tender.id,
      text: req0.text, category: req0.category || 'דרישה', status: null,
    });
  }

  res.status(201).json({ tender, analysis });
});

// GET /api/tenders/:id — פרטי מכרז
r.get('/:id', (req, res) => {
  const t = store.find('tenders', req.params.id);
  if (!t) return res.status(404).json({ error: 'מכרז לא נמצא' });
  res.json(t);
});

// GET /api/tenders/:id/analysis — ניתוח התאמה מול המאגר
r.get('/:id/analysis', async (req, res) => {
  const t = store.find('tenders', req.params.id);
  if (!t) return res.status(404).json({ error: 'מכרז לא נמצא' });
  const reqs = store.all('requirements').filter((x) => x.tender_id === t.id);
  if (!reqs.length) {
    // מכרז seed בלי דרישות שמורות — ניתוח דמו קונסיסטנטי עם ה-match_score
    return res.json({ tender: t, matchScore: t.match_score, met: [], gaps: [], fails: [], thresholds: { checks: [] }, redFlags: { flags: [] }, demo: true });
  }
  const eng = engine();
  const [analysis, thresholds, redFlags] = await Promise.all([
    eng.analyzeMatch(reqs, store.knowledge()),
    eng.checkThresholds(t.raw_text || '', store.company()),
    eng.checkRedFlags(t.raw_text || ''),
  ]);
  // העשרת כל פער במצב ההשלמה הידנית (manual_text) כדי שמסך הניתוח יוכל לטפל בו ולהציג "טופל"
  const byId = Object.fromEntries(reqs.map((r) => [r.id, r]));
  analysis.gaps = (analysis.gaps || []).map((g) => ({
    ...g,
    manualText: (g.id && byId[g.id] && byId[g.id].manual_text) || null,
  }));
  res.json({ tender: t, ...analysis, thresholds, redFlags });
});

// GET /api/tenders/:id/mapping — מיפוי דרישה→מקור, כולל השלמות ידניות
r.get('/:id/mapping', async (req, res) => {
  const t = store.find('tenders', req.params.id);
  if (!t) return res.status(404).json({ error: 'מכרז לא נמצא' });
  const reqs = store.all('requirements').filter((x) => x.tender_id === t.id);
  const mapping = await buildMerged(reqs);
  const resolved = mapping.filter((m) => m.resolved).length;
  const coverage = mapping.length ? Math.round((resolved / mapping.length) * 100) : 0;
  res.json({ tender: t, mapping, coverage, resolved, total: mapping.length });
});

// POST /api/tenders/:id/requirements/:rid/resolve — השלמה ידנית (טקסט חופשי)
r.post('/:id/requirements/:rid/resolve', (req, res) => {
  const { manualText } = req.body || {};
  if (!manualText || !manualText.trim()) return res.status(400).json({ error: 'נדרש טקסט השלמה' });
  const updated = store.update('requirements', req.params.rid, { manual_text: manualText.trim() });
  if (!updated) return res.status(404).json({ error: 'דרישה לא נמצאה' });
  res.json(updated);
});

// DELETE .../resolve — ביטול השלמה ידנית
r.delete('/:id/requirements/:rid/resolve', (req, res) => {
  const updated = store.update('requirements', req.params.rid, { manual_text: null });
  if (!updated) return res.status(404).json({ error: 'דרישה לא נמצאה' });
  res.json(updated);
});

// POST /api/tenders/:id/outcome — לולאת למידה (S10): תוצאה + הגשה בפועל → מזין את הזיכרון
r.post('/:id/outcome', upload.array('files'), async (req, res) => {
  const t = store.find('tenders', req.params.id);
  if (!t) return res.status(404).json({ error: 'מכרז לא נמצא' });
  const { result, reason } = req.body || {};
  if (!['win', 'lose', 'pending'].includes(result)) {
    return res.status(400).json({ error: 'תוצאה לא חוקית (win/lose/pending)' });
  }

  // הגשה בפועל → נלמדת לתוך המאגר (כמו מסמך חברה)
  let learnedProjects = 0, learnedCerts = 0;
  for (const f of req.files || []) {
    const original = Buffer.from(f.originalname, 'latin1').toString('utf8');
    const { kind, rawText, error } = await extractText(f.buffer, original);
    if (error || !rawText) continue;
    const learned = await engine().extractKnowledge(rawText, { kind, filename: original });
    for (const p of learned.projects) {
      store.insert('projects', { id: store.uid('p'), name: p.name, year: p.year || null, dimensions: p.dimensions || [], source_doc_id: null });
      learnedProjects++;
    }
    for (const c of learned.certifications) {
      if (!store.all('certifications').some((x) => x.name === c.name)) {
        store.insert('certifications', { id: store.uid('cert'), name: c.name, valid_until: c.valid_until || null, status: c.status || 'זוהה' });
        learnedCerts++;
      }
    }
  }

  const outcome = store.insert('outcomes', {
    id: store.uid('out'), tender_id: t.id, result, reason: reason || null,
    created_at: new Date().toISOString(),
  });
  store.update('tenders', t.id, { stage: result === 'pending' ? 'הוגש' : 'נסגר', progress: 100 });

  res.status(201).json({ outcome, learned: { projects: learnedProjects, certifications: learnedCerts } });
});

// מיפוי + מיזוג השלמות ידניות (משמש גם ביצירת הטיוטה). א-סינכרוני (מנוע claude).
export async function buildMerged(reqs) {
  const mapping = await engine().buildMapping(reqs, store.knowledge());
  return mapping.map((m, i) => ({
    ...m,
    id: reqs[i].id,
    manualText: reqs[i].manual_text || null,
    resolved: !!(m.hasSource || reqs[i].manual_text),
  }));
}

function daysUntil(iso) {
  const d = Math.round((new Date(iso) - Date.now()) / 86400000);
  return Number.isFinite(d) && d > 0 ? d : 14;
}

export default r;
