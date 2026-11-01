// כל דרישה ש-parseTender החזיר חייבת להימצא בטקסט המכרז (exact / approx).
// unresolved = הדרישה לא במסמך — נכשל. זה תופס דרישה שהמנוע המציא.
// locateAll הוא קוד דטרמיניסטי (sourceSpan.js), לא שיפוט של מודל.

import { locateAll } from '../src/lib/sourceSpan.js';

export default function assertGrounded(output, context = {}) {
  let parsed;
  try {
    parsed = typeof output === 'string' ? JSON.parse(output) : output;
  } catch (e) {
    return { pass: false, score: 0, reason: `הפלט אינו JSON: ${e.message}` };
  }
  const reqs = (parsed?.requirements || []).map((r, i) => ({
    id: String(i),
    text: typeof r === 'string' ? r : (r?.text || ''),
  }));
  const source = context?.vars?.text || '';
  if (!reqs.length) {
    return { pass: false, score: 0, reason: 'לא חולצה אף דרישה' };
  }
  const { byId, located, total } = locateAll(reqs, source);
  const missing = reqs.filter((r) => byId.get(r.id)?.match === 'unresolved').map((r) => r.text);
  const pass = missing.length === 0;
  return {
    pass,
    score: total ? located / total : 0,
    reason: pass
      ? `כל ${located} הדרישות אותרו במסמך`
      : `דרישות שלא אותרו במקור (${missing.length}/${total}):\n` + missing.map((t) => `• ${t}`).join('\n'),
  };
}
