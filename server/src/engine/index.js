// index.js — ה-factory של המנוע.
// בוחר מימוש לפי ENGINE. החזית וה-routes מדברים רק עם הממשק הזה — כך שהמעבר
// ל-Claude הוא החלפת implementation אחד, בלי שינוי חזית/routes ("Claude-ready").
//
// חוזה המנוע (9 פונקציות — parity מלא בין stub ל-claude):
//   parseDocument(file)                → { kind, rawText }
//   classifyDocument(rawText, meta)    → 'projects'|'certifications'|'financial'|'staff'|'clients'
//   extractKnowledge(rawText, meta)    → { projects[], certifications[] }
//   parseTender(rawText)               → { code, name, issuer, deadline, guarantee, classification,
//                                          min_turnover, duration, requirements[] }
//   checkThresholds(rawText, company)  → { checks[] }   (label, required, have, status)
//   checkRedFlags(rawText)             → { flags[] }    (label, detail, severity)
//   analyzeMatch(requirements, kb)     → { matchScore, met[], gaps[], fails[] }
//   buildMapping(requirements, kb)     → [{ requirement, project, dimensions[], hasSource, relevance, bridge }]
//   generateDraft(mapping)             → { sections[] } (title, body, confidence, sourceProject, needsManual)
//
// הערות:
//   - כל פונקציה עשויה להיות א-סינכרונית (claude). ה-routes תמיד עושות await.
//   - relevance: 'direct' | 'adjacent' | null. 'adjacent' = "גשר גמישות מכרזית" —
//     ניסיון סמוך שממוסגר-מחדש כדי לענות על דרישה שאינה ההתמחות הישירה.
//   - bridge: משפט המסביר את ההתאמה הסמוכה, מעוגן אך ורק בממדים הממופים.
//   - אפס-הזיות נאכף דטרמיניסטית ב-guardrail.js אחרי generateDraft (בכל מנוע).

import { config } from '../config.js';
import * as stub from './stub/index.js';
import * as claude from './claude/index.js';

const impls = { stub, claude };

export function engine() {
  const impl = impls[config.engine];
  if (!impl) throw new Error(`ENGINE לא מוכר: "${config.engine}". ערכים חוקיים: stub | claude`);
  return impl;
}

export function engineName() {
  return config.engine;
}
