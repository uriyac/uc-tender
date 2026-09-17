// flex-measure.mjs — golden-set לשכבת הגמישות (F0). הרצה: node tools/flex-measure.mjs
//
// מודד את שכבת ה**בחירה** (buildMapping) מול "תשובה נכונה": direct / gap.
// המדד הקריטי: **"צריך-להישאר-פער"** — דרישה מחוץ-לתחום חייבת להישאר gap (hasSource=false),
// כלומר המערכת לא "תופרת" יש-מאין. זהו ה-failure-mode שמפיל את הלב אם נשבר.
//
// מקרי 'adjacent' מסומנים pending:F1 — שכבת התפירה (F1) תוסיף אותם key-free; עד אז מדווחים בלבד.
// כש-F1 ינחת: נרחיב כאן להרצת checkTailoring על הפלט (נאמנות) + must_emphasize/must_not_claim.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bestAssetFor, tailorOne } from '../src/flex/tailor.js';
import { checkTailoring } from '../src/engine/guardrail.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'flex', 'cases.json'), 'utf8'));
const G = (s) => `\x1b[32m${s}\x1b[0m`, R = (s) => `\x1b[31m${s}\x1b[0m`, D = (s) => `\x1b[2m${s}\x1b[0m`;

console.log(`\n  golden-set גמישות — מנוע התפירה (F1)\n  ${'─'.repeat(52)}`);
let pass = 0, total = 0, critical = 0, criticalPass = 0, faithful = 0;

for (const c of cases) {
  const best = bestAssetFor(c.requirement, c.knowledge.projects || []);
  const t = tailorOne(c.requirement, best ? best.asset : null);
  const actual = !t.hasSource ? 'gap' : t.relevance;
  const exp = c.expected.relevance;
  const isCritical = exp === 'gap';

  // נאמנות: כל תפירה עם מקור חייבת לעבור את ה-guardrail (0 בדיות) ולא להיות מנוטרלת.
  const faith = !t.hasSource || (checkTailoring(t, best.asset).ok && !t.neutralized);
  if (faith) faithful++;

  total++;
  const ok = (exp === 'gap' ? actual === 'gap' : actual === exp) && faith;
  if (ok) pass++;
  if (isCritical) { critical++; if (actual === 'gap') criticalPass++; }
  const extra = t.hasSource ? D(` · מתיחה=${t.stretch} · ראיה=${t.evidence_tier} · fit=${t.fit_score}`) : '';
  console.log(`  ${ok ? G('✓') : R('✗')} ${c.name}  ${D(`צפוי=${exp} · בפועל=${actual}`)}${extra}`);
}

console.log(`\n  ${'─'.repeat(52)}`);
console.log(`  תפירה: ${pass}/${total} · נאמנות (0 בדיות): ${faithful}/${total}`);
console.log(`  ${criticalPass === critical ? G('✓') : R('✗')} "צריך-להישאר-פער" (קריטי): ${criticalPass}/${critical} — אנטי-בדיה\n`);
process.exit(pass === total && criticalPass === critical && faithful === total ? 0 : 1);
