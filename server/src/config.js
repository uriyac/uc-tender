// config.js — קונפיג מרוכז ומקור-אמת יחיד להגדרות.
//
// אחריות:
//   1. טוען את .env *פעם אחת*, בשורש גרף ה-import — כך שכל מודול שקורא env בזמן
//      טעינה (למשל store.js שמזריע לפי SEED) רואה ערכים טעונים. חייבים לייבא את
//      הקובץ הזה לפני כל שימוש ב-process.env.
//   2. חושף אובייקט config מנורמל + engineStatus() — "מצב מוכנות" המנוע הנוכחי.
//      זו "נקודת ההפעלה" של Claude: כשיוזן מפתח, engineStatus().ready יהפוך true
//      בלי שינוי קוד.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';

// --- טעינת .env (בלי תלות חיצונית) ---
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const truthy = (v, dflt = false) => {
  const s = String(v ?? '').trim();
  if (!s) return dflt;
  return /^(1|true|yes|on)$/i.test(s);
};

export const config = {
  engine: (process.env.ENGINE || 'stub').toLowerCase(),
  port: Number(process.env.PORT) || 3000,
  claudeModel: process.env.CLAUDE_MODEL || 'claude-opus-5-5',
  hasClaudeKey: !!(process.env.ANTHROPIC_API_KEY || '').trim(),
  seedMode: (process.env.SEED || '').toLowerCase(),
  logRequests: truthy(process.env.LOG_REQUESTS, true),
  // תיקיית-נתונים לכתיבה (SQLite, גיבויים, uploads). באפליקציית דסקטופ ארוזה — userData.
  // ריק => ברירת המחדל ההיסטורית (server/src/data), לצורכי פיתוח.
  dataDir: (process.env.UCT_DATA_DIR || '').trim() || null,
};

// מצב-מוכנות המנוע הנבחר: האם הוא יכול לרוץ בפועל, ואם לא — למה.
// stub: תמיד מוכן. claude: מוכן רק כשיש מפתח.
export function engineStatus() {
  if (config.engine === 'claude') {
    return {
      name: 'claude',
      ready: config.hasClaudeKey,
      reason: config.hasClaudeKey ? null : 'חסר ANTHROPIC_API_KEY — הזן מפתח ב-.env או קבע ENGINE=stub',
      model: config.claudeModel,
    };
  }
  if (config.engine !== 'stub') {
    return { name: config.engine, ready: false, reason: `ENGINE לא מוכר: "${config.engine}"`, model: null };
  }
  return { name: 'stub', ready: true, reason: null, model: null };
}
