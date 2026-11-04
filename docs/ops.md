# UC TENDER — תפעול (Ops) לפיילוט

מסמך קצר: איך מריצים, איפה הנתונים, ואיך מגבים ומשחזרים.

## 1. הרצה

דרישות: Node 22 (ראה `.nvmrc`; Electron 35 מגיע עם Node 22), npm.

### שרת פיתוח (דפדפן)
```bash
cd server
npm ci --ignore-scripts      # better-sqlite3 לא בשימוש; ה-DB הוא node-sqlite3-wasm
cp .env.example .env         # אופציונלי. ברירת מחדל: ENGINE=stub (חינם, בלי מפתח)
npm start                    # http://localhost:3000  (PORT ב-.env)
```

### בדיקות (stub בלבד, בלי רשת — כמו ב-CI)
```bash
cd server
ENGINE=stub UCT_DATA_DIR=/tmp/uct-test \
NODE_OPTIONS="--import=$PWD/scripts/ci/no-network-guard.mjs" npm test
node scripts/ci/assert-stub-env.mjs   # נכשל אם יש server/.env או מפתח AI בסביבה
```
- `UCT_DATA_DIR` חשוב: בלעדיו הבדיקות כותבות ל-`server/src/data/app.sqlite` של הפיתוח.
- **אל תריצו בדיקות כשיש `server/.env` עם `ENGINE=claude`/מפתח** — `config.js` טוען את `.env`
  ומשלים כל משתנה שחסר *או ריק*. השומר יחסום ויכשיל, אבל עדיף לא להגיע לשם.

### Lint (report-only)
```bash
npm ci && npm run lint       # משורש הריפו
```

### אפליקציית דסקטופ (Electron)
```bash
cd server && npm install && cd ../desktop && npm install
npm start                    # שרת פנימי על http://localhost:3517 + חלון
npm run dist                 # installer ל-desktop/dist (nsis / dmg / AppImage) — ידני, לא ב-CI
```
ב-Windows: `launch.cmd` בשורש מריץ `npm start` בתיקיית `desktop`.

## 2. איפה ה-DB והקבצים

הלוגיקה (`server/src/config.js`, `server/src/data/store.js`):
`DATA_DIR = UCT_DATA_DIR || server/src/data`. ה-DB הוא `DATA_DIR/app.sqlite`.

| מצב | `DATA_DIR` |
|---|---|
| שרת פיתוח (`npm start` ב-server) | `server/src/data/` |
| Electron (גם `npm start` ב-desktop וגם מותקן) | `app.getPath('userData')` |

`userData` לפי מערכת הפעלה (שם האפליקציה = `productName` = `UC TENDER`):
- Windows: `%APPDATA%\UC TENDER\` (בד"כ `C:\Users\<user>\AppData\Roaming\UC TENDER\`)
- macOS: `~/Library/Application Support/UC TENDER/`
- Linux: `~/.config/UC TENDER/` (או `$XDG_CONFIG_HOME/UC TENDER/`)

בתוך `DATA_DIR`:
- `app.sqlite` — כל הנתונים (משתמשים, sessions, טבלת `records` עם JSON לפי `account_id`)
- `backups/app-<ISO-timestamp>.sqlite` — גיבויים אוטומטיים
- `uploads/` (בדסקטופ) — מסמכי החברה, ו-`uploads/tenders/` — קובצי המכרז המקוריים.
  בפיתוח: `server/uploads/`.

> אומת מהקוד, לא מהרצת installer. לפני הפיילוט: לפתוח את האפליקציה פעם אחת ולוודא שהקובץ נוצר בנתיב הנ"ל.

## 3. גיבוי

**מה קיים היום:** בכל עליית שרת (`backup()` ב-`index.js`) נוצר עותק של `app.sqlite`
ל-`backups/`, ונשמרים 5 האחרונים. אין גיבוי תקופתי בזמן ריצה, ואין עותק מחוץ למחשב.
הגיבויים יושבים באותו דיסק כמו ה-DB — לא מגנים מאובדן/הצפנת דיסק.

**נוהל מומלץ לפיילוט:**
1. **גיבוי יומי, כשהאפליקציה סגורה** (הכי בטוח — SQLite במצב rollback-journal, תהליך יחיד):
   להעתיק את **כל** תיקיית `DATA_DIR` (כולל `uploads/`) ליעד חיצוני (כונן רשת / OneDrive של הלקוח), בשם מתוארך.
   - Windows (PowerShell):
     ```powershell
     $src="$env:APPDATA\UC TENDER"; $dst="D:\uct-backup\$(Get-Date -f yyyy-MM-dd)"
     robocopy "$src" "$dst" /E /XD backups
     ```
   - macOS/Linux: `rsync -a --exclude backups "$HOME/.config/UC TENDER/" "/backup/uct/$(date +%F)/"`
2. **אם חייבים לגבות כשהאפליקציה פתוחה** — לא להעתיק את הקובץ ישירות; להשתמש ב-SQLite:
   `sqlite3 "<DATA_DIR>/app.sqlite" ".backup '<dest>/app-$(date +%F).sqlite'"`
   (או `VACUUM INTO '<dest>'`). זה עותק עקבי גם תוך כדי כתיבה.
3. **שמירה:** 14 גיבויים יומיים + 8 שבועיים; לפחות עותק אחד מחוץ למחשב.
4. **בדיקה:** פעם בשבוע — `sqlite3 <backup> "PRAGMA integrity_check;"` צריך להחזיר `ok`.

## 4. שחזור
1. לסגור את האפליקציה (לוודא שאין תהליך `UC TENDER` / node על פורט 3517).
2. לשנות שם ל-`app.sqlite` הנוכחי (`app.sqlite.broken-<date>`) — לא למחוק.
3. להעתיק את הגיבוי הרצוי ל-`DATA_DIR/app.sqlite` (מ-`backups/` או מהגיבוי החיצוני),
   ואם צריך — גם את `uploads/` מאותו תאריך (קבצים שה-DB מפנה אליהם).
4. להפעיל את האפליקציה ולהתחבר. שימו לב: בעלייה נוצר גיבוי אוטומטי חדש, והישן ביותר מתוך 5 נמחק —
   לכן קודם להעתיק את `backups/` הצידה אם הוא חשוב.

## 5. לוגים
- השרת כותב ל-stdout/stderr בלבד (`[api] ...`, `[error] ...`, `[backup] ...`). אין קובץ לוג.
- בדסקטופ `LOG_REQUESTS=off`, ו-stdout של Electron לא נשמר — כדי לאסוף לוג בפיילוט, להריץ מטרמינל
  (`npm start` ב-desktop, או את ה-exe מ-cmd עם הפניה לקובץ).
- קריאות Claude (`ENGINE=claude`) לא נרשמות עם עלות/טוקנים ב-main.
