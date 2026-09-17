// drafts.js — יצירת טיוטה, צפייה, וייצוא Word/PDF.

import { AsyncRouter } from '../lib/http.js';
import { engine } from '../engine/index.js';
import { buildMerged } from './tenders.js';
import { enforceDraft } from '../engine/guardrail.js';
import { draftToDocx } from '../export/docx.js';
import { draftToPdf } from '../export/pdf.js';

const r = AsyncRouter();

const STATUS_BY_STAGE = { אישור: 'ממתין לאישור', טיוטה: 'טיוטה', התאמה: 'טיוטה' };

// GET /api/drafts — רשימת טיוטות (למסך "טיוטות ואישורים")
r.get('/', (req, res) => {
  const rows = req.store.all('tenders').map((t) => ({
    code: t.code, name: t.name,
    status: STATUS_BY_STAGE[t.stage] || 'טיוטה',
    progress: t.progress, tenderId: t.id,
  }));
  res.json(rows);
});

// POST /api/tenders/:id/draft נוסה תחת drafts ל-router נפרד — נשתמש כאן ב-/generate
// (מותקן תחת /api/drafts)
// POST /api/drafts/generate/:tenderId — יוצר/מרענן טיוטה למכרז
r.post('/generate/:tenderId', async (req, res) => {
  const t = req.store.find('tenders', req.params.tenderId);
  if (!t) return res.status(404).json({ error: 'מכרז לא נמצא' });
  const reqs = req.store.all('requirements').filter((x) => x.tender_id === t.id);
  const mapping = await buildMerged(req.store, reqs);
  const raw = await engine().generateDraft(mapping);
  // ★ השומר: אכיפה דטרמיניסטית של אפס-הזיות על פלט *כל* מנוע. עובדה קשיחה
  //   שאין לה מקור ממופה → הסקשן מנוטרל (needsManual+ריק), לעולם לא מגיע למשתמש.
  const { sections } = enforceDraft(raw.sections, mapping);

  // שמירה/עדכון טיוטה
  let draft = req.store.all('drafts').find((d) => d.tender_id === t.id);
  const payload = { tender_id: t.id, tender_code: t.code, tender_name: t.name, sections, updated_at: new Date().toISOString() };
  if (draft) draft = req.store.update('drafts', draft.id, payload);
  else draft = req.store.insert('drafts', { id: req.store.uid('draft'), ...payload });

  // עדכון התקדמות המכרז לפי כיסוי
  const done = sections.filter((s) => !s.needsManual).length;
  const progress = sections.length ? Math.round((done / sections.length) * 100) : 0;
  req.store.update('tenders', t.id, { progress, stage: 'טיוטה' });

  res.json(draft);
});

// GET /api/drafts/:id — צפייה בטיוטה
r.get('/:id', (req, res) => {
  const d = req.store.find('drafts', req.params.id);
  if (!d) return res.status(404).json({ error: 'טיוטה לא נמצאה' });
  res.json(d);
});

// GET /api/drafts/:id/export.docx
r.get('/:id/export.docx', async (req, res) => {
  const d = req.store.find('drafts', req.params.id);
  if (!d) return res.status(404).json({ error: 'טיוטה לא נמצאה' });
  const buf = await draftToDocx(d);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="draft-${encodeURIComponent(d.tender_code || d.id)}.docx"`);
  res.send(buf);
});

// GET /api/drafts/:id/export.pdf
r.get('/:id/export.pdf', (req, res) => {
  const d = req.store.find('drafts', req.params.id);
  if (!d) return res.status(404).json({ error: 'טיוטה לא נמצאה' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="draft-${encodeURIComponent(d.tender_code || d.id)}.pdf"`);
  draftToPdf(d, res);
});

export default r;
