// index.js — שרת Express דק. מגיש את הפרוטוטייפ + חושף את ה-API.

import { config, engineStatus } from './config.js'; // ראשון: טוען .env לפני כל שאר המודולים

import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { backup } from './data/store.js';
import { requireAuth, requireSuperadmin } from './auth/middleware.js';
import auth from './routes/auth.js';
import admin from './routes/admin.js';
import knowledge from './routes/knowledge.js';
import documents from './routes/documents.js';
import tenders from './routes/tenders.js';
import drafts from './routes/drafts.js';
import dashboard from './routes/dashboard.js';
import learning from './routes/learning.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: '2mb' }));

// --- לוג בקשות מובנה (זמן-תגובה + סטטוס) ---
if (config.logRequests) {
  app.use((req, res, next) => {
    const t0 = Date.now();
    res.on('finish', () => {
      if (req.path.startsWith('/api')) {
        console.log(`[api] ${req.method} ${req.path} → ${res.statusCode} (${Date.now() - t0}ms)`);
      }
    });
    next();
  });
}

// --- API ---
app.get('/api/health', (req, res) => res.json({ ok: true, engine: engineStatus() }));
app.use('/api/auth', auth);                       // ציבורי (התחברות)
app.use('/api/admin', requireSuperadmin, admin);  // לוח הספק בלבד
// כל השאר — מחייב התחברות + מסונן לחשבון (req.store)
app.use('/api/knowledge', requireAuth, knowledge);
app.use('/api/documents', requireAuth, documents);
app.use('/api/tenders', requireAuth, tenders);
app.use('/api/drafts', requireAuth, drafts);
app.use('/api/dashboard', requireAuth, dashboard);
app.use('/api/learning', requireAuth, learning);

// 404 ל-API (נתיב לא מוכר) — JSON, לא HTML. חייב לבוא אחרי כל ה-routers ולפני הסטטי.
app.use('/api', (req, res) => res.status(404).json({ error: 'נתיב לא נמצא', path: req.originalUrl }));

// --- הגשת הפרוטוטייפ הסטטי ---
const proto = join(__dirname, '..', '..', 'prototype');
app.use(express.static(proto));

// --- error handler מרכזי (אחרון) — כל throw/rejection ב-route מגיע לכאן דרך AsyncRouter ---
app.use((err, req, res, next) => {
  const status = err?.status || err?.statusCode || (err?.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  const msg = err?.code === 'LIMIT_FILE_SIZE' ? 'הקובץ גדול מדי' : (err?.message || 'שגיאת שרת פנימית');
  console.error(`[error] ${req.method} ${req.originalUrl} → ${status}: ${msg}`);
  if (res.headersSent) return next(err);
  res.status(status).json({ error: msg });
});

app.listen(config.port, () => {
  const bk = backup(); // גיבוי מקומי בעליית השרת (P3)
  const st = engineStatus();
  console.log(`\n  UC TENDER — השרת עלה`);
  if (bk) console.log(`  ▸ גיבוי נשמר`);
  console.log(`  ▸ מנוע: ENGINE=${st.name}${st.ready ? '' : `  (⚠ לא מוכן: ${st.reason})`}`);
  console.log(`  ▸ פתח בדפדפן: http://localhost:${config.port}\n`);
});
