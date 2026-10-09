# Research Prompt 2 of 2 — Mid-size, Niche, Regional and Failed Players (for Gemini Deep Research)

> How to use: run this **after** prompt 1. Before pasting, fill in the section `RESULTS OF RUN 1` with the executive summary and the market map from report 1. That way the research won't repeat itself and can build on what run 1 found.
> Then paste everything between the two `=====` lines into Gemini Deep Research.
> When Gemini shows its research plan, check that it includes Tier 2, Tier 3 and Part 3 (implications for UC TENDER) before you approve it.

=====

# ROLE
You are a senior market-research analyst and B2B SaaS strategist specializing in procurement, public tenders and proposal/RFP software. You produce investor-grade, evidence-based research. You never invent facts: if something cannot be verified, you write "not found" and explain what you searched.

# CONTEXT — WHO THIS RESEARCH IS FOR
I am the solo founder of **UC TENDER**, an Israeli B2B SaaS for managing and preparing tender bids (Hebrew, RTL). Every finding must ultimately answer: *"so what does this mean for UC TENDER?"*

This is **run 2 of 2**. Run 1 already covered the 3 market leaders and my local competitor BIDO in depth (summary below). **Do not re-profile them.** This run covers the rest of the market: mid-size, niche, regional and small players, plus companies that struggled or failed. The goal is a broad picture of the market, not just the winners, and to find practical ideas that fit a solo founder better than what the giants do.

**What UC TENDER does today (working prototype + engine):**
1. **Deep Onboarding → "Fact Atoms" knowledge base.** The company uploads past projects, certificates, financials, and management CVs. The system breaks them into atomic, verified facts, each with a source and a confidence level, approved by a human before being locked.
2. **Tender parsing.** Reads tender documents (PDF incl. scanned, Word, Excel bills of quantities) and extracts threshold/eligibility requirements and scoring criteria.
3. **Match & Go/No-Go.** Each requirement is marked `met` / `not_met` / `unknown` against the knowledge base (`unknown` is never treated as met), with a Match Score and an evidence-cited gap report.
4. **Fact-grounded draft generation.** Editable Word drafts of bid chapters with enforced **zero hallucination**: RAG over the client's facts only, mandatory citation per claim, and post-generation verification.
5. **Learning loop (planned).** Win/loss feedback improves future matching and framing.

**Not in scope today:** tender discovery (manual upload for now), automatic pricing, portal submission, post-award management.

**Target customer:** Israeli SMB and mid-market B2B companies bidding on government, municipal and government-company tenders. Buyer: VP Business Development. User: bid/tender manager. Gatekeepers: legal and CISO.

**Main local competitor:** BIDO (bido-tenders.com / bido.ai), with a discovery product (~₪149/month), a per-tender submission and form-filling product (bido.ai, ~₪99 per analysis), and a bills-of-quantities and subcontractor product (BIDO FLOW).

# RESULTS OF RUN 1 (filled in by me)
<<< PASTE HERE: the executive summary from report 1, the names of the Big 3 that were selected, the challengers watchlist, and the market map of 25–30 players >>>

# THE TASK

## PART 1 — Tier 2: mid-size, niche, regional and small players (12–18 companies)
Exclude the Big 3 and BIDO. Choose companies so that together they cover:
- **Geographies:** US, UK, EU/Nordics, DACH, Australia/NZ, India/Asia, Gulf/Middle East, Latin America if relevant.
- **Sizes:** at least 4 companies that are close to my size and stage (small team, early revenue, bootstrapped or seed), not only well-funded ones.
- **Approaches:** library-based, generative-first, discovery-first, end-to-end, and vertical-specific (construction, defense, healthcare, IT services, consulting).
Candidates to consider (verify and replace freely): Loopio, Upland Qvidian, Mercell, Tussell, Stotles, GovSpend, HigherGov, GovDash, Sweetspot, Procurement Sciences, Thalamus, AutogenAI, Bidhive, BidScript, Inventive AI, Arphie, Tendium, and regional players you discover.

For each company, give a compact profile of half a page to one page:
1. Snapshot (HQ, founding year, size signal, funding, region, segment).
2. Who it serves and the core pain it solves.
3. How it works: key workflow and AI approach.
4. First signup step and onboarding model (self-serve, trial, freemium, or demo). Describe what you actually see on the signup page.
5. Pricing (if found) and price metric.
6. GTM wedge: how it got its first customers and its main channel today.
7. Retention mechanism: what keeps its users coming back.
8. **The one idea worth stealing**: the single most interesting product, onboarding, pricing or GTM idea, and how it could apply to UC TENDER.
9. Main weakness according to reviews.

## PART 2 — Tier 3: struggles, pivots and failures (4–6 cases)
For each case: what they tried, what went wrong (product, GTM, pricing, timing, data, competition), what happened (pivot, cheap acquisition, shutdown, product sunset after acquisition), and the concrete lesson for UC TENDER. Look for products sunset after an acquisition, AI proposal startups that pivoted or shut down, discovery-only services that lost to bundled platforms, and regional players that failed to expand.

## PART 3 — Synthesis across the long tail
1. A comparison matrix of all Tier 2 players: segment, region, size, AI approach, onboarding model, price metric and range, GTM wedge, retention mechanism.
2. How small and mid-size players **compete against the giants**: which strategies worked (niche verticals, geography, language, price, self-serve, specific document types) and which did not.
3. Regional patterns: how tender software differs by region (EU vs US vs Asia vs Middle East), especially for non-English markets and markets with their own government portals. What does that suggest for a Hebrew/Israel-first product?
4. Pricing patterns among small players: self-serve price points, per-tender vs subscription, free tiers, and what converts.
5. Recurring causes of failure, as a checklist.

## PART 4 — Implications for UC TENDER
Build on run 1's recommendations; confirm, refine or challenge them. Map findings to UC TENDER's modules (Onboarding/Fact Atoms, Tender Parsing, Match & Go/No-Go, Draft Generation, Learning Loop, future Discovery). Then:
1. **"Ideas worth stealing" table:** the best 10–15 ideas from all Tier 2 players, each with Adopt / Adapt / Avoid, priority (P0–P2), and effort for a solo founder (S/M/L).
2. **Solo-founder playbook:** which GTM, onboarding and pricing patterns from small players fit a one-person company best, and which require a team or capital I don't have.
3. **Niche strategy:** based on the evidence, which vertical or customer segment in Israel should UC TENDER start with (e.g., IT services, consulting, engineering, construction subcontractors), and why?
4. **Failure risk checklist:** which failure causes from Tier 3 apply to UC TENDER today, and how to avoid each one.
5. **What changes vs run 1:** where this broader view confirms, refines or contradicts run 1's top recommendations.
6. **Top 10 additional recommendations:** ranked, actionable, and not repeating run 1, each tied to evidence.

# RESEARCH RULES
- **Sources, in order of preference:** official product docs/help centers/release notes, company sites and pricing pages, credible press (TechCrunch, Business Wire, Reuters, and regional business press), funding databases (Crunchbase, Dealroom, Tracxn), review platforms (G2, Capterra, TrustRadius), Reddit and community forums, Product Hunt, job postings, LinkedIn headcount data, and archived pages (Wayback Machine) for companies that failed or pivoted.
- **Recency:** prefer 2025–2026 information. Date every quantitative claim.
- **Label every key claim** as one of: **[Fact]**, **[Vendor claim]**, **[Estimate]** (state the method), or **[Inference]**.
- **Cite inline** with links for every non-trivial claim.
- **No fabrication:** if data is not publicly available, write "not found" and suggest how it could be obtained.
- Separate marketing language from observed reality.

# OUTPUT FORMAT
- **Write the final report in Hebrew.** Keep company names, product names and technical terms in English.
- Structure:
  1. Executive summary (max 1 page): the 5 most important insights from the long tail, the 3 best ideas worth stealing, and the main way this changes run 1's conclusions.
  2. Part 1: Tier 2 compact profiles, using the same 9 headings for each.
  3. Part 2: failure and pivot cases.
  4. Part 3: synthesis, with the Tier 2 matrix as a table.
  5. Part 4: implications, including the ideas-worth-stealing table and direct answers to all 6 items.
  6. Appendix: full source list grouped by company, plus open questions for primary research.
- Use tables wherever comparison helps. Be thorough, but every paragraph must earn its place.

=====
