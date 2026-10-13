// document/index.js — "המסמך החי": טקסט המכרז המלא, עם כל דרישה ופרט מסומנים במקומם. טהור, דטרמיניסטי.
//
// למה: אמינות. במקום "תאמין למערכת", המשתמש רואה בעיניים איפה כל דרישה כתובה במכרז ומה מצבה.
// דרישה שלא אותרה בטקסט לא מקבלת סימון — והיא מוחזרת ב-unlocated, כדי שהחזית תציג אותה בגלוי.
//
// ההיסטים (start/end) הם לטקסט המנורמל שמוחזר כאן (normalizeText — בלי טאבים של pdf-parse),
// כך שהחזית חותכת בדיוק את מה שהשרת איתר.

import { normalizeText } from '../lib/tenderSections.js';
import { prepare, locate } from '../lib/sourceSpan.js';

const PAGE_MARK = /--\s*(\d+)\s+of\s+(\d+)\s*--/g;

// עמודים: [{ n, start, end }] לפי סימוני pdf-parse/OCR. בלי סימונים → עמוד אחד.
export function pagesOf(text) {
  const pages = [];
  let start = 0, n = 1;
  for (const m of text.matchAll(PAGE_MARK)) {
    pages.push({ n, start, end: m.index });
    start = m.index + m[0].length;
    n = +m[1] + 1;
  }
  if (start < text.length && text.slice(start).trim()) pages.push({ n: pages.length ? n : 1, start, end: text.length });
  return pages.length ? pages : [{ n: 1, start: 0, end: text.length }];
}

// requirements: [{ id, text, status, category, mandatory }] (סטטוס מהשער). facts: פרטי התקציר שנמצאו.
export function buildLiveDocument({ rawText = '', requirements = [], facts = [] }) {
  const text = normalizeText(rawText);
  const ctx = prepare(text);
  const marks = [], unlocated = [];

  for (const r of requirements) {
    const s = locate(r.text, ctx);
    const base = { id: r.id, kind: 'requirement', label: r.text, status: r.status || null, category: r.category || null, mandatory: !!r.mandatory };
    if (s.match === 'unresolved' || s.start == null) { unlocated.push(base); continue; }
    marks.push({ ...base, start: s.start, end: s.end, page: s.page, match: s.match });
  }
  for (const f of facts) {
    if (!f || !f.found || !f.value) continue;
    const s = locate(f.value, ctx);
    if (s.match === 'unresolved' || s.start == null) continue;
    marks.push({ id: `fact:${f.label}`, kind: 'fact', label: f.label, value: f.value, start: s.start, end: s.end, page: s.page, match: s.match });
  }

  // בלי חפיפות: דרישה גוברת על פרט, ואחר כך מי שמתחיל קודם. סימון חופף נשמר ב-overlaps (לא נעלם מהרשימה).
  marks.sort((a, b) => a.start - b.start || (a.kind === 'requirement' ? -1 : 1));
  const placed = [], overlaps = [];
  for (const m of marks) {
    const clash = placed.find((p) => m.start < p.end && p.start < m.end);
    if (!clash) placed.push(m);
    else if (m.kind === 'requirement' && clash.kind === 'fact') { placed.splice(placed.indexOf(clash), 1, m); }
    else overlaps.push({ ...m, shared_with: clash.id });
  }
  placed.sort((a, b) => a.start - b.start);
  return { text, pages: pagesOf(text), marks: placed, overlaps, unlocated };
}
