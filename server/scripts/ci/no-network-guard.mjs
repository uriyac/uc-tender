// no-network-guard.mjs — שומר-רשת ל-CI ולבדיקות: חוסם כל יציאה לרשת שאינה localhost.
//
// נטען לפני כל קוד אחר דרך:  NODE_OPTIONS="--import=./scripts/ci/no-network-guard.mjs"
// (NODE_OPTIONS עובר בירושה לתהליכי-הבן של `node --test` ול-OCR worker).
//
// למה: מנוע ENGINE=claude קורא ל-api.anthropic.com (בתשלום). config.js טוען את server/.env
// לכל משתנה שאינו מוגדר *או ריק* — כך ש-.env מקומי עלול להפעיל בשקט קריאה בתשלום.
// השומר מבטיח שגם אם זה קורה, הריצה נכשלת בקול ולא יוצא אף בייט.
//
// מה נחסם (שכבות):
//   1. globalThis.fetch  — ה-SDK של Anthropic ו-undici המובנה.
//   2. net/tls connect   — כל socket (http/https.request, undici, ספריות אחרות).
//   3. dns.lookup        — כל פתרון שם שאינו localhost.
// כל ניסיון חסום: נזרקת שגיאה, נרשמת שורה ב-stderr, process.exitCode=1 (גם אם הקוד תופס
// את השגיאה), ואם הוגדר UCT_NET_GUARD_LOG — נכתבת שורה לקובץ שה-CI בודק שהוא ריק.

import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import { appendFileSync } from 'node:fs';

const PAID_AI_HOSTS = [
  'api.anthropic.com', 'anthropic.com', 'api.openai.com', 'openai.azure.com',
  'generativelanguage.googleapis.com', 'aiplatform.googleapis.com', 'api.mistral.ai',
  'api.cohere.ai', 'api.cohere.com', 'openrouter.ai', 'api.groq.com', 'api.together.xyz',
  'api.firecrawl.dev', 'bedrock-runtime',
];
const LOCAL = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', '::', '']);

const isLocal = (host) => {
  const h = String(host ?? '').replace(/^\[|\]$/g, '').toLowerCase();
  return LOCAL.has(h) || h.startsWith('127.') || h.endsWith('.localhost');
};
const isPaid = (host) => {
  const h = String(host ?? '').toLowerCase();
  return PAID_AI_HOSTS.some((p) => h === p || h.endsWith('.' + p) || h.includes(p));
};

function block(kind, host, port) {
  const paid = isPaid(host);
  const msg = `[no-network-guard] BLOCKED ${kind} → ${host}${port ? ':' + port : ''}` +
    (paid ? '  ← PAID AI API! (ENGINE=claude / .env דלף?)' : '  (יציאה לרשת אסורה בבדיקות/CI)');
  process.stderr.write(msg + '\n');
  process.exitCode = 1;
  if (process.env.UCT_NET_GUARD_LOG) {
    try { appendFileSync(process.env.UCT_NET_GUARD_LOG, `${new Date().toISOString()} pid=${process.pid} ${msg}\n`); } catch {}
  }
  const err = new Error(msg);
  err.code = 'UCT_NETWORK_BLOCKED';
  return err;
}

// --- 1. fetch ---
const realFetch = globalThis.fetch;
if (typeof realFetch === 'function') {
  globalThis.fetch = async function guardedFetch(input, init) {
    let url;
    try { url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url); } catch { url = null; }
    if (url && !['data:', 'blob:', 'file:'].includes(url.protocol) && !isLocal(url.hostname)) {
      throw block('fetch', url.hostname, url.port);
    }
    return realFetch.call(this, input, init);
  };
}

// --- 2. sockets ---
function hostFromConnectArgs(args) {
  const a0 = args[0];
  if (Array.isArray(a0)) return hostFromConnectArgs(a0); // normalized args (internal)
  if (a0 && typeof a0 === 'object') {
    if (a0.path) return { local: true };
    return { host: a0.host ?? a0.hostname ?? 'localhost', port: a0.port };
  }
  if (typeof a0 === 'string' && isNaN(Number(a0))) return { local: true }; // unix socket path
  return { host: typeof args[1] === 'string' ? args[1] : 'localhost', port: a0 };
}
const realSocketConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function guardedConnect(...args) {
  const t = hostFromConnectArgs(args);
  if (!t.local && !isLocal(t.host)) throw block('socket', t.host, t.port);
  return realSocketConnect.apply(this, args);
};
const realTlsConnect = tls.connect;
tls.connect = function guardedTlsConnect(...args) {
  const t = hostFromConnectArgs(args);
  if (!t.local && !isLocal(t.host)) throw block('tls', t.host, t.port);
  return realTlsConnect.apply(this, args);
};

// --- 3. DNS ---
const realLookup = dns.lookup;
dns.lookup = function guardedLookup(hostname, ...rest) {
  if (!isLocal(hostname)) {
    const err = block('dns', hostname);
    const cb = rest.find((x) => typeof x === 'function');
    if (cb) { process.nextTick(() => cb(err)); return {}; }
    throw err;
  }
  return realLookup.call(this, hostname, ...rest);
};
const realPromLookup = dns.promises.lookup;
dns.promises.lookup = async function guardedPromLookup(hostname, ...rest) {
  if (!isLocal(hostname)) throw block('dns', hostname);
  return realPromLookup.call(this, hostname, ...rest);
};

if (process.env.UCT_NET_GUARD_VERBOSE) process.stderr.write(`[no-network-guard] active (pid ${process.pid})\n`);
