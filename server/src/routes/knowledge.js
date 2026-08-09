// knowledge.js — מאגר הידע: פרויקטים, אישורים, ממדים.
// שלב 0: קריאה. שלב 1: יתווספו העלאה, חילוץ ועריכה שנשמרים.

import { Router } from 'express';
import * as store from '../data/store.js';

const r = Router();

// GET /api/knowledge — מאגר הידע + מונים + מקור מסמך לכל פריט
r.get('/', (req, res) => {
  const { projects, certifications } = store.knowledge();
  const docs = store.all('documents');
  const sourceOf = (id) => (docs.find((d) => d.id === id) || {}).filename || null;
  const withSource = (x) => ({ ...x, source: sourceOf(x.source_doc_id) });
  const dimensions = projects.reduce((n, p) => n + (p.dimensions?.length || 0), 0);
  res.json({
    projects: projects.map(withSource),
    certifications: certifications.map(withSource),
    counts: {
      projects: projects.length,
      certifications: certifications.length,
      dimensions,
      tendersLearned: store.all('outcomes').length,
    },
  });
});

// GET /api/knowledge/company — פרטי הארגון
r.get('/company', (req, res) => res.json(store.company()));

// PUT /api/knowledge/company — עדכון זהות/פרופיל החברה (אונבורדינג + הגדרות)
const COMPANY_STR = [
  'name', 'legal_entity', 'reg_no', 'address', 'website', 'email',
  'contact_name', 'contact_phone', 'main_domain', 'services',
  'senior_experience_years', 'certified_staff', 'public_sector_experience',
  'key_person_title', 'avg_turnover', 'notable_clients',
];
r.put('/company', (req, res) => {
  const b = req.body || {};
  const patch = {};
  for (const k of COMPANY_STR) if (b[k] != null) patch[k] = String(b[k]).trim();
  if (Array.isArray(b.specialties)) patch.specialties = b.specialties.filter(Boolean);
  if (Array.isArray(b.regions)) patch.regions = b.regions.filter(Boolean);
  if (typeof b.onboarded === 'boolean') patch.onboarded = b.onboarded;
  res.json(store.updateCompany(patch));
});

// --- עריכת מאגר הידע (נשמר) ---

// POST /api/knowledge/projects — הוספת פרויקט ידנית
r.post('/projects', (req, res) => {
  const { name, year, dimensions } = req.body || {};
  if (!name) return res.status(400).json({ error: 'נדרש שם פרויקט' });
  const p = store.insert('projects', {
    id: store.uid('p'), name, year: year || null,
    dimensions: Array.isArray(dimensions) ? dimensions : [], source_doc_id: null,
  });
  res.status(201).json(p);
});

// PUT /api/knowledge/projects/:id — עריכת פרויקט
r.put('/projects/:id', (req, res) => {
  const patch = {};
  for (const k of ['name', 'year', 'dimensions']) if (k in (req.body || {})) patch[k] = req.body[k];
  const updated = store.update('projects', req.params.id, patch);
  if (!updated) return res.status(404).json({ error: 'פרויקט לא נמצא' });
  res.json(updated);
});

// DELETE /api/knowledge/projects/:id
r.delete('/projects/:id', (req, res) => {
  store.remove('projects', req.params.id);
  res.json({ ok: true });
});

// --- אישורים ---
r.post('/certifications', (req, res) => {
  const { name, valid_until, status } = req.body || {};
  if (!name) return res.status(400).json({ error: 'נדרש שם אישור' });
  res.status(201).json(store.insert('certifications', {
    id: store.uid('cert'), name, valid_until: valid_until || null, status: status || 'הוזן ידנית', source_doc_id: null,
  }));
});
r.put('/certifications/:id', (req, res) => {
  const patch = {};
  for (const k of ['name', 'valid_until', 'status']) if (k in (req.body || {})) patch[k] = req.body[k];
  const updated = store.update('certifications', req.params.id, patch);
  if (!updated) return res.status(404).json({ error: 'אישור לא נמצא' });
  res.json(updated);
});
r.delete('/certifications/:id', (req, res) => {
  store.remove('certifications', req.params.id);
  res.json({ ok: true });
});

export default r;
