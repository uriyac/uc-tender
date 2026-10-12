// dashboard.js — אגרגציות ללוח הבקרה הניהולי. הכל מחושב מהנתונים; אפס דמו.

import { AsyncRouter } from '../lib/http.js';
import { withLiveDays } from '../lib/dates.js';

const r = AsyncRouter();
const STAGES = ['התאמה', 'טיוטה', 'אישור', 'הגשה'];
const stageBucket = (s) => (s === 'הוגש' ? 'הגשה' : s);

r.get('/', (req, res) => {
  const all = req.store.all('tenders').map((t) => withLiveDays(t)); // ימים חיים, לא ערך קפוא מההעלאה
  const live = all.filter((t) => t.stage !== 'נסגר');
  const outcomes = req.store.all('outcomes');

  const win = outcomes.filter((o) => o.result === 'win').length;
  const lose = outcomes.filter((o) => o.result === 'lose').length;
  const pending = outcomes.filter((o) => o.result === 'pending').length;
  const decided = win + lose;
  const winRate = decided ? Math.round((win / decided) * 100) : null;

  const pendingApproval = live.filter((t) => t.stage === 'אישור').length;
  const urgent = live.filter((t) => t.days != null && t.days <= 7).length;

  const pipeline = {};
  for (const s of STAGES) pipeline[s] = 0;
  for (const t of live) { const b = stageBucket(t.stage); if (b in pipeline) pipeline[b]++; }

  // התראות: דחופים (≤7) או ממתינים לאישור, ממוין לפי דחיפות
  const attention = live
    .filter((t) => (t.days != null && t.days <= 7) || t.stage === 'אישור')
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999))
    .slice(0, 6)
    .map((t) => {
      const urgentDeadline = t.days != null && t.days <= 7;
      return {
        id: t.id, code: t.code, name: t.name, issuer: t.issuer, days: t.days,
        reason: urgentDeadline ? `הגשה בעוד ${t.days} ימים`
          : (t.stage === 'אישור' ? 'ממתין לאישור' : t.stage),
        severity: t.days != null && t.days <= 3 ? 'danger' : 'warning',
      };
    });

  // מכרזים פעילים, ממוין לפי דחיפות
  const tenders = live
    .slice()
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999))
    .map((t) => ({ id: t.id, code: t.code, name: t.name, issuer: t.issuer, days: t.days, match_score: t.match_score, stage: t.stage,
      progress: t.progress || 0, red_flags: t.red_flags || 0, red_flags_high: t.red_flags_high || 0 }));

  res.json({
    kpis: { active: live.length, winRate, pendingApproval, urgent },
    attention,
    pipeline,
    winLoss: { win, lose, pending, rate: winRate },
    tenders,
    updatedAt: new Date().toISOString(),
  });
});

export default r;
