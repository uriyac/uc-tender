// index.js — שרת Express דק. מגיש את הפרוטוטייפ + חושף את ה-API.

import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';

import { engineName } from './engine/index.js';
import knowledge from './routes/knowledge.js';
import documents from './routes/documents.js';
import tenders from './routes/tenders.js';
import drafts from './routes/drafts.js';
import dashboard from './routes/dashboard.js';

// טעינת .env בסיסית (בלי תלות חיצונית)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const app = express();
app.use(express.json({ limit: '2mb' }));

// --- API ---
app.get('/api/health', (req, res) => res.json({ ok: true, engine: engineName() }));
app.use('/api/knowledge', knowledge);
app.use('/api/documents', documents);
app.use('/api/tenders', tenders);
app.use('/api/drafts', drafts);
app.use('/api/dashboard', dashboard);

// --- הגשת הפרוטוטייפ הסטטי ---
const proto = join(__dirname, '..', '..', 'prototype');
app.use(express.static(proto));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  UC TENDER — השרת עלה`);
  console.log(`  ▸ מנוע: ENGINE=${engineName()}`);
  console.log(`  ▸ פתח בדפדפן: http://localhost:${PORT}\n`);
});
