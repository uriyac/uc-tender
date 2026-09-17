// wasmdb.js — עוטף node-sqlite3-wasm בממשק תואם-better-sqlite3, כדי ש-store.js לא ישתנה.
//
// למה WASM: SQLite טהור (בלי מודול native) → בלי Python/VS build-tools ובלי electron-rebuild.
// עובד זהה ב-Node וב-Electron הארוז — הבחירה הנכונה למוצר דסקטופ מופץ.
//
// הבדלי-API שמגושרים כאן:
//   - node-sqlite3-wasm מקבל פרמטרים כ**מערך** (run([a,b])); כאן מקבלים גם spread (run(a,b)).
//   - חובה להעביר מערך (גם ריק) — קריאה בלי פרמטרים מפילה את ה-WASM. ה-adapter תמיד מעביר מערך.
//   - אין db.pragma() → ממופה ל-exec('PRAGMA ...').

import pkg from 'node-sqlite3-wasm'; // CJS → ESM: named export לא נחשף, לוקחים מה-default
const { Database: WasmDB } = pkg;

const asArray = (a) => (a.length === 1 && Array.isArray(a[0]) ? a[0] : a); // spread או מערך → מערך

export default class Database {
  constructor(path, opts = {}) {
    this._db = new WasmDB(path, opts);
  }
  exec(sql) { this._db.exec(sql); return this; }
  pragma(s) { this._db.exec('PRAGMA ' + s); return this; }
  prepare(sql) {
    const db = this._db;
    return {
      run: (...a) => db.run(sql, asArray(a)),
      get: (...a) => db.get(sql, asArray(a)),
      all: (...a) => db.all(sql, asArray(a)),
    };
  }
  close() { this._db.close(); }
}
