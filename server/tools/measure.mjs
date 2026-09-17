// measure.mjs — סט-מדידה לאיכות הניתוח (S1.5). הרצה: `node tools/measure.mjs`
//
// טוען מכרזי-בדיקה מ-tools/fixtures/*.tender.txt + *.expected.json, מריץ את המנוע
// הפעיל (ENGINE) ומשווה מול ה"תשובה הנכונה". מדפיס scorecard לכל מכרז וסיכום כולל.
// זהו הכלי להרצת before/after לפני ואחרי כל שינוי במנוע — וגם ל-drop-in של Claude
// (הרץ עם ENGINE=claude כשיש מפתח, והשווה לאותם fixtures).
//
// הוספת מכרז אמיתי: שים tools/fixtures/<שם>.tender.txt וקובץ <שם>.expected.json:
//   { "requirements_min": 5, "categories": ["ניסיון","פיננסי"], "mandatory_min": 2,
//     "red_flags": ["מפגש/סיור חובה"], "thresholds": ["סיווג קבלני"] }
// כל שדה אופציונלי — נבדק רק מה שסופק.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { engine, engineName } from '../src/engine/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIX = join(__dirname, 'fixtures');

const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

function loadCases() {
  if (!existsSync(FIX)) return [];
  return readdirSync(FIX)
    .filter((f) => f.endsWith('.tender.txt'))
    .map((f) => {
      const base = f.replace(/\.tender\.txt$/, '');
      const expPath = join(FIX, `${base}.expected.json`);
      return {
        name: base,
        text: readFileSync(join(FIX, f), 'utf8'),
        expected: existsSync(expPath) ? JSON.parse(readFileSync(expPath, 'utf8')) : {},
      };
    });
}

// בדיקה בודדת → { label, ok, detail }
function check(label, ok, detail) { return { label, ok, detail }; }

async function runCase(c) {
  const eng = engine();
  const parsed = await eng.parseTender(c.text);
  const redFlags = await eng.checkRedFlags(c.text);
  const thresholds = await eng.checkThresholds(c.text, {}); // בלי פרופיל — בודקים זיהוי, לא התאמה
  const e = c.expected;
  const reqs = parsed.requirements || [];
  const cats = [...new Set(reqs.map((r) => r.category))];
  const mandatoryN = reqs.filter((r) => r.mandatory).length;
  const flagLabels = (redFlags.flags || []).map((f) => f.label);
  const thLabels = (thresholds.checks || []).map((c) => c.label);

  const results = [];
  if (e.requirements_min != null)
    results.push(check(`דרישות ≥ ${e.requirements_min}`, reqs.length >= e.requirements_min, `זוהו ${reqs.length}`));
  if (e.categories)
    for (const cat of e.categories)
      results.push(check(`קטגוריה "${cat}"`, cats.includes(cat), cats.join(', ') || '—'));
  if (e.mandatory_min != null)
    results.push(check(`תנאי-סף (חובה) ≥ ${e.mandatory_min}`, mandatoryN >= e.mandatory_min, `זוהו ${mandatoryN}`));
  if (e.red_flags)
    for (const rf of e.red_flags)
      results.push(check(`דגל "${rf}"`, flagLabels.some((l) => l.includes(rf)), flagLabels.join(', ') || '—'));
  if (e.thresholds)
    for (const th of e.thresholds)
      results.push(check(`תנאי-סף "${th}"`, thLabels.some((l) => l.includes(th)), thLabels.join(', ') || '—'));

  // אפס-הזיות: אין בדיקה חיובית פה, אבל נדווח כל דרישה ריקה/חשודה
  return { results, snapshot: { reqs: reqs.length, cats, mandatoryN, flagLabels, thLabels } };
}

const cases = loadCases();
if (!cases.length) {
  console.log(RED('אין fixtures ב-tools/fixtures/. הוסף <שם>.tender.txt (+.expected.json).'));
  process.exit(1);
}

console.log(`\n  סט-מדידה — מנוע: ${engineName()}\n  ${'─'.repeat(48)}`);
let total = 0, passed = 0;
for (const c of cases) {
  const { results, snapshot } = await runCase(c);
  console.log(`\n  ▸ ${c.name}  ${DIM(`(${snapshot.reqs} דרישות · ${snapshot.cats.length} קטגוריות · ${snapshot.flagLabels.length} דגלים)`)}`);
  for (const r of results) {
    total++; if (r.ok) passed++;
    console.log(`     ${r.ok ? GREEN('✓') : RED('✗')} ${r.label}  ${DIM(r.detail)}`);
  }
  if (!results.length) console.log(DIM('     (אין ציפיות מוגדרות — snapshot בלבד)'));
}
const pct = total ? Math.round((passed / total) * 100) : 0;
console.log(`\n  ${'─'.repeat(48)}\n  סה"כ: ${passed}/${total} (${pct >= 80 ? GREEN(pct + '%') : RED(pct + '%')})\n`);
process.exit(passed === total ? 0 : 1);
