// assert-stub-env.mjs — בדיקת-סביבה ל-CI: מכשיל את הריצה אם יש סיכוי לקריאת AI בתשלום.
// שימוש (מתוך server/):  node scripts/ci/assert-stub-env.mjs
//
// בודק:
//   1. אין קובץ server/.env (config.js טוען אותו — וממלא גם משתנים *ריקים*, כך ש-
//      ANTHROPIC_API_KEY='' ב-CI לא מגן מפני מפתח ב-.env).
//   2. ENGINE בסביבה הוא stub, ואין מפתח AI לא-ריק בסביבה.
//   3. אחרי טעינת config.js בפועל: config.engine==='stub' ו-hasClaudeKey===false.
//   4. אף קובץ בדיקה (test/, eval/) לא מגדיר ENGINE=claude או מפתח API.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const fail = [];

// 1
for (const f of ['.env', '.env.local', 'src/.env']) {
  if (existsSync(join(serverDir, f))) fail.push(`נמצא server/${f} — אסור ב-CI (config.js טוען אותו)`);
}

// 2
const env = (process.env.ENGINE || '').trim().toLowerCase();
if (env !== 'stub') fail.push(`ENGINE חייב להיות "stub" במפורש (כרגע: "${process.env.ENGINE ?? ''}")`);
for (const k of ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_API_KEY', 'FIRECRAWL_API_KEY']) {
  if ((process.env[k] || '').trim()) fail.push(`${k} מוגדר בסביבה (ערך לא מודפס) — אסור ב-CI`);
}

// 3
const { config, engineStatus } = await import('../../src/config.js');
if (config.engine !== 'stub') fail.push(`config.engine אחרי טעינה = "${config.engine}" (צפוי stub)`);
if (config.hasClaudeKey) fail.push('config.hasClaudeKey=true אחרי טעינה — מפתח הגיע מאיפשהו (.env?)');

// 4
const BAD = [
  /ENGINE\s*[:=]\s*['"`]?claude/i,
  /process\.env\.ENGINE\s*=(?!=)/,
  /process\.env\.ANTHROPIC_API_KEY\s*=(?!=)/,
  /process\.env\[['"]ENGINE['"]\]\s*=(?!=)/,
];
function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (n === 'node_modules') return [];
    return statSync(p).isDirectory() ? walk(p) : (/\.(c|m)?js$/.test(n) ? [p] : []);
  });
}
for (const file of [...walk(join(serverDir, 'test')), ...walk(join(serverDir, 'eval'))]) {
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, ''); // הערות מותרות (תיעוד "ENGINE=claude npm run eval")
    if (BAD.some((re) => re.test(code))) fail.push(`${relative(serverDir, file)}:${i + 1} מגדיר מנוע/מפתח בתשלום`);
  });
}

if (fail.length) {
  console.error('✖ assert-stub-env נכשל:\n' + fail.map((f) => '  - ' + f).join('\n'));
  process.exit(1);
}
console.log(`✔ סביבת CI בטוחה: engine=${engineStatus().name}, אין .env, אין מפתחות AI`);
