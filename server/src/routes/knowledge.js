// knowledge.js — מאגר הידע: פרויקטים, אישורים, ממדים.
// שלב 0: קריאה. שלב 1: יתווספו העלאה, חילוץ ועריכה שנשמרים.

import { AsyncRouter } from '../lib/http.js';
import { EVIDENCE_FIELDS } from '../qualification/index.js';

const r = AsyncRouter();
// req.store — accessor מסונן לחשבון (נקבע ב-requireAuth). הבידוד המבני.

// GET /api/knowledge — מאגר הידע + מונים + מקור מסמך לכל פריט
r.get('/', (req, res) => {
  const { projects, certifications } = req.store.knowledge();
  const docs = req.store.all('documents');
  const sourceOf = (id) => (docs.find((d) => d.id === id) || {}).filename || null;
  const withSource = (x) => ({ ...x, source: sourceOf(x.source_doc_id) });
  const dimensions = projects.reduce((n, p) => n + (p.dimensions?.length || 0), 0);
  const pending = req.store.pendingKnowledge();
  res.json({
    projects: projects.map(withSource),
    certifications: certifications.map(withSource),
    // הצעות המנוע שממתינות לאישור — מוצגות בנפרד, לא נספרות ולא משמשות עד אישור.
    pending: { projects: pending.projects.map(withSource), certifications: pending.certifications.map(withSource) },
    counts: {
      projects: projects.length,
      certifications: certifications.length,
      dimensions,
      tendersLearned: req.store.all('outcomes').length,
      pending: pending.projects.length + pending.certifications.length,
    },
  });
});

// GET /api/knowledge/company — פרטי הארגון
r.get('/company', (req, res) => res.json(req.store.company()));

// PUT /api/knowledge/company — עדכון זהות/פרופיל החברה (אונבורדינג + הגדרות)
const COMPANY_STR = [
  'name', 'legal_entity', 'reg_no', 'address', 'website', 'email',
  'contact_name', 'contact_phone', 'main_domain', 'services',
  'senior_experience_years', 'certified_staff', 'public_sector_experience',
  'key_person_title', 'avg_turnover', 'classification', 'notable_clients',
];
r.put('/company', (req, res) => {
  const b = req.body || {};
  const patch = {};
  for (const k of COMPANY_STR) if (b[k] != null) patch[k] = String(b[k]).trim();
  if (Array.isArray(b.specialties)) patch.specialties = b.specialties.filter(Boolean);
  if (Array.isArray(b.regions)) patch.regions = b.regions.filter(Boolean);
  if (typeof b.onboarded === 'boolean') patch.onboarded = b.onboarded;
  // ערך שהשתנה מבטל את הראיה שקושרה לו — מסמך שגיבה את הערך הישן אינו מגבה את החדש.
  const cur = req.store.company();
  const ev = { ...(cur.evidence || {}) };
  let evChanged = false;
  for (const [topic, field] of Object.entries(EVIDENCE_FIELDS)) {
    if (field in patch && ev[topic] && String(cur[field] ?? '') !== patch[field]) { delete ev[topic]; evChanged = true; }
  }
  if (evChanged) patch.evidence = ev;
  res.json(req.store.updateCompany(patch));
});

// PUT /api/knowledge/company/evidence { topic, doc_id|null } — קישור מסמך כראיה לנתון בפרופיל.
// זו פעולה אנושית מפורשת: המשתמש קובע שהמסמך הזה מוכיח את הנתון. doc_id=null מבטל קישור.
r.put('/company/evidence', (req, res) => {
  const { topic, doc_id } = req.body || {};
  if (!EVIDENCE_FIELDS[topic]) return res.status(400).json({ error: 'נושא ראיה לא מוכר' });
  const ev = { ...(req.store.company().evidence || {}) };
  if (doc_id == null) delete ev[topic];
  else {
    const doc = req.store.find('documents', doc_id);
    if (!doc) return res.status(404).json({ error: 'מסמך לא נמצא' });
    ev[topic] = { doc_id: doc.id, linked_at: new Date().toISOString(), linked_by: req.user?.id || null };
  }
  res.json(req.store.updateCompany({ evidence: ev }));
});

// --- עריכת מאגר הידע (נשמר) ---

// POST /api/knowledge/projects — הוספת פרויקט ידנית
r.post('/projects', (req, res) => {
  const { name, year, dimensions } = req.body || {};
  if (!name) return res.status(400).json({ error: 'נדרש שם פרויקט' });
  const p = req.store.insert('projects', {
    id: req.store.uid('p'), name, year: year || null,
    dimensions: Array.isArray(dimensions) ? dimensions : [], source_doc_id: null,
  });
  res.status(201).json(p);
});

// PUT /api/knowledge/projects/:id — עריכת פרויקט
r.put('/projects/:id', (req, res) => {
  const patch = {};
  for (const k of ['name', 'year', 'dimensions']) if (k in (req.body || {})) patch[k] = req.body[k];
  const updated = req.store.update('projects', req.params.id, patch);
  if (!updated) return res.status(404).json({ error: 'פרויקט לא נמצא' });
  res.json(updated);
});

// DELETE /api/knowledge/projects/:id
r.delete('/projects/:id', (req, res) => {
  req.store.remove('projects', req.params.id);
  res.json({ ok: true });
});

// --- אישורים ---
r.post('/certifications', (req, res) => {
  const { name, valid_until, status } = req.body || {};
  if (!name) return res.status(400).json({ error: 'נדרש שם אישור' });
  res.status(201).json(req.store.insert('certifications', {
    id: req.store.uid('cert'), name, valid_until: valid_until || null, status: status || 'הוזן ידנית', source_doc_id: null,
  }));
});
r.put('/certifications/:id', (req, res) => {
  const patch = {};
  for (const k of ['name', 'valid_until', 'status']) if (k in (req.body || {})) patch[k] = req.body[k];
  const updated = req.store.update('certifications', req.params.id, patch);
  if (!updated) return res.status(404).json({ error: 'אישור לא נמצא' });
  res.json(updated);
});
r.delete('/certifications/:id', (req, res) => {
  req.store.remove('certifications', req.params.id);
  res.json({ ok: true });
});

// --- אישור/דחייה של ידע שהמנוע הציע (AI מציע, אדם מאשר) ---
// POST /api/knowledge/review { action: 'approve'|'reject', items: [{ type: 'project'|'certification', id }] }
// דחייה אינה מוחקת — הפריט נשמר כ-'rejected' (תיעוד, ומניעת חילוץ חוזר של אותו אישור).
const REVIEW_COLL = { project: 'projects', certification: 'certifications' };
r.post('/review', (req, res) => {
  const { action, items } = req.body || {};
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'פעולה לא חוקית (approve/reject)' });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'לא נבחרו פריטים' });
  const review = action === 'approve' ? 'approved' : 'rejected';
  let updated = 0;
  for (const it of items) {
    const coll = REVIEW_COLL[it && it.type];
    if (!coll) continue;
    const cur = req.store.find(coll, it.id);
    if (!cur || cur.review !== 'proposed') continue; // רק הצעות פתוחות; לא דורסים החלטה קודמת
    req.store.update(coll, it.id, { review, reviewed_at: new Date().toISOString(), reviewed_by: req.user?.id || null });
    updated++;
  }
  res.json({ ok: true, updated, pending: countPending(req.store) });
});

function countPending(store) {
  const p = store.pendingKnowledge();
  return p.projects.length + p.certifications.length;
}

export default r;
