# Research Prompt 1 of 2 — Big 3 + BIDO Deep Dive (for Gemini Deep Research)

> How to use: paste everything between the two `=====` lines into Gemini Deep Research.
> When Gemini shows its research plan, check that it includes Part 0 (selecting the Big 3), the BIDO deep dive and Part 3 (implications for UC TENDER) before you approve it.
> After it finishes, save the report: you will paste its executive summary into prompt 2.

=====

# ROLE
You are a senior market-research analyst and B2B SaaS strategist specializing in procurement, public tenders and proposal/RFP software. You produce investor-grade, evidence-based research. You never invent facts: if something cannot be verified, you write "not found" and explain what you searched.

# CONTEXT — WHO THIS RESEARCH IS FOR
I am the solo founder of **UC TENDER**, an Israeli B2B SaaS for managing and preparing tender bids (Hebrew, RTL). The goal of this research is to understand what the world's leading tender/bid software companies and my main local competitor do — how they work, sell, onboard, retain, and differentiate — so I can improve my product and go-to-market. Every finding must ultimately answer: *"so what does this mean for UC TENDER?"*

This is **run 1 of 2**. This run goes deep on the 3 market leaders and on my local competitor BIDO. A separate run will cover mid-size, niche and failed players, so do not spend effort profiling them here beyond the market map.

**What UC TENDER does today (working prototype + engine):**
1. **Deep Onboarding → "Fact Atoms" knowledge base.** The company uploads past projects, certificates, financials, and management CVs. The system breaks them into atomic, verified facts (e.g., "worked with 11 municipalities", "project period 2021–2023"), each with a source and a confidence level, approved by a human before being locked.
2. **Tender parsing.** Reads tender documents (PDF incl. scanned, Word, Excel bills of quantities) and extracts threshold/eligibility requirements and scoring criteria.
3. **Match & Go/No-Go.** Each requirement is marked `met` / `not_met` / `unknown` against the knowledge base. `unknown` is never treated as met. Produces a Match Score plus a gap report that cites the evidence for every "met".
4. **Fact-grounded draft generation.** Generates editable Word drafts of bid chapters (company experience, quality of proposal), re-framing the same facts for each tender's language. Enforced **zero hallucination**: RAG over the client's facts only, mandatory citation per claim, and a post-generation verification layer that blocks any number/date/amount not in the knowledge base.
5. **Learning loop (planned).** Win/loss feedback improves future matching and framing.

**Explicitly NOT in scope today:** tender discovery marketplace (MVP = manual upload; government-source adapters planned later), automatic pricing, automatic portal submission, post-award project management.

**Target customer:** Israeli SMB and mid-market B2B companies that bid on government, municipal and government-company tenders. Economic buyer: VP Business Development. Daily user: the bid/tender manager. Gatekeepers: legal counsel and CISO (data isolation, accuracy).

**Current differentiation hypotheses (to be tested, not assumed):** (a) enforced zero-hallucination with traceable sources; (b) Hebrew-native and built for Israeli tender formats; (c) single-tenant / data-isolation option for sensitive commercial data; (d) a "living memory" that improves with each bid; (e) transparent pricing for SMBs. Pricing model is undecided (per seat / per tender / subscription).

**Prior findings from my earlier desk research (verify or challenge them; do not just repeat them):**
- The market splits into three segments: discovery/intelligence (e.g., Deltek GovWin IQ, HigherGov, Stotles), response/proposal writing (e.g., Responsive, Loopio, AutogenAI), and end-to-end capture (e.g., Sweetspot, GovDash, Procurement Sciences, Thalamus).
- Buyers complain about content libraries going stale, messy input formats (scanned PDFs, Excel, portals), hallucinations, and opaque, expensive pricing that locks out SMBs.
- Claimed AI impact: 5–10% higher win rate and more than 50% time saved. Treat these as vendor claims until independently verified.
- **Main local competitor — BIDO (Israel, bido-tenders.com / bido.ai):** an ecosystem of three products: (1) BIDO core, a tender discovery and alerts service scanning hundreds of Israeli official sources (~₪149/month, Kanban board, winners library, feasibility calculator, chat search assistant); (2) bido.ai, a submission product that reads the tender booklet, flags threshold conditions and risks, and auto-fills forms to a ready PDF (~₪99 per first analysis, priced per tender, with no accumulating company memory as far as I know); (3) BIDO FLOW, which breaks down bills of quantities and sends quote requests to subcontractors. My hypothesis is that bido.ai is my real competitor, not BIDO core.

# THE TASK

## PART 0 — Market map and selecting the "Big 3"
1. Map the global tender/bid/proposal software market in 2025–2026: segments, approximate market size and growth (with sources), and **at least 25–30 players** organized by segment and region, with one line each (what they do, size signal, HQ). This map will be reused by run 2.
2. Select the **Big 3** as **the clear leader of each of the three segments** (discovery/intelligence, response/proposal management, end-to-end/AI-native capture). Use explicit criteria: revenue/ARR (reported or credibly estimated), number of customers, funding/valuation or parent-company size, headcount trend, analyst/review-site recognition (G2 Grid, etc.), and geographic reach. Show the scoring in a table and justify the choice. If the evidence says a different trio is more meaningful (e.g., a European leader such as Mercell, or the response segment is really a Responsive-vs-Loopio duopoly), say so and explain.
3. Add a **"Challengers watchlist"** of 5–8 AI-native players founded or relaunched since 2022, one paragraph each: what is new about their approach and why they matter.

## PART 1 — Deep dive on each of the Big 3 AND on BIDO (same 12 dimensions for each, so they are comparable)
For BIDO, also check the Hebrew sources: its Hebrew website, Israeli press (Calcalist, Globes, TheMarker, Geektime), LinkedIn, Facebook/Instagram ads, YouTube demos, and user discussions in Israeli contractor and business groups. Specifically verify: how bido.ai's analysis works, whether it keeps any company memory between tenders, how it handles accuracy and sources, its real pricing and packaging across the three products, how the three products cross-sell to each other, and who its customers are (construction vs services vs tech).
1. **Snapshot:** founding year, HQ, ownership (VC / PE / public parent), funding and acquisitions, revenue/ARR (reported or estimated, with method), headcount and its trend, number and type of customers, geographies, notable logos.
2. **The need they solve (JTBD):** which persona buys, which persona uses daily, what trigger events make a company buy, and the exact pain they lead with in their messaging (quote their homepage headline and main value propositions).
3. **How the product works:** the end-to-end workflow, step by step, as a user experiences it; core modules; underlying data model (Q&A content library vs knowledge graph vs document repository); how AI is used (LLM providers, RAG, fine-tuning, agents); handling of difficult inputs (scanned PDFs, Excel, government portals); collaboration and review workflows; output formats. Use help-center docs, product videos, webinars and release notes, not just marketing pages.
4. **Signup and onboarding (be very concrete):** What is the very first step for a new customer: self-serve signup, free trial, freemium, or "book a demo"? Which fields does the first form ask for? What happens after it: sales call, sandbox, implementation project? How long until first value, and what is the first "aha" moment? Implementation fees, content-import/migration services, customer success model. Walk through the public signup and demo-booking pages and describe what you see.
5. **Pricing and packaging:** tiers, price metric (per seat / per user type / per project / platform fee), minimums, add-ons, contract length, auto-renew and price-increase practices. Use public pricing, Vendr / G2 / Capterra / Reddit / TrustRadius reports, and procurement records (government contracts sometimes disclose prices).
6. **Go-to-market and market penetration:** how they originally entered the market (initial wedge segment and use case), main acquisition channels (outbound sales, PLG, partners/resellers, professional associations such as APMP, events, SEO/content, marketplaces), how certifications (FedRAMP, SOC 2, ISO 27001) are used as sales levers, the international expansion pattern, and land-and-expand motion. Look at job postings to infer current GTM priorities.
7. **Retention and lock-in:** what makes customers stay (accumulated content/data, integrations with Salesforce/SharePoint/Teams/Slack/CRM, workflow habit, multi-department adoption); net revenue retention or churn figures where available; recurring churn reasons from reviews; renewal and upsell practices.
8. **Trust, security and AI accuracy:** data isolation and residency options, compliance certifications, hallucination controls (citations, confidence scores, source traceability, human-in-the-loop), and how they *market* trust.
9. **Strengths:** evidence-backed, not marketing claims.
10. **Weaknesses:** mine G2, Capterra, TrustRadius and Reddit reviews from 2024–2026 (for BIDO, Israeli forums and social media). Cluster the recurring complaints and show approximate frequency, with 2–3 short representative quotes per cluster.
11. **What is unique / their moat:** what is genuinely hard to copy (data, distribution, integrations, brand, regulatory position), and what is not.
12. **Business advantage:** why they win deals against competitors, in one sharp positioning sentence, followed by the evidence for it.

## PART 2 — Synthesis
1. A comparison matrix of the Big 3 + BIDO across all 12 dimensions.
2. What has become **commodity / table stakes** in 2026, versus what is still **differentiating**.
3. How generative AI changed this market in 2024–2026: who adapted, who got disrupted, and what buyers now expect by default.
4. Pricing benchmarks: a realistic price range per segment and per company size.
5. Proven onboarding and time-to-value patterns that correlate with fast adoption.
6. The most common retention mechanisms, and which ones actually work according to evidence.

## PART 3 — Implications for UC TENDER (the most important part)
Map every relevant finding to UC TENDER's modules (Onboarding/Fact Atoms, Tender Parsing, Match & Go/No-Go, Draft Generation, Learning Loop, future Discovery). For each finding, state **Adopt / Adapt / Avoid**, why, priority (P0–P2) and rough effort for a solo founder (S/M/L). Then answer these questions directly:
1. **Onboarding:** What is the fastest proven time-to-first-value pattern? Would a PLG wedge such as "upload one tender → get a free gap report in minutes" work in this category, or do buyers expect a sales-led demo? Show evidence.
2. **Zero hallucination as a buying criterion:** Is there evidence that buyers choose or pay more for verified, source-traceable output? How do the leaders talk about accuracy, and is "enforced zero hallucination" a credible and defensible differentiator or something the leaders will copy within months?
3. **Discovery:** Do the leaders bundle tender discovery with response? Is discovery necessary for daily usage habit and retention, or can a response-first product retain customers on its own?
4. **Knowledge base:** The leaders' content libraries go stale. What concrete mechanisms (auto-update, usage-based decay, SME review cycles, learning from submitted bids) keep a knowledge base fresh, and how should Fact Atoms be designed to avoid the same trap?
5. **Pricing model:** Based on the benchmarks, which pricing model and price range fits Israeli SMB and mid-market companies? Give 2–3 options with pros and cons.
6. **Retention:** Which retention mechanisms should be built into UC TENDER from day one?
7. **Israel transferability:** Do any of the Big 3 or the challengers serve Israel, Hebrew, or RTL? Describe the Israeli tender landscape (government procurement portal mr.gov.il, municipalities, government companies, defense), all local competitors beyond BIDO that you can find, and local constraints (Israeli Privacy Protection Law Amendment 13, data residency, security requirements of government-related customers). Which global patterns transfer to Israel and which do not?
8. **UC TENDER vs BIDO, head to head:** Compare feature by feature, by pricing, onboarding, target customer and positioning. Is my hypothesis right that bido.ai, not BIDO core, is the real competitor? Where does BIDO win today, and where can UC TENDER win clearly? Could BIDO add company memory and source-traceable drafting quickly, and how should I position against that? Is partnering with BIDO a realistic option (e.g., their discovery feeding my drafting)?
9. **Threats:** Where could an incumbent or a well-funded AI-native player crush UC TENDER, and what is the defensible niche?
10. **Top 10 recommendations:** ranked, actionable and specific to a solo founder with a working prototype, each tied to evidence from this research.

# RESEARCH RULES
- **Sources, in order of preference:** company filings and investor materials, official product docs/help centers/release notes, credible press (TechCrunch, Business Wire, Reuters; for Israel: Calcalist, Globes, TheMarker, Geektime), analyst reports, review platforms (G2, Capterra, TrustRadius), Reddit and community forums, job postings, LinkedIn headcount data, government contract records.
- **Recency:** prefer 2025–2026 information. Date every quantitative claim (e.g., "ARR ~$X, est., 2025").
- **Label every key claim** as one of: **[Fact]** (verified source), **[Vendor claim]** (company says it, not independently verified), **[Estimate]** (state the method), or **[Inference]** (your reasoning).
- **Cite inline** with links for every non-trivial claim.
- **No fabrication:** if data such as ARR, pricing or NRR is not publicly available, write "not found" and suggest how it could be obtained.
- Separate marketing language from observed reality. When reviews contradict vendor claims, say so explicitly.
- Be quantitative wherever possible.

# OUTPUT FORMAT
- **Write the final report in Hebrew.** Keep company names, product names and technical terms in English.
- Structure:
  1. Executive summary (max 1 page): the Big 3 and BIDO in one line each, the 5 most important insights, and the top 3 actions for UC TENDER.
  2. Part 0: market map (25–30 players), Big 3 selection table, challengers watchlist.
  3. Part 1: deep dive per company (Big 3 + BIDO), using the same 12 headings in the same order for each.
  4. Part 2: synthesis, with the comparison matrix as a table.
  5. Part 3: implications. Include the Adopt/Adapt/Avoid table and direct answers to all 10 questions.
  6. Appendix: full source list grouped by company, plus open questions that require primary research (customer interviews, demo calls), with suggested interview questions.
- Use tables wherever comparison helps. Be thorough and deep, but every paragraph must earn its place.

=====
