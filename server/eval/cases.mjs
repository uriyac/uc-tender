// מכרזי test-data (A/B/C) + הפיקסטורה הסינתטית. הטקסט מחולץ כאן כדי שהספק
// יקבל את אותו rawText שהמערכת מזינה ל-parseTender.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractText } from '../src/lib/extractText.js';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '../..');
const tenderDir = join(repo, 'test-data/אוריה בע״מ/06 - מכרזים לבדיקה');
const fixture = join(here, '../tools/fixtures/multi-domain.tender.txt');

const ASSERT = [{ type: 'javascript', value: 'file://assert-grounded.mjs' }];

export default async function cases() {
  const out = [];
  const files = readdirSync(tenderDir).filter((f) => /^מכרז-[ABC]-/.test(f)).sort();
  for (const name of files) {
    const buf = readFileSync(join(tenderDir, name));
    const ext = await extractText(buf, name);
    if (!ext.rawText) throw new Error(`לא חולץ טקסט מ-${name}: ${ext.error || ''}`);
    out.push({
      description: name,
      vars: { text: ext.rawText },
      assert: ASSERT,
    });
  }
  out.push({
    description: 'multi-domain fixture',
    vars: { text: readFileSync(fixture, 'utf8') },
    assert: ASSERT,
  });
  return out;
}
