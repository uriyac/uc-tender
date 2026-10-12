// tenders.js — מכרזים: הזנה, פענוח, ניתוח, רשימה.

import { AsyncRouter } from '../lib/http.js';
import multer from 'multer';
import { engine } from '../engine/index.js';
import { extractText } from '../lib/extractText.js';
import { analyzeForm, buildSubmissionPacket } from '../packet/index.js';
import { REASON_CODES, isValidReasonCode, snapshotPrediction, issuerInsight } from '../learning/index.js';
import { tailorRequirements } from '../flex/tailor.js';
import { kbForClaims, cleanActivities } from '../flex/activities.js';
import { requirementStatuses, certExpiryChecks, computeGate, applyEvidence } from '../qualification/index.js';
import { locateAll } from '../lib/sourceSpan.js';
import { writeFileSync, mkdirSync, createReadStream, existsSync } from 'node:fs';
import { dirname, join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

// קובצי מכרז מקוריים — נשמרים כדי לפתוח את המקור בעמוד של הדרישה. נפרד מ-uploads/ של מסמכי החברה.
const TENDER_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'uploads', 'tenders');
mkdirSync(TENDER_DIR, { recursive: true });

// שער הכשירות: בדיקות-סף (+ תוקף אישורים מול מועד ההגשה) + סטטוסי דרישות → gate מחושב.
// ההחלטה נגזרת בקוד מהסטטוסים — לא מהמנוע ולא מהציון. ראה qualification/index.js.
function qualify(store, tender, reqs, analysis, thresholdChecks = []) {
  const expiry = certExpiryChecks(store.knowledge().certifications, { deadline: tender.deadline, rawText: tender.raw_text });
  // בדיקת-סף שהמשתמש גיבה במסמך (company.evidence) → met_verified. בלי קישור — נשארת הצהרה.
  const backed = applyEvidence(thresholdChecks, store.company().evidence, store.all('documents'));
  const checks = [...backed, ...expiry.checks];
  const requirements = requirementStatuses(reqs, analysis, checks);
  const gate = computeGate({ checks, requirements });
  return { gate, requirements, checks, expiryWarnings: expiry.warnings };
}

// בונה את אובייקט הידע לצ׳קליסטים: אישורים, קטגוריות מסמכים, סיווג.
function knowledgeFor(store) {
  const company = store.company();
  return {
    certifications: store.knowledge().certifications,
    documentCategories: [...new Set(store.all('documents').map((d) => d.category).filter(Boolean))],
    classification: company.classification || null,
  };
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const r = AsyncRouter();

// GET /api/tenders/reason-codes — קטגוריות סיבת-תוצאה (ל-dropdown בחזית). קבוע, לא מסונן-חשבון.
r.get('/reason-codes', (req, res) => res.json(REASON_CODES));

// GET /api/tenders — pipeline לדשבורד
r.get('/', (req, res) => res.json(req.store.all('tenders')));

// DELETE /api/tenders — ניקוי כל המכרזים של החשבון (מכרזים, דרישות, טיוטות, תוצאות).
// אינו נוגע במאגר הידע (פרויקטים, אישורים, מסמכי חברה) ולא בפרטי החברה.
r.delete('/', (req, res) => {
  const removed = {
    tenders: req.store.clear('tenders'),
    requirements: req.store.clear('requirements'),
    drafts: req.store.clear('drafts'),
    outcomes: req.store.clear('outcomes'),
  };
  res.json({ ok: true, removed });
});

// POST /api/tenders — הזנת מכרז (קובץ בשדה "file" או טקסט מודבק ב-body.text)
r.post('/', upload.single('file'), async (req, res) => {
  let text = (req.body?.text || '').trim();
  let ocrUsed = false, ocrConfidence = null, filePath = null, fileName = null;

  if (!text && req.file) {
    const original = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    fileName = original;
    filePath = `${Date.now()}_${original}`.replace(/[^\w.֐-׿ -]/g, '_');
    try { writeFileSync(join(TENDER_DIR, filePath), req.file.buffer); } catch { filePath = null; }
    const ext = await extractText(req.file.buffer, original);
    if (ext.error) return res.status(422).json({ error: ext.error });
    text = ext.rawText;
    ocrUsed = !!ext.ocr; ocrConfidence = ext.ocrConfidence ?? null; // מכרז סרוק → OCR (P2)
  }
  if (!text) return res.status(400).json({ error: 'לא התקבל מכרז (קובץ או טקסט)' });

  // פענוח + ניתוח + דגלים אדומים (הספירה נשמרת לתצוגת סיכון בכרטיס — S2.1)
  const eng = engine();
  const parsed = await eng.parseTender(text);
  const kb = kbForClaims(req.store.knowledge());
  const [analysis, redFlags, thresholds] = await Promise.all([
    eng.analyzeMatch(parsed.requirements, kb),
    eng.checkRedFlags(text),
    eng.checkThresholds(text, req.store.company()),
  ]);
  const flags = redFlags.flags || [];
  const { gate } = qualify(req.store, { deadline: parsed.deadline, raw_text: text }, parsed.requirements, analysis, thresholds.checks || []);

  // שמירת המכרז
  const tender = req.store.insert('tenders', {
    id: req.store.uid('t'),
    code: parsed.code || '#—',
    name: parsed.name || 'מכרז חדש',
    issuer: parsed.issuer || 'גורם מפרסם',
    stage: 'התאמה',
    days: parsed.deadline ? daysUntil(parsed.deadline) : 14,
    progress: 0,
    match_score: analysis.matchScore,
    gate: gate.status, // שער הכשירות — ההחלטה (PASS/CONDITIONAL/HOLD/FAIL); הציון משני
    // סיכון: ספירת דגלים (לכרטיס הדשבורד)
    red_flags: flags.length,
    red_flags_high: flags.filter((f) => f.severity === 'high').length,
    // מקור: OCR (מכרז סרוק) — לשקיפות בחזית
    ocr: ocrUsed, ocr_confidence: ocrConfidence,
    // הקובץ המקורי (אם הועלה קובץ) — לפתיחת המקור בעמוד הדרישה
    file_path: filePath, file_name: fileName,
    // סיכום מובנה (B11)
    deadline: parsed.deadline || null,
    guarantee: parsed.guarantee || null,
    classification: parsed.classification || null,
    min_turnover: parsed.min_turnover || null,
    duration: parsed.duration || null,
    // הטקסט המלא — ניתוח-מחדש רץ עליו. (חיתוך ל-20K קטע מכרזים ארוכים ואיבד תנאי-סף.) תקרת-בטיחות בלבד.
    raw_text: text.slice(0, 500000),
    created_at: new Date().toISOString(),
  });

  // שמירת הדרישות
  for (const req0 of parsed.requirements) {
    req.store.insert('requirements', {
      id: req.store.uid('req'), tender_id: tender.id,
      text: req0.text, category: req0.category || 'כללי', mandatory: !!req0.mandatory, status: null,
    });
  }

  res.status(201).json({ tender, analysis, gate });
});

// GET /api/tenders/:id — פרטי מכרז
r.get('/:id', (req, res) => {
  const t = req.store.find('tenders', req.params.id);
  if (!t) return res.status(404).json({ error: 'מכרז לא נמצא' });
  res.json(t);
});

// GET /api/tenders/:id/file — קובץ המכרז המקורי (inline; PDF נפתח בדפדפן, אפשר #page=N)
const TENDER_MIME = { pdf: 'application/pdf', txt: 'text/plain; charset=utf-8',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
r.get('/:id/file', (req, res) => {
  const t = req.store.find('tenders', req.params.id);
  if (!t || !t.file_path) return res.status(404).json({ error: 'אין קובץ מקור למכרז זה' });
  const safe = basename(t.file_path); // basename בלבד → מניעת path traversal
  const full = join(TENDER_DIR, safe);
  if (!existsSync(full)) return res.status(404).json({ error: 'הקובץ אינו זמין עוד' });
  res.setHeader('Content-Type', TENDER_MIME[extname(safe).slice(1).toLowerCase()] || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(t.file_name || safe)}`);
  createReadStream(full).on('error', () => res.sendStatus(500)).pipe(res);
});

// GET /api/tenders/:id/analysis — ניתוח התאמה מול המאגר
r.get('/:id/analysis', async (req, res) => {
  const t = req.store.find('tenders', req.params.id);
  if (!t) return res.status(404).json({ error: 'מכרז לא נמצא' });
  const reqs = req.store.all('requirements').filter((x) => x.tender_id === t.id);
  if (!reqs.length) {
    // מכרז seed בלי דרישות שמורות — ניתוח דמו קונסיסטנטי עם ה-match_score
    return res.json({ tender: t, matchScore: t.match_score, met: [], gaps: [], fails: [], thresholds: { checks: [] }, redFlags: { flags: [] }, demo: true });
  }
  const eng = engine();
  const [analysis, thresholds, redFlags] = await Promise.all([
    eng.analyzeMatch(reqs, kbForClaims(req.store.knowledge())),
    eng.checkThresholds(t.raw_text || '', req.store.company()),
    eng.checkRedFlags(t.raw_text || ''),
  ]);
  // העשרת כל פער במצב ההשלמה הידנית (manual_text) כדי שמסך הניתוח יוכל לטפל בו ולהציג "טופל"
  const byId = Object.fromEntries(reqs.map((r) => [r.id, r]));
  analysis.gaps = (analysis.gaps || []).map((g) => ({
    ...g,
    manualText: (g.id && byId[g.id] && byId[g.id].manual_text) || null,
  }));
  // S4.2 — זיכרון-מפרסם: אם התמודדנו מול המפרסם הזה בעבר (מעל הסף), מצרפים תובנה לבאנר.
  const issuer_insight = issuerInsight(t.issuer, req.store.all('tenders'), req.store.all('outcomes'));
  // שער הכשירות — מחושב מחדש בכל ניתוח (פרופיל/השלמות/אישורים עשויים להשתנות), ונשמר על המכרז
  // כדי שה-snapshot בעת סגירה יינעל על ההחלטה העדכנית.
  const q = qualify(req.store, t, reqs, analysis, thresholds.checks || []);
  if (t.gate !== q.gate.status) req.store.update('tenders', t.id, { gate: q.gate.status });
  // מקור לכל דרישה (עמוד + ציטוט) — מחושב בקוד מול הטקסט המקורי, לא מהמנוע. ראה lib/sourceSpan.js.
  const src = locateAll(reqs, t.raw_text || '');
  // בדיקת-סף (מחזור/סיווג/...) מקבלת את מקור הדרישה בעלת אותו נושא — הסעיף במכרז שממנו נגזרה.
  const srcByTopic = new Map();
  for (const rs of q.requirements) if (rs.topic && !srcByTopic.has(rs.topic) && src.byId.has(rs.id)) srcByTopic.set(rs.topic, src.byId.get(rs.id));
  const withSrc = (x) => {
    if (!x) return x;
    if (x.id && src.byId.has(x.id)) return { ...x, source: src.byId.get(x.id) };
    if (x.kind === 'threshold' && x.topic && srcByTopic.has(x.topic)) return { ...x, source: srcByTopic.get(x.topic) };
    return x;
  };
  analysis.gaps = (analysis.gaps || []).map(withSrc);
  q.gate.items = q.gate.items.map(withSrc);
  q.gate.blocking = q.gate.blocking.map(withSrc);
  const { file_path, raw_text, ...pub } = t; // לא חושפים נתיב דיסק; הטקסט הגולמי לא נדרש בחזית
  res.json({
    tender: { ...pub, gate: q.gate.status, has_file: !!(file_path && existsSync(join(TENDER_DIR, basename(file_path)))) }, ...analysis,
    thresholds: { checks: q.checks.map((c) => (c.topic && srcByTopic.has(c.topic) ? { ...c, source: srcByTopic.get(c.topic) } : c)) },
    redFlags, issuer_insight,
    gate: q.gate, requirement_statuses: q.requirements.map(withSrc), expiry_warnings: q.expiryWarnings,
    sources: { located: src.located, total: src.total, has_pages: src.hasPages },
  });
});

// GET /api/tenders/:id/mapping — מיפוי דרישה→מקור, כולל השלמות ידניות
r.get('/:id/mapping', async (req, res) => {
  const t = req.store.find('tenders', req.params.id);
  if (!t) return res.status(404).json({ error: 'מכרז לא נמצא' });
  const reqs = req.store.all('requirements').filter((x) => x.tender_id === t.id);
  const mapping = await buildMerged(req.store, reqs);
  const resolved = mapping.filter((m) => m.resolved).length;
  const coverage = mapping.length ? Math.round((resolved / mapping.length) * 100) : 0;
  const claimed = mapping.filter((m) => m.claimed).length; // מתוך resolved: הצהרה ידנית בלי מקור
  res.json({ tender: t, mapping, coverage, resolved, claimed, total: mapping.length });
});

// POST /api/tenders/:id/requirements/:rid/resolve — השלמה ידנית (טקסט חופשי)
r.post('/:id/requirements/:rid/resolve', (req, res) => {
  const { manualText } = req.body || {};
  if (!manualText || !manualText.trim()) return res.status(400).json({ error: 'נדרש טקסט השלמה' });
  const updated = req.store.update('requirements', req.params.rid, { manual_text: manualText.trim() });
  if (!updated) return res.status(404).json({ error: 'דרישה לא נמצאה' });
  res.json(updated);
});

// DELETE .../resolve — ביטול השלמה ידנית
r.delete('/:id/requirements/:rid/resolve', (req, res) => {
  const updated = req.store.update('requirements', req.params.rid, { manual_text: null });
  if (!updated) return res.status(404).json({ error: 'דרישה לא נמצאה' });
  res.json(updated);
});

// POST /api/tenders/:id/outcome — לולאת למידה (S4): תוצאה מקודדת + הגשה בפועל → מזין את הזיכרון.
//   לומד גם מזכייה וגם מכישלון: reason_code (רשימה סגורה) מאפשר התפלגות + זיכרון-מפרסם + כיול.
r.post('/:id/outcome', upload.array('files'), async (req, res) => {
  const t = req.store.find('tenders', req.params.id);
  if (!t) return res.status(404).json({ error: 'מכרז לא נמצא' });
  const { result, reason } = req.body || {};
  let { reason_code } = req.body || {};
  if (!['win', 'lose', 'pending'].includes(result)) {
    return res.status(400).json({ error: 'תוצאה לא חוקית (win/lose/pending)' });
  }
  // כישלון מחייב קטגוריית-סיבה סגורה (זה מה שהופך את הלמידה למדידה).
  if (result === 'lose') {
    if (!reason_code || !isValidReasonCode(reason_code)) {
      return res.status(400).json({ error: 'הפסד מחייב סיבה מקודדת (reason_code) מהרשימה', codes: REASON_CODES });
    }
  } else if (reason_code && !isValidReasonCode(reason_code)) {
    reason_code = null; // זכייה/ממתין: אופציונלי, מתעלמים מקוד לא חוקי
  }

  // הגשה בפועל → נלמדת לתוך המאגר. מזכייה — מסומנת כ"ראיה מנצחת" (source).
  const isWin = result === 'win';
  let learnedProjects = 0, learnedCerts = 0;
  for (const f of req.files || []) {
    const original = Buffer.from(f.originalname, 'latin1').toString('utf8');
    const { kind, rawText, error } = await extractText(f.buffer, original);
    if (error || !rawText) continue;
    const learned = await engine().extractKnowledge(rawText, { kind, filename: original });
    for (const p of learned.projects) {
      req.store.insert('projects', {
        id: req.store.uid('p'), name: p.name, year: p.year || null, dimensions: p.dimensions || [], activities: cleanActivities(p.activities, req.store),
        source_doc_id: null,
        // ראיה מנצחת: תיוג-מקור לשימוש בתפירה/טיוטה עתידית (אפס-הזיות — מעוגן בהגשה אמיתית)
        source: isWin ? 'הגשה זוכה' : 'הגשה',
        won_tender_id: isWin ? t.id : null,
        review: 'proposed', // חולץ ע"י המנוע — ממתין לאישור לפני שימוש
      });
      learnedProjects++;
    }
    for (const c of learned.certifications) {
      if (!req.store.all('certifications').some((x) => x.name === c.name)) {
        req.store.insert('certifications', { id: req.store.uid('cert'), name: c.name, valid_until: c.valid_until || null, status: c.status || 'זוהה', review: 'proposed' });
        learnedCerts++;
      }
    }
  }

  const outcome = req.store.insert('outcomes', {
    id: req.store.uid('out'), tender_id: t.id,
    result, reason_code: reason_code || null, reason: reason || null,
    prediction: snapshotPrediction(t), // נעילת הניבוי לכיול עתידי
    created_at: new Date().toISOString(),
  });
  req.store.update('tenders', t.id, { stage: result === 'pending' ? 'הוגש' : 'נסגר', progress: 100 });

  res.status(201).json({ outcome, learned: { projects: learnedProjects, certifications: learnedCerts, winningEvidence: isWin && learnedProjects > 0 } });
});

// GET /api/tenders/:id/tailoring — קומת הגמישות (F1): תפירת נכסים לדרישות המכרז.
// לכל דרישה — הנכס הרלוונטי ביותר, מודגש ומותפר, עם מד-מתיחה. אפס-הזיות (enforceTailoring).
r.get('/:id/tailoring', (req, res) => {
  const t = req.store.find('tenders', req.params.id);
  if (!t) return res.status(404).json({ error: 'מכרז לא נמצא' });
  const reqs = req.store.all('requirements').filter((x) => x.tender_id === t.id);
  const tailorings = tailorRequirements(reqs, req.store.knowledge());
  const tailored = tailorings.filter((x) => x.hasSource).length;
  const adjacent = tailorings.filter((x) => x.hasSource && x.relevance === 'adjacent').length;
  res.json({
    tender: t, tailorings,
    summary: { total: tailorings.length, tailored, adjacent, coverage: tailorings.length ? Math.round((tailored / tailorings.length) * 100) : 0 },
  });
});

// POST /api/tenders/:id/form/analyze — תצוגה מקדימה: מה יתמלא בטופס רשמי (בלי להפיק PDF)
r.post('/:id/form/analyze', upload.single('file'), async (req, res) => {
  const t = req.store.find('tenders', req.params.id);
  if (!t) return res.status(404).json({ error: 'מכרז לא נמצא' });
  if (!req.file) return res.status(400).json({ error: 'לא התקבל קובץ טופס (PDF)' });
  const out = await analyzeForm(req.file.buffer, req.store.company());
  if (!out.acroForm) return res.json({ acroForm: false, message: 'הטופס אינו מכיל שדות למילוי (AcroForm). ניתן להפיק חבילה עם הטופס כנספח וצ׳קליסט ידני.', ...out });
  res.json(out);
});

// POST /api/tenders/:id/packet — הפקת חבילת ההגשה המלאה (PDF אחד) מטופס רשמי שהועלה
r.post('/:id/packet', upload.single('file'), async (req, res) => {
  const t = req.store.find('tenders', req.params.id);
  if (!t) return res.status(404).json({ error: 'מכרז לא נמצא' });
  if (!req.file) return res.status(400).json({ error: 'לא התקבל קובץ טופס (PDF)' });
  if (!/pdf$/i.test(req.file.originalname) && req.file.mimetype !== 'application/pdf') {
    return res.status(415).json({ error: 'נדרש קובץ PDF (טופס רשמי עם שדות)' });
  }
  const { packetBytes, meta } = await buildSubmissionPacket(req.file.buffer, {
    tender: t, company: req.store.company(), knowledge: knowledgeFor(req.store),
  });
  const fname = `packet-${(t.code || 'tender').replace(/[^\w\-]/g, '')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
  res.setHeader('X-Packet-Meta', Buffer.from(JSON.stringify({
    ...meta.checklistSummary,
    acroForm: meta.acroForm,
    coverage: meta.summary && meta.summary.coverage,
    missingFields: meta.missingFields || [],
  })).toString('base64'));
  res.send(Buffer.from(packetBytes));
});

// מיפוי + מיזוג השלמות ידניות (משמש גם ביצירת הטיוטה). א-סינכרוני (מנוע claude).
export async function buildMerged(db, reqs) {
  const mapping = await engine().buildMapping(reqs, kbForClaims(db.knowledge()));
  return mapping.map((m, i) => ({
    ...m,
    id: reqs[i].id,
    manualText: reqs[i].manual_text || null,
    resolved: !!(m.hasSource || reqs[i].manual_text),
    // השלמה ידנית בלבד = הצהרה (Claimed), לא ראיה. נכנסת לטיוטה, אבל לא נספרת כמוכחת.
    claimed: !m.hasSource && !!reqs[i].manual_text,
  }));
}

function daysUntil(iso) {
  const d = Math.round((new Date(iso) - Date.now()) / 86400000);
  return Number.isFinite(d) && d > 0 ? d : 14;
}

export default r;
