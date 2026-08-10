# Recipes — step-by-step for the common tasks

Read this file when you are **adding** something (a screen, an engine capability, an endpoint).
For everyday reasoning about where code lives, the main `SKILL.md` is enough.

## Recipe A — Add a new data-driven screen
1. In `prototype/index.html`, add `<section data-screen="my-screen">` with **id-tagged empty containers** (no hardcoded data) — e.g. `<div id="ms-list"></div>`. Write all Hebrew labels verbatim; use the design tokens.
2. Add an async renderer near the other `renderX` functions:
   ```js
   async function renderMyScreen(){
     const data = await window.API.myData({items:[]});   // always a fallback
     const el = document.getElementById('ms-list'); if(!el) return;
     el.innerHTML = data.items.map(x=>`…`).join('') || '<div class="t-13 text-black/45">אין נתונים</div>';
   }
   window.renderMyScreen = renderMyScreen;
   ```
3. Hook it into the `go()` dispatch: `if(name==='my-screen' && window.renderMyScreen) window.renderMyScreen();`
4. Add a button to the floating nav switcher (bottom-left panel) so it's reachable.
5. Add the getter in `prototype/api.js`: `myData(fallback){ return this._get('/api/my-data', fallback); }`.
6. Verify: in the browser console run `go('my-screen')`, then read the DOM — containers should fill from the API.

## Recipe B — Add an engine capability
1. Decide the layer: **deterministic file/text parsing → `lib/`** (shared, not the engine); **anything "smart" → the engine contract**.
2. Document the new function in the contract comment in `server/src/engine/index.js`.
3. Implement it in `server/src/engine/stub/index.js` as a deterministic heuristic (regex / keyword overlap — see the existing functions for the style).
4. Add the same export in `server/src/engine/claude/index.js` as `notConfigured('yourFn')` — it stays a stub until Phase 5.
5. Call it from a route only via `engine().yourFn(...)` — never `import` from `stub/` directly.
6. **Guardrail check:** if the output becomes user-facing draft content, a missing source must yield a flagged/empty result — never invented text. (See `guardrail.md`.)
7. Restart the server; verify the whole flow in the browser.

## Recipe C — Add an API endpoint
1. In the relevant `server/src/routes/*.js`, add the handler: validate input → call `store` / `engine()` → return JSON. Keep it thin.
2. File upload? Use `multer` `memoryStorage`, and decode filenames: `Buffer.from(f.originalname,'latin1').toString('utf8')`.
3. New route file? Mount it in `server/src/index.js` (`app.use('/api/x', x)`).
4. Add the matching method in `prototype/api.js` — a `_get` (with fallback) for reads, `_send`/FormData for writes.
5. Restart the server. Test in the **browser** via `window.API…` (curl corrupts Hebrew — see the gotchas in `SKILL.md`).
