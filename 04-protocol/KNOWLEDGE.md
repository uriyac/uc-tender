# KNOWLEDGE.md — Project Knowledge for Lovable

> ⚠️ זה הקובץ שנכנס ל-Lovable Project Knowledge.
> עדכן אותו כאן → העתק ל-Lovable Settings → Project Knowledge.
> כל פרומפט ל-Lovable מבוסס על הקשר זה.

---

## Product Context

**Product:** UC TENDER (Tender AI)
**Core Value:** AI-powered "organizational memory" that generates flexible, tailored bid responses from a company's existing project history — no hallucinations, only facts the company provided.

**The Core Mechanic:** 
A company uploads all their documents. The system breaks them into structured knowledge dimensions. When a new tender arrives, the system maps tender requirements → relevant project dimensions → generates a draft that re-frames existing experience to match the tender's language. Like writing a tailored CV for each job application — same experience, different emphasis.

---

## Tech Stack
- TanStack Start (TypeScript)
- Tailwind CSS + shadcn/ui
- Lovable fullstack (Supabase backend)

---

## Design Principles
- **B2B Enterprise feel** — professional, trustworthy, not startup-playful
- **Hebrew RTL** — all UI must support RTL layout correctly
- **Clarity over cleverness** — every action must be obvious
- **Data transparency** — always show the user WHERE data came from
- **No hallucinations** — if data is missing, flag it clearly, never invent

---

## Primary Persona
**"יוסי" — VP Business Development**, mid-large Israeli B2B company (construction, engineering, infrastructure, services). Strategic decision-maker. Uses the system to: (1) decide Go/No-Go on tenders, (2) review AI-generated drafts, (3) track active tender pipeline.

---

## Current Screens (Built)
- **Dashboard** (Tender Control Center) — active tenders table, KPI cards, Win Rate
- **Navigation:** Dashboard, Knowledge Base, Tender Radar (⚠️ to be removed), Drafts & Approvals, Settings

---

## Screens to Build (MVP Priority Order)
1. S01 — Welcome / Onboarding Start
2. S02 — Document Upload (bulk, drag & drop)
3. S03 — Knowledge Base Review (what system learned)
4. S04 — Project Detail / Edit
5. S06 — New Tender Intake (PDF upload or paste)
6. S07 — Tender Detail / Go-No-Go (Match Score + Gap Analysis)
7. S08 — Draft Mapping Review
8. S09 — Draft View & Download
9. S05 — Dashboard Refinements
10. S10 — Post-Submission Learning

---

## What is OUT of scope (never build these)
- Tender Radar / marketplace for discovering new tenders
- Automatic submission to government portals
- Pricing / financial model automation
- Presentation / slide builder
- Post-award project management
- Web scrapers

---

## Key UX Rules
- **Match Score** must always include an explanation — never a bare number
- **Gap Analysis** must say "what to do" not just "what's missing"
- **Draft sections** must show their source: "מבוסס על: [שם פרויקט]"
- **Missing data** must be highlighted in yellow with "נדרש השלמה ידנית"
- **Tender Radar** must be removed from navigation in next update

---

## Naming & Language
- Product name: **UC TENDER** (until final brand name decided)
- UI language: Hebrew (RTL), with English technical terms where standard
- Security badge: "SOC2 Secure · Zero Data Retention" — keep visible

---

*Last updated: 2026-07-20 | Update this file before each new Lovable prompt*
