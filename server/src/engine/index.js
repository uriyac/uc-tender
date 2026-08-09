// index.js — ה-factory של המנוע.
// בוחר מימוש לפי ENGINE. החזית וה-routes מדברים רק עם הממשק הזה.
//
// חוזה המנוע (5 פונקציות):
//   parseDocument(file)             → { kind, rawText }
//   extractKnowledge(rawText, kind) → { projects[], certifications[] }
//   parseTender(rawText)            → { code, name, issuer, deadline, requirements[] }
//   analyzeMatch(requirements, kb)  → { matchScore, met[], gaps[], fails[] }
//   buildMapping(requirements, kb)  → [{ requirement, project, dimensions[], hasSource, relevance, bridge }]
//   generateDraft(mapping)          → { sections[] }
//
// הערות:
//   - הפונקציות עשויות להיות א-סינכרוניות (claude). ה-routes תמיד עושות await.
//   - relevance: 'direct' | 'adjacent' | null. 'adjacent' = "גשר גמישות מכרזית" —
//     ניסיון סמוך שממוסגר-מחדש כדי לענות על דרישה שאינה ההתמחות הישירה.
//   - bridge: משפט המסביר את ההתאמה הסמוכה, מעוגן אך ורק בממדים הממופים.
//   - אפס-הזיות נאכף דטרמיניסטית ב-guardrail.js אחרי generateDraft (בכל מנוע).

import * as stub from './stub/index.js';
import * as claude from './claude/index.js';

const impls = { stub, claude };

export function engine() {
  const name = (process.env.ENGINE || 'stub').toLowerCase();
  const impl = impls[name];
  if (!impl) throw new Error(`ENGINE לא מוכר: "${name}". ערכים חוקיים: stub | claude`);
  return impl;
}

export function engineName() {
  return (process.env.ENGINE || 'stub').toLowerCase();
}
