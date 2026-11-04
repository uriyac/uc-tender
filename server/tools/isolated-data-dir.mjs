// isolated-data-dir.mjs — preload ל-`npm test` (node --import): מבודד את הבדיקות מנתוני הפיתוח.
//
// בלי זה, store.js פותח את server/src/data/app.sqlite האמיתי והבדיקות כותבות אליו
// (ולעיתים גם ל-uploads/ ול-backups/). כאן מכוונים את UCT_DATA_DIR (שכבר משמש את
// אפליקציית הדסקטופ) לתיקייה זמנית חדשה בכל ריצה, ומוחקים אותה בסוף.
//
// node --test מריץ כל קובץ בדיקה בתת-תהליך נפרד שטוען את ה-preload הזה:
//   - תהליך בלי סימון יוצר תיקייה זמנית משלו, מסמן אותה ב-UCT_TEST_TMP_DIR ומוחק אותה ביציאה.
//     (ב-Node 24 כך קורה בפועל: כל קובץ-בדיקה מקבל DB נקי ומבודד משלו.)
//   - תהליך שכבר רואה סימון (אם גרסת Node מעבירה את ה-env מה-runner) משתמש באותה תיקייה
//     ולא יוצר/מוחק — הניקוי נעשה ע"י מי שיצר.
// עובד זהה ב-Windows/macOS/Linux — בלי תחביר env של shell ב-package.json.
//
// הקובץ ב-tools/ ולא ב-test/ בכוונה: node --test מריץ כל קובץ תחת test/ כקובץ-בדיקה.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

if (process.env.UCT_TEST_TMP_DIR) {
  process.env.UCT_DATA_DIR = process.env.UCT_TEST_TMP_DIR; // תת-תהליך: התיקייה של הריצה הנוכחית
} else {
  // דורסים בכוונה גם UCT_DATA_DIR קיים — בדיקות לעולם לא כותבות לנתונים אמיתיים (גם לא userData).
  const dir = mkdtempSync(join(tmpdir(), 'uct-test-'));
  process.env.UCT_TEST_TMP_DIR = dir;
  process.env.UCT_DATA_DIR = dir;
  process.on('exit', () => {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
  });
}
