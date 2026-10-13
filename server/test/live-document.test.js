// live-document.test.js — "המסמך החי": כל דרישה מסומנת בטקסט המכרז במקומה המדויק, עם מצבה.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLiveDocument, pagesOf } from '../src/document/index.js';

const RAW = [
  'מכרז\tלשירותי ייעוץ',
  '2.1.1 המציע הינו\tעוסק מורשה.',
  '',
  '-- 1 of 2 --',
  '',
  '2.2.1 למציע ותק של 5 שנים לפחות.',
  'מועד הגשה 20.03.2026',
  '',
  '-- 2 of 2 --',
  '',
].join('\n');

const reqs = [
  { id: 'a', text: '2.1.1 המציע הינו עוסק מורשה.', status: 'met_verified', mandatory: true },
  { id: 'b', text: '2.2.1 למציע ותק של 5 שנים לפחות.', status: 'unknown_company', mandatory: true },
  { id: 'c', text: 'דרישה שלא קיימת במכרז בכלל', status: 'unknown_company', mandatory: true },
];

test('כל דרישה שנמצאה מסומנת בטווח המדויק שלה בטקסט, עם העמוד והמצב', () => {
  const d = buildLiveDocument({ rawText: RAW, requirements: reqs });
  const a = d.marks.find((m) => m.id === 'a');
  assert.equal(d.text.slice(a.start, a.end), '2.1.1 המציע הינו עוסק מורשה.');
  assert.equal(a.page, 1);
  assert.equal(a.status, 'met_verified');
  const b = d.marks.find((m) => m.id === 'b');
  assert.equal(b.page, 2);
  assert.equal(d.text.slice(b.start, b.end), '2.2.1 למציע ותק של 5 שנים לפחות.');
});

test('דרישה שלא אותרה — לא מסומנת, ומוחזרת בגלוי ב-unlocated', () => {
  const d = buildLiveDocument({ rawText: RAW, requirements: reqs });
  assert.ok(!d.marks.some((m) => m.id === 'c'));
  assert.deepEqual(d.unlocated.map((u) => u.id), ['c']);
});

test('פרטי תקציר מסומנים; דרישה גוברת על פרט באותו מקום; בלי חפיפות', () => {
  const facts = [{ label: 'מועד הגשה', value: '20.03.2026', found: true }, { label: 'מקביל', value: 'המציע הינו עוסק מורשה', found: true }];
  const d = buildLiveDocument({ rawText: RAW, requirements: reqs, facts });
  assert.ok(d.marks.some((m) => m.kind === 'fact' && m.label === 'מועד הגשה'));
  assert.ok(!d.marks.some((m) => m.kind === 'fact' && m.label === 'מקביל'), 'פרט חופף דרס דרישה');
  for (let i = 1; i < d.marks.length; i++) assert.ok(d.marks[i].start >= d.marks[i - 1].end, 'סימונים חופפים');
});

test('עמודים לפי סימוני pdf-parse; טקסט בלי סימונים = עמוד אחד', () => {
  const d = buildLiveDocument({ rawText: RAW });
  assert.deepEqual(d.pages.map((p) => p.n), [1, 2]);
  assert.equal(pagesOf('טקסט פשוט').length, 1);
});
