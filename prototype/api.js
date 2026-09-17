// api.js — שכבת קריאות דקה ל-backend.
// אם השרת לא זמין (פתיחת הקובץ ישירות), נופלים חזרה לנתונים המוטבעים כדי שהדמו לא יישבר.

const API = {
  base: '',

  async _get(path, fallback) {
    try {
      const res = await fetch(this.base + path, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(res.status);
      return await res.json();
    } catch (e) {
      console.warn(`[api] ${path} נכשל — משתמש ב-fallback מקומי`, e?.message || e);
      return typeof fallback === 'function' ? fallback() : fallback;
    }
  },

  async _send(method, path, body) {
    const res = await fetch(this.base + path, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
    return res.json();
  },

  health() { return this._get('/api/health', { ok: false, engine: 'offline' }); },

  // --- אימות ---
  async authMe() {
    try { const r = await fetch(this.base + '/api/auth/me', { headers: { Accept: 'application/json' } }); return r.ok ? (await r.json()).user : null; }
    catch { return null; }
  },
  login(email, password) { return this._send('POST', '/api/auth/login', { email, password }); },
  register(payload) { return this._send('POST', '/api/auth/register', payload); },
  logout() { return this._send('POST', '/api/auth/logout'); },
  dashboard(fallback) { return this._get('/api/dashboard', fallback); },
  tenders(fallback) { return this._get('/api/tenders', fallback); },
  tender(id, fallback) { return this._get('/api/tenders/' + id, fallback); },
  knowledge(fallback) { return this._get('/api/knowledge', fallback); },
  drafts(fallback) { return this._get('/api/drafts', fallback); },

  // העלאת מסמכים (FormData). category אופציונלי (מהסל); אחרת סיווג אוטומטי. מחזיר { results, counts, readiness }
  async uploadDocuments(fileList, category) {
    const fd = new FormData();
    for (const f of fileList) fd.append('files', f);
    if (category) fd.append('category', category);
    const res = await fetch(this.base + '/api/documents', { method: 'POST', body: fd });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
    return res.json();
  },
  readiness(fallback) { return this._get('/api/documents/readiness', fallback); },
  setDocCategory(id, category) { return this._send('PUT', '/api/documents/' + id + '/category', { category }); },

  company(fallback) { return this._get('/api/knowledge/company', fallback); },
  updateCompany(c) { return this._send('PUT', '/api/knowledge/company', c); },

  addProject(p) { return this._send('POST', '/api/knowledge/projects', p); },
  updateProject(id, p) { return this._send('PUT', '/api/knowledge/projects/' + id, p); },
  deleteProject(id) { return this._send('DELETE', '/api/knowledge/projects/' + id); },
  addCert(c) { return this._send('POST', '/api/knowledge/certifications', c); },
  updateCert(id, c) { return this._send('PUT', '/api/knowledge/certifications/' + id, c); },
  deleteCert(id) { return this._send('DELETE', '/api/knowledge/certifications/' + id); },
  documentsList(fallback) { return this._get('/api/documents/list', fallback); },

  // הזנת מכרז: טקסט מודבק או קובץ. מחזיר { tender, analysis }
  async submitTender({ text, file }) {
    let opts;
    if (file) {
      const fd = new FormData();
      fd.append('file', file);
      if (text) fd.append('text', text);
      opts = { method: 'POST', body: fd };
    } else {
      opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) };
    }
    const res = await fetch(this.base + '/api/tenders', opts);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
    return res.json();
  },

  // ניקוי כל המכרזים של החשבון (משאיר את מאגר הידע ופרטי החברה). מחזיר { ok, removed }
  clearTenders() { return this._send('DELETE', '/api/tenders'); },

  tenderAnalysis(id, fallback) { return this._get('/api/tenders/' + id + '/analysis', fallback); },
  tenderTailoring(id, fallback) { return this._get('/api/tenders/' + id + '/tailoring', fallback); },
  tenderMapping(id, fallback) { return this._get('/api/tenders/' + id + '/mapping', fallback); },

  // השלמה ידנית של פער
  resolveGap(tenderId, reqId, manualText) {
    return this._send('POST', `/api/tenders/${tenderId}/requirements/${reqId}/resolve`, { manualText });
  },
  clearGap(tenderId, reqId) {
    return this._send('DELETE', `/api/tenders/${tenderId}/requirements/${reqId}/resolve`);
  },
  // העלאת חומר להשלמת פער — נכנס למאגר הידע ומאפשר מיפוי מחדש
  uploadGapMaterial(fileList) { return this.uploadDocuments(fileList); },

  reasonCodes(fallback) { return this._get('/api/tenders/reason-codes', fallback); },

  // לולאת למידה (S4): תוצאה מקודדת + הגשה בפועל
  async submitOutcome(tenderId, { result, reason, reason_code, files }) {
    const fd = new FormData();
    fd.append('result', result);
    if (reason) fd.append('reason', reason);
    if (reason_code) fd.append('reason_code', reason_code);
    for (const f of (files || [])) fd.append('files', f);
    const res = await fetch(this.base + `/api/tenders/${tenderId}/outcome`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
    return res.json();
  },

  // חבילת הגשה (S3): ניתוח טופס רשמי + הפקת החבילה
  async analyzeForm(tenderId, file) {
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch(this.base + `/api/tenders/${tenderId}/form/analyze`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
    return res.json();
  },
  // מפיק את החבילה ומוריד אותה. מחזיר את סיכום הצ׳קליסט (מה-header).
  async buildPacket(tenderId, file) {
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch(this.base + `/api/tenders/${tenderId}/packet`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
    const meta = res.headers.get('X-Packet-Meta');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `packet-${tenderId}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    try { return meta ? JSON.parse(decodeURIComponent(escape(atob(meta)))) : null; } catch { return null; }
  },

  // טיוטה
  generateDraft(tenderId) { return this._send('POST', '/api/drafts/generate/' + tenderId); },
  draft(id, fallback) { return this._get('/api/drafts/' + id, fallback); },
  draftExportUrl(id, fmt) { return `${this.base}/api/drafts/${id}/export.${fmt}`; },
};

window.API = API;
