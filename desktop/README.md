# UC TENDER — אפליקציית דסקטופ (on-prem)

עוטף את השרת (Node/Express) + ה-UI כאפליקציית דסקטופ. הכל מקומי, בלי ענן:
SQLite ב-userData של המשתמש, גיבוי אוטומטי, OCR אופליין (בהמשך).

## דרישות
- Node ≥ 20 + npm
- **אין צורך בכלי-בנייה native** — ה-DB הוא `node-sqlite3-wasm` (WASM טהור). בלי Python/VS, בלי electron-rebuild.

## הרצה בפיתוח
```
cd server && npm install          # תלויות השרת (כולל better-sqlite3)
cd ../desktop && npm install      # electron + electron-builder
npm start                         # פותח את האפליקציה על השרת המקומי
```

## בניית installer
```
cd desktop && npm run dist        # → dist/ : .exe (Win) / .dmg (mac) / .AppImage (Linux)
```

### DB — בלי שלב native
ה-DB הוא `node-sqlite3-wasm` (WASM). **אין electron-rebuild ואין קומפילציה** — נבנה בכל מקום.

### Troubleshooting — התקנת electron
אם `npm start` נכשל ב-"Electron failed to install correctly" (dist מכיל רק `locales`):
extract-zip של electron נכשל בחילוץ. פתרון ידני (חד-פעמי):
```
# 1) חלץ את ה-zip מה-cache ידנית
unzip -oq "%LOCALAPPDATA%/electron/Cache/*/electron-v<ver>-win32-x64.zip" -d node_modules/electron/dist
# 2) כתוב path.txt בלי newline
printf 'electron.exe' > node_modules/electron/path.txt
```

## ארכיטקטורה
- `main.cjs` — תהליך Electron הראשי: קובע `UCT_DATA_DIR=userData`, מייבא את השרת (ESM side-effect),
  ממתין ל-`/api/health`, פותח BrowserWindow על `http://localhost:<port>`.
- השרת + ה-UI נארזים כ-`extraResources` (server/, prototype/); בפיתוח נטענים מ-`../`.
- **DB:** `better-sqlite3` (נבחר על-פני node:sqlite לתאימות Electron ודאית).

## החלטות שנסגרו
- מודל: on-prem, כל לקוח מריץ מקומית · משתמש יחיד (צוות בהמשך) · superadmin מרכזי — שלב הבא.
