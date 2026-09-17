// main.cjs — תהליך Electron הראשי. עוטף את השרת הקיים (Node/Express) + ה-UI כאפליקציית דסקטופ.
// on-prem: כל הנתונים ב-userData של המשתמש (SQLite מקומי), בלי ענן.
//
// DB: `server` משתמש ב-node-sqlite3-wasm (WASM טהור) — בלי native, בלי electron-rebuild.
// נבנה ורץ בכל מקום. אומת: החלון עולה, שרת פנימי 3517, DB ב-userData. (2026-09-03)

const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const http = require('node:http');

const PORT = Number(process.env.PORT) || 3517; // פורט גבוה ולא נפוץ למניעת התנגשות

function waitForServer(url, timeoutMs = 15000) {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      http.get(url, (res) => { res.resume(); resolve(true); })
        .on('error', () => {
          if (Date.now() - t0 > timeoutMs) reject(new Error('server did not start in time'));
          else setTimeout(tick, 300);
        });
    };
    tick();
  });
}

async function startServer() {
  // חייב לקבוע env לפני import של config/השרת (config נטען פעם אחת).
  process.env.UCT_DATA_DIR = app.getPath('userData'); // תיקיית-נתונים כתיבה, per-user
  process.env.PORT = String(PORT);
  process.env.SEED = process.env.SEED || 'empty';     // התקנה נקייה → הרשמת החשבון ב-first-run
  process.env.LOG_REQUESTS = 'off';
  // בפיתוח: ../server. ארוז: resources/server (extraResources). שני המקרים שומרים על
  // server/src/../../prototype → prototype באותה תיקיית-אב, כך שהגשת הסטטי עובדת בשניהם.
  const base = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..');
  const serverEntry = path.join(base, 'server', 'src', 'index.js');
  await import('file://' + serverEntry.replace(/\\/g, '/')); // ESM side-effect → מאזין
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1320, height: 880, minWidth: 1024, minHeight: 700,
    title: 'UC TENDER', backgroundColor: '#0F1E3D',
    webPreferences: { contextIsolation: true },
  });
  win.removeMenu?.();
  win.loadURL(`http://localhost:${PORT}`);
}

app.whenReady().then(async () => {
  try {
    await startServer();
    await waitForServer(`http://localhost:${PORT}/api/health`);
  } catch (e) {
    console.error('[desktop] הפעלת השרת נכשלה:', e.message);
  }
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
