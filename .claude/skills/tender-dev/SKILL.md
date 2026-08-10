---
name: tender-dev
description: Development guide for the "UC TENDER" (smart tender-management) project — a Hebrew RTL web app with a thin Node backend and a stub/Claude engine abstraction. Use this skill for ANY code work on this project: adding or changing a screen, adding an API route, touching the engine (parseTender/extractKnowledge/analyzeMatch/buildMapping/generateDraft), wiring the front-end to the backend, or debugging. It encodes the architecture, the file map, and the dev gotchas so every change stays consistent with what's already built. For step-by-step add-a-thing procedures read recipes.md; for the zero-hallucination guardrail and Phase 5 enforcement read guardrail.md.
---

# Tender System — Development Guide

## What this project is

"UC TENDER" — a tool for Israeli B2B companies bidding on public tenders. The user uploads company documents; the system learns them into an **organizational memory**, then for each tender it parses requirements, scores the match, maps each requirement to a source in memory, and generates a response draft **where every claim cites its source** — anything without a source is flagged for manual completion, never invented.

Primary persona: VP Business Development at a mid-large Israeli company. Language: **Hebrew, RTL**.

> This project used to be built through Lovable. **It is now built locally** (Node backend + a single HTML prototype). Ignore any Lovable-era instructions — we edit code directly.

## Architecture — the mental model

```
prototype/index.html   ← the whole front-end (one file, multiple <section data-screen> screens)
prototype/api.js       ← the ONLY fetch layer to the backend (with local fallback)
server/                ← thin Node/Express backend
  src/index.js         ← Express app: serves /prototype + mounts /api/*
  src/data/            ← store.js (JSON repository) + schema.js (seed)
  src/engine/          ← THE ENGINE: index.js factory → stub/ | claude/
  src/lib/extractText.js ← file→text (deterministic, shared by all engines)
  src/routes/          ← knowledge.js documents.js tenders.js drafts.js
  src/export/          ← docx.js (real RTL Word) + pdf.js (best-effort PDF)
```

Run it: `cd server && npm start` → open `http://localhost:3000`. Backend changes need a server restart; front-end changes just need a browser reload.

## Task → which files you touch

| Task | Files |
|------|-------|
| New screen / change a screen | `prototype/index.html` (add `<section>`, `renderX()`, `go()` hook, nav switcher) + `prototype/api.js` |
| Wire an existing screen to real data | `prototype/index.html` (`renderX`) + `prototype/api.js` |
| New engine capability (smart) | `server/src/engine/stub/index.js` + `.../claude/index.js` + the calling route |
| New API endpoint | `server/src/routes/*.js` (+ mount in `src/index.js` if a new file) + `prototype/api.js` |
| New persisted field / collection | `server/src/data/schema.js` (seed) + the route (+ a `store.js` helper if generic) |
| Support a new file format | `server/src/lib/extractText.js` only |
| Change the generated draft / export | `server/src/engine/*/generateDraft` + `server/src/export/docx.js` & `pdf.js` |

**Adding one of these?** Read `recipes.md` for the exact steps (screen / engine capability / endpoint).

## The engine contract — never break it

The engine is **5 pure functions** behind a factory (`engine()` picks `stub` or `claude` by the `ENGINE` env var). The front-end and routes talk ONLY to this contract, so swapping `ENGINE=stub` → `ENGINE=claude` needs zero changes elsewhere.

```
extractKnowledge(rawText, {kind,filename}) → { projects[], certifications[] }
parseTender(rawText)                       → { code, name, issuer, deadline, requirements[] }
analyzeMatch(requirements, kb)             → { matchScore, met[], gaps[], fails[] }
buildMapping(requirements, kb)             → [{ requirement, project, dimensions[], hasSource }]
generateDraft(mapping)                     → { sections:[{title,body,confidence,sourceProject,needsManual}] }
```

- Raw text extraction (`lib/extractText.js`) is **not** part of the engine — it's deterministic file parsing shared by every engine. Only the 5 "smart" functions are swappable.
- When you add capability, extend the **contract** and implement it in BOTH `stub/` and `claude/`. Never let a route call an engine-specific detail.

## The Guardrail — the one invariant you must NEVER violate

**Zero hallucination.** The product re-frames existing facts and never invents. `generateDraft` structurally sees ONLY the mapping, so it physically can't invent; a requirement with no source becomes `needsManual:true` with an empty body — never filled with invented content.

**Touching the engine, a draft path, an export, or Phase 5? Read `guardrail.md`** — it holds the deterministic-enforcement rules, the untrusted-input handling, the Phase 5 requirements, and how to run the guardrail test suite. If a change would let the system state a fact the company didn't provide, the change is wrong.

## Front-end conventions (`prototype/index.html`)

- **Screens** are `<section data-screen="name">`; `go(name)` switches them and scrolls to top.
- **Data-driven screens** each have an async `renderX()` that fetches via `window.API` and fills `id`-tagged containers. Hook it into the `go()` dispatch.
- **All network calls go through `prototype/api.js`.** Add a method there; never `fetch` inline. Every getter takes a `fallback` so the prototype works if the server is down.
- **Hebrew copy is written verbatim in the markup.** RTL everywhere; sidebar on the RIGHT.
- **Design tokens**: use the CSS vars (`--signal`, `--hairline`, `--amber-signal`, `--navy`, `t-11/t-13/...`). Match the existing "Editorial Terminal" look — do not redesign.
- Global functions the page relies on (`go`, `selectTender`, `renderX`, screen handlers) are attached to `window`.
- **Smart entry**: an IIFE picks the opening screen — empty account → `welcome` (onboarding); otherwise → `dashboard`. Onboarding: `welcome → company-setup → upload → review → dashboard`. Company identity lives on the `company` record (`GET/PUT /api/knowledge/company`); Settings reuses the `company-setup` form in edit mode.

## Backend conventions (`server/`)

- Routes are thin: validate input → call `engine()` / `store` → return JSON. No business logic in the front-end.
- Multer uses `memoryStorage`; it decodes filenames as latin1 — convert with `Buffer.from(name,'latin1').toString('utf8')`.
- The store (`data/store.js`) is a JSON-file repository behind a generic API (`all/find/insert/update/remove`, plus `knowledge()`/`company()`). Swappable for SQLite/Postgres without touching routes.
- Seed data lives in `data/schema.js`. **Reset state** by deleting `server/src/data/db.json` and restarting.

## Dev gotchas (these have bitten us)

- **Hebrew + curl in Git Bash is corrupted** — the shell mangles Hebrew args. **Test Hebrew flows in the browser** (via `window.API…` in the console), not curl. Server-side string literals are fine.
- **Port 3000 stuck (EADDRINUSE):** `Get-NetTCPConnection -LocalPort 3000 -State Listen | %{ Stop-Process -Id $_.OwningProcess -Force }` (PowerShell).
- **PDF Hebrew is best-effort** (no full BiDi engine). **DOCX is the correct export for Hebrew** — prefer it.
- After ANY backend change, restart the server (`npm start`) — the JSON store is cached in memory.
- Always verify a change **end-to-end in the browser**, not just with a unit call.

## Out of scope

Tender radar / discovery ("איתור מכרזים"), auto-submission to government portals, pricing automation, slide/deck builder, post-award project management, web scrapers. If asked for one, flag it as out-of-scope and confirm before proceeding.

## After every change

1. Verify end-to-end in the browser.
2. Update `04-protocol/CHANGELOG.md` (what changed, dated).
3. Update statuses in `03-build/BACKLOG.md` and `03-build/ENGINE-PLAN.md` if a phase/item moved.
4. If a decision changed the product, reflect it in the SSoT `00-foundation/SYSTEM-ALIGNMENT.md`.

## Where we are

Engine plan: `03-build/ENGINE-PLAN.md`. Phases 0–4 are **done** — the full journey (upload → knowledge → tender → analysis → mapping → draft → download → learning) works on real data with the `stub` engine. **Phase 5 is the only thing left: inject the real Claude engine** by filling `server/src/engine/claude/*` against the contract above and switching `ENGINE=claude` — no front-end or route changes. See the `phase5-claude-engine` skill when you start it.
