// learning.js — אינטליגנציה מצטברת (המוט): זיכרון-מפרסם, התפלגות סיבות, כיול ניבוי.
// הכל מחושב מתוצאות אמיתיות (outcomes) — דטרמיניסטי, key-free. אפס דמו.

import { AsyncRouter } from '../lib/http.js';
import { issuerMemory, reasonDistribution, calibration } from '../learning/index.js';

const r = AsyncRouter();

r.get('/', (req, res) => {
  const tenders = req.store.all('tenders');
  const outcomes = req.store.all('outcomes');

  const win = outcomes.filter((o) => o.result === 'win').length;
  const lose = outcomes.filter((o) => o.result === 'lose').length;
  const pending = outcomes.filter((o) => o.result === 'pending').length;
  const decided = win + lose;

  const issuers = [...issuerMemory(tenders, outcomes).values()]
    .sort((a, b) => b.submissions - a.submissions);

  res.json({
    totals: { submissions: outcomes.length, win, lose, pending, winRate: decided ? Math.round((win / decided) * 100) : null },
    reasons: reasonDistribution(outcomes),
    issuers,
    calibration: calibration(outcomes),
  });
});

export default r;
