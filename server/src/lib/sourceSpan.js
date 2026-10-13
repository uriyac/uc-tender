// sourceSpan.js — איתור המקור של דרישה בטקסט המקורי של המכרז (עמוד + ציטוט). דטרמיניסטי, לא AI.
//
// עיקרון (מסמך האב §28.3, PD-05): לכל טענה מהותית — מקור שאפשר לפתוח. המנוע (stub או claude)
// מחלץ דרישות; כאן *הקוד* מוודא שכל דרישה באמת מופיעה במסמך:
//   exact      — הנוסח נמצא כמעט מילה במילה.
//   approx     — רוב המילים נמצאות בשורה אחת (המנוע ניסח מחדש / קיצר) — לבדוק מול המקור.
//   unresolved — לא אותר במסמך. אולי המנוע המציא או איחד; אסור להסתמך בלי בדיקה ידנית.
//
// עמודים: pdf-parse ו-OCR מסמנים סוף עמוד כ-"-- N of M --". בלי סימונים (Word/טקסט) → page=null.

const PAGE_MARK = /--\s*(\d+)\s+of\s+(\d+)\s*--/g;
const APPROX_MIN = 0.7; // שיעור המילים המשמעותיות של הדרישה שחייבות להופיע בשורה

// נרמול להשוואה: בלי Markdown, גרשיים, פיסוק ורווחים כפולים.
export function normalize(s) {
  return String(s || '')
    .replace(/<\/?u>/gi, ' ')
    .replace(/[*#|`_>]/g, ' ')
    .replace(/["'״׳“”‘’]/g, '')
    .replace(/[.,;:()[\]{}!?–—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const words = (s) => normalize(s).split(' ').filter((w) => w.length >= 2);

// סופי עמודים (offset של כל סימון) — עמוד של offset = 1 + מספר הסימונים שלפניו.
function pageEnds(rawText) {
  const ends = [];
  for (const m of String(rawText || '').matchAll(PAGE_MARK)) ends.push(m.index);
  return ends;
}

export function pageAt(ends, offset) {
  if (!ends.length) return null;
  let n = 0;
  while (n < ends.length && ends[n] < offset) n++;
  return Math.min(n + 1, ends.length);
}

// שורות המסמך עם offset — חלונות של שורה אחת ושתיים (דרישה שנשברה לשתי שורות).
function windows(rawText) {
  const text = String(rawText || '');
  const lines = [];
  let pos = 0;
  for (const line of text.split('\n')) {
    // offset = תחילת הטקסט בשורה (אחרי רווחים מובילים); end = סופו — טווח להדגשה במסמך החי
    if (line.trim() && !PAGE_MARK.test(line)) { const lead = line.length - line.trimStart().length; lines.push({ text: line.trim(), offset: pos + lead, end: pos + lead + line.trim().length }); }
    PAGE_MARK.lastIndex = 0;
    pos += line.length + 1;
  }
  const out = lines.map((l) => ({ ...l, norm: normalize(l.text) }));
  for (let i = 0; i + 1 < lines.length; i++) {
    const t = `${lines[i].text} ${lines[i + 1].text}`;
    out.push({ text: t, offset: lines[i].offset, end: lines[i + 1].end, norm: normalize(t), joined: true });
  }
  return out;
}

const clip = (s, n = 280) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

// מאתר דרישה אחת. ctx = prepare(rawText) — כדי לא לפרק את המסמך מחדש לכל דרישה.
export function locate(reqText, ctx) {
  const target = normalize(reqText);
  if (!target || !ctx.windows.length) return { match: 'unresolved', page: null, quote: null };

  // 1) נוסח מלא — מעדיפים שורה בודדת על חלון מחובר
  const exact = ctx.windows.find((w) => !w.joined && w.norm.includes(target)) || ctx.windows.find((w) => w.norm.includes(target));
  if (exact) return { match: 'exact', page: pageAt(ctx.ends, exact.offset), quote: clip(exact.text), start: exact.offset, end: exact.end };

  // 1ב) דרישה ארוכה שמאחדת סעיף ותתי-סעיפים ("2.3.1 ... (1) ... (2) ...") אינה רצף אחד במסמך —
  //     מאתרים את פתיחת הסעיף (10 המילים הראשונות) כלשונה. זה עדיין מקור מדויק לתחילת הדרישה.
  const head = target.split(' ').slice(0, 10).join(' ');
  if (head.length >= 25 && head !== target) {
    const h = ctx.windows.find((w) => !w.joined && w.norm.includes(head)) || ctx.windows.find((w) => w.norm.includes(head));
    if (h) return { match: 'exact', page: pageAt(ctx.ends, h.offset), quote: clip(h.text), start: h.offset, end: h.end };
  }

  // 2) רוב המילים בשורה אחת
  const req = [...new Set(words(reqText))];
  if (req.length >= 2) {
    let best = null;
    for (const w of ctx.windows) {
      const have = new Set(w.norm.split(' '));
      const score = req.filter((x) => have.has(x)).length / req.length;
      if (score >= APPROX_MIN && (!best || score > best.score || (score === best.score && !w.joined && best.w.joined))) best = { w, score };
    }
    if (best) return { match: 'approx', page: pageAt(ctx.ends, best.w.offset), quote: clip(best.w.text), score: +best.score.toFixed(2), start: best.w.offset, end: best.w.end };
  }
  return { match: 'unresolved', page: null, quote: null };
}

export function prepare(rawText) {
  return { ends: pageEnds(rawText), windows: windows(rawText) };
}

// מאתר מקור לרשימת דרישות. מחזיר Map id→source, ושיעור הכיסוי.
export function locateAll(requirements = [], rawText = '') {
  const ctx = prepare(rawText);
  const byId = new Map();
  let located = 0;
  for (const r of requirements) {
    const s = locate(r.text, ctx);
    if (s.match !== 'unresolved') located++;
    byId.set(r.id, s);
  }
  return { byId, located, total: requirements.length, hasPages: ctx.ends.length > 0 };
}
