# ENGINE-PLAN.md — תוכנית בניית המנוע (שלד MVP מקצה-לקצה)

> 📎 נגזר מ-`00-foundation/SYSTEM-ALIGNMENT.md`. עונה על הפער היחיד שזוהה שם: **"אין מנוע — הכל דמו."**
> מטרה: להרים שלד עובד שבו מזינים מכרז אמיתי ומקבלים את כל ה-flow, כשהמנוע מוכן-להזרקה של Claude.

---

## הכרעות מכוננות (2026-07-28)

| נושא | הכרעה |
|------|--------|
| סטאק | חזית `prototype/index.html` הקיימת נשארת + **backend דק ב-Node** |
| גישה ל-AI | **אין מפתח בינתיים.** בונים שלד גמור עם `stub` דטרמיניסטי; מזריקים מפתח בסוף |
| היקף | **Flow מלא דק מקצה-לקצה** — כל מודול מינימלי-אך-אמיתי |

---

## עקרון-העל: הפשטת-ספק (Provider Abstraction)

המנוע הוא **חוזה של 5 פונקציות**, עם שתי מימושים מאחוריו:

```
ENGINE=stub    → מימוש דטרמיניסטי (ללא מפתח, מחזיר נתונים אמיתיים-בצורתם)
ENGINE=claude  → מימוש אמיתי מול Claude API (מתמלא בשלב 5)
```

החזית וה-routes מדברים רק עם החוזה. החלפת מנוע = שינוי משתנה סביבה אחד + הוספת מפתח.
**זה מה שהופך את "אין מפתח בינתיים" לחסר-משמעות אדריכלית.**

### חוזה המנוע (`/server/src/engine/contracts`)
```
parseDocument(file)               → { kind, rawText }
extractKnowledge(rawText, kind)   → { projects:[{name,year,dimensions[]}], certifications[] }
parseTender(rawText)              → { code,name,issuer,deadline, requirements:[{text,category}] }
analyzeMatch(requirements, kb)    → { matchScore, met[], gaps[], fails[] }
buildMapping(requirements, kb)    → [{ requirement, project, dimensions[], hasSource }]
generateDraft(mapping)            → { sections:[{title, body, confidence, sourceProject, needsManual}] }
```

### ה-Guardrail מוטבע בחוזה (לא בפרומפט בלבד)
`generateDraft` מקבל **אך ורק את ה-mapping** — לא את מאגר הידע החופשי.
כל דרישה עם `hasSource=false` מייצרת סקשן `needsManual=true` עם `body` ריק.
כך "אפס-הזיות" מובטח ברמת הממשק — גם ה-stub מכבד אותו, ו-Claude יורש את ההבטחה.

---

## ארכיטקטורה

```
/prototype/index.html      ← החזית הקיימת (מוזרקת ב-fetch במקום מערכים קשיחים)
/prototype/api.js          ← שכבת קריאות דקה ל-backend (חדש)
/server
  package.json
  .env.example             ← ENGINE=stub | ANTHROPIC_API_KEY=
  /src
    index.js               ← Express: routes + הגשה סטטית של /prototype
    /data
      store.js             ← Repository layer (JSON-store בפריטי → ניתן להחליף ל-SQLite/PG)
      schema.js            ← ישויות ואתחול
    /engine
      index.js             ← factory: בוחר stub|claude לפי env
      provider.js          ← עטיפת Claude (קורא ANTHROPIC_API_KEY) — פעיל בשלב 5
      /stub/*.js           ← 5 פונקציות החוזה, דטרמיניסטיות
      /claude/*.js         ← אותן 5 פונקציות, שלד שזורק "no key" עד שלב 5
    /routes
      documents.js  knowledge.js  tenders.js  drafts.js
    /export
      docx.js  pdf.js      ← יצירת Word/PDF אמיתיים
  /uploads                 ← קבצים שהועלו (disk)
```

**בחירות טכניות (כולן npm, רצות על Windows, ללא Python):**
Node 18+ · Express · multer (העלאה) · pdf-parse · mammoth (DOCX) · xlsx · docx · pdfkit · @anthropic-ai/sdk (שלב 5).
אחסון בפריטי: JSON-store מאחורי Repository layer — **אפס תלויות native**, `npm install && npm start` נקי. ניתן להחליף ל-SQLite/Postgres מאחורי אותה שכבה בלי לגעת ב-routes.

---

## מודל נתונים (ישויות)

```
company        (id, name, reg_no)                          ← single-tenant ב-MVP
document       (id, filename, path, kind, status, created_at)
project        (id, name, year, source_doc_id)
dimension      (id, project_id, label, kind)               ← ה-chips
certification  (id, name, valid_until, status)
tender         (id, code, name, issuer, deadline, raw_text, status, match_score, source_doc_id)
requirement    (id, tender_id, text, category, status)     ← met | gap | fail
mapping        (id, tender_id, requirement_id, project_id, dimension_ids, has_source)
draft          (id, tender_id, status)
draft_section  (id, draft_id, title, body, confidence, source_project_id, needs_manual)
outcome        (id, tender_id, result, reason)             ← win | lose | pending (S10)
```

---

## שלבים

### שלב 0 — תשתית (השלד רץ, עדיין "טיפש")
- Scaffold `/server`: Express, store, engine factory, חוזים, `.env.example`.
- `store.js` + `schema.js` — אתחול ישויות.
- `/engine/stub/*` מחזיר **בדיוק את נתוני הדמו** שכיום קשיחים בפרוטוטייפ (parity מיידי).
- `/engine/claude/*` — שלד שזורק שגיאה מסודרת "ENGINE=claude requires ANTHROPIC_API_KEY".
- הגשת `/prototype` סטטית; חיווט endpoint ראשון (pipeline של הדשבורד) ל-API.
- **תוצאה:** `npm start` → הדשבורד נטען, אך הנתונים מגיעים מה-API.

### שלב 1 — מאגר ידע אמיתי (Ingestion)
- העלאת קובץ אמיתי → disk. חילוץ טקסט אמיתי: pdf-parse / mammoth / xlsx.
- `extractKnowledge` (stub): חילוץ דטרמיניסטי-היוריסטי (שנים, "N רשויות", שמות אישורים) → ממדים מובנים **בלי מפתח**. זו "חריץ המנוע" ש-Claude ימלא בשלב 5.
- חיווט מסכי Upload (S02) + Review (S03) + מאגר ידע (KB) ל-API + persistence. עריכה/הוספה נשמרות.
- **תוצאה:** מעלים PDF אמיתי של החברה → רואים פרויקטים/ממדים שנשמרו, ניתנים לעריכה.

### שלב 2 — קליטת מכרז + ניתוח (Intake + Match)
- הזנת מכרז (S06: העלאה/הדבקה) → חילוץ טקסט → `parseTender` (stub: פיצול דרישות היוריסטי) → נשמר.
- `analyzeMatch` (stub: חפיפת מילות-מפתח בין דרישות לממדים → met/gap/fail + ציון). דטרמיניסטי ומוסבר.
- חיווט Tender-new + Tender-analysis למכרז אמיתי; pipeline הדשבורד מה-DB.
- **תוצאה:** מדביקים מכרז אמיתי → מקבלים רשימת דרישות + ציון התאמה מחושב + ניתוח פערים מול הידע שלך.

### שלב 3 — מיפוי + טיוטה + הורדה (הבידול)
- `buildMapping`: לכל דרישה — הפרויקט/הממדים התואמים ביותר + דגל `hasSource`.
- `generateDraft` (stub: תבנית לכל סקשן ממלאת עובדות ממופות; חסר → `needsManual`, body ריק). ציון ביטחון = היוריסטיקת כיסוי.
- חיווט draft-mapping (S08) + tender-draft (S09).
- ייצוא **אמיתי**: הורדת `.docx` (docx) ו-`.pdf` (pdfkit) עם תגיות מקור וסימוני השלמה-ידנית.
- **תוצאה:** מסע שלם מקצה-לקצה — מזינים מכרז → מורידים Word עם ציטוט מקור לכל פסקה.

### שלב 4 — לולאת למידה + ליטוש
- S10 (Post-Submission): העלאת הגשה בפועל + תוצאה (זכינו/נפסלנו/ממתין) → נשמר, מזין את הידע.
- תיקון ה-Docs-drift שזוהה: עדכון BACKLOG (B06/B07 בנויים), SCREENS (S05), הפניות שבורות ב-METHODOLOGY.
- איחוד ציון ההתאמה למקור-אמת יחיד (כיום 78%/94% סותרים לאותו מכרז).

### שלב 5 — חיבור Claude האמיתי ✅ נבנה בקוד (2026-08-05)
- ✅ `/engine/claude/*` מומש: `provider.js` (SDK, JSON מובנה, קלט לא-מהימן עטוף) + 6 פונקציות החוזה. `ENGINE=claude` + מפתח → בלי שינוי בחזית.
- ✅ **גמישות מכרזית כליבה**: buildMapping מוצא התאמות סמוכות + `bridge` (relevance='adjacent'), עם עיגון קשיח מול המאגר.
- ✅ ולידציה לאחר-יצירה: `guardrail.js` (`enforceDraft`) — שומר דטרמיניסטי שמנטרל כל עובדה קשיחה ללא מקור ממופה. רץ בכל מנוע.
- ⏳ נותר להפעלה: `npm i @anthropic-ai/sdk` + `ANTHROPIC_API_KEY` + `ENGINE=claude`, ואימות בדפדפן.

### שלב 6 — מודיעין מכרז (מניתוח BIDO) ✅ נבנה (2026-08-05)
> מקור: `01-research/COMPETITOR-BIDO.md`. מטרה: מסך ניתוח (S07) מעל bido.ai.
- ✅ `checkThresholds(rawText, company)` — stub+claude. הצלבת תנאי-סף מול פרופיל החברה.
- ✅ `checkRedFlags(rawText)` — stub+claude. מלכודות: פסילת-הנחה, קנסות, מפגש חובה, מגביל-תחרות.
- ✅ `parseTender` מובנה — code/issuer/deadline/**ערבות**/סיווג/מחזור-מינימלי/משך כשדות על ה-tender.
- ✅ חזית: כרטיס "סיכום מכרז" + "בדיקת תנאי סף" + "דגלים אדומים" במסך הניתוח.
- **אפס-הזיות נשמר**: הכל מעוגן בטקסט המכרז/הפרופיל; אין המצאה. אומת בדפדפן. (B10-B11 ✅)

---

## מה נשאר בחוץ (עקבי ל-MVP.md)
אימות משתמשים מלא · multi-tenant · אינטגרציות חיות · autofill לפורטלים · ניתוח מתחרים.
כולם Phase 2/3 — השלד לא חוסם אותם (Repository layer + Provider abstraction פתוחים להרחבה).

---

*גרסה: 1.0 | עודכן: 2026-07-28*
