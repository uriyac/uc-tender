# UC TENDER — מתודולוגיית עבודה

> מסמך זה מגדיר את שיטת העבודה בפרויקט: איפה כל מידע נמצא, ומה מעדכנים אחרי כל שינוי.

---

## עקרון מנחה

הסיכון הגדול בעבודה עם AI הוא איבוד הקשר בין סשן לסשן.
הפתרון: **כל שינוי מתבסס על קובץ MD קיים, לא על זיכרון**, וכל שינוי שנבנה מתועד חזרה ב-MD.

> עד 2026-07-30 המערכת נבנתה ב-Lovable. היום היא נבנית **מקומית בקוד** עם Claude Code
> (Node/Express + פרוטוטייפ HTML + אפליקציית Electron). מסמכי תקופת Lovable נמצאים ב-`archive/lovable/`.

---

## מבנה התיקיות

```
מערכת מכרזים/
│
├── METHODOLOGY.md              ← אתה כאן: שיטת העבודה
│
├── 00-foundation/              ← מה המוצר
│   ├── SYSTEM-ALIGNMENT.md     ← ⭐ מקור האמת (בכל סתירה הוא גובר)
│   ├── PRODUCT.md              ← מה המוצר, למי, למה
│   └── MVP.md                  ← מה בפנים, מה בחוץ, KPIs
│
├── 01-research/                ← מחקר שוק ותחרות (BIDO, שחקנים גלובליים)
├── 02-ux/                      ← PERSONAS · UX-FLOWS · SCREENS
│
├── 03-build/                   ← תוכניות ומצב הבנייה
│   ├── PRODUCT-V1.md           ← Definition of Done ל-v1.0 (דסקטופ on-prem)
│   ├── EXECUTION-PLAN.md       ← שלבי הביצוע S0–S7 + סטטוס
│   ├── PRODUCT-REVIEW.md       ← ממצאי סיור המוצר + סדר עדיפויות לשיפור
│   ├── ROADMAP.md              ← MVP / Phase 2 / Phase 3
│   ├── WORK-PLAN.md            ← אסטרטגיה מול bido.ai
│   ├── ENGINE-PLAN.md          ← בניית המנוע (שלבים 0–5)
│   ├── FLEXIBILITY-CAPABILITY.md · S4-LEARNING-LOOP.md · SHARED-LEARNING-SCHEMA.md
│   └── STRATEGY-VS-COMPETITORS.md
│
├── 04-protocol/
│   └── CHANGELOG.md            ← מה נבנה, מתי, ואיך אומת
│
├── server/                     ← backend (Node/Express) + בדיקות (`npm test`)
├── prototype/                  ← הממשק (index.html + api.js)
├── desktop/                    ← אריזת Electron
├── test-data/                  ← חברה פיקטיבית לבדיקות
├── .claude/skills/             ← סקילים של הפרויקט (tender-dev, phase5-claude-engine)
└── archive/lovable/            ← היסטוריה, לא בשימוש
```

---

## לפני כל שינוי

1. **ודא שהסקיל `tender-dev` נטען.** הוא מכיל את מפת הקבצים, חוזה המנוע וכללי אפס-ההזיות.
2. בדוק ב-`03-build/EXECUTION-PLAN.md` או ב-`PRODUCT-REVIEW.md` שהמשימה בסדר העדיפויות הנכון.
3. אם המשימה נוגעת במסך, בדוק ב-`02-ux/SCREENS.md` מה המסך צריך להכיל.

## אחרי כל שינוי

1. הרץ `cd server && npm test`. כל הבדיקות חייבות לעבור.
2. אמת בממשק החי (שרת מקומי + דפדפן) כשהשינוי נראה למשתמש.
3. עדכן את `04-protocol/CHANGELOG.md`: מה נבנה, מה אומת, כמה בדיקות עוברות.
4. עדכן סטטוס במסמך התוכנית הרלוונטי (`EXECUTION-PLAN` / `PRODUCT-REVIEW` / `PRODUCT-V1`).
5. אם התקבלה החלטה חדשה, עדכן את `00-foundation/SYSTEM-ALIGNMENT.md`.
6. שמור ב-Git (commit) עם הודעה שמתארת את השינוי.

---

## עדכון מסמכים: מתי?

| מה קרה | מה לעדכן |
|---------|-----------|
| נבנה או תוקן משהו | `CHANGELOG.md` + סטטוס בתוכנית הרלוונטית |
| החלטת מוצר / שינוי היקף | `SYSTEM-ALIGNMENT.md` (+ `MVP.md` / `ROADMAP.md`) |
| insight חדש ממשתמש או מחקר | `PERSONAS.md` / קובץ ב-`01-research/` |
| מסך חדש | `SCREENS.md` |
| שינוי בארכיטקטורה או בחוזה המנוע | `.claude/skills/tender-dev/SKILL.md` |

---

## כלים

- **Claude Code + סקיל `tender-dev`**: כל עבודת הקוד.
- **gstack** (מותקן גלובלית): `/qa` לבדיקת הממשק בדפדפן, `/review` לבדיקת קוד לפני commit,
  `/investigate` לאיתור תקלות, `/plan-eng-review` לפני פיצ'ר גדול.
  ⚠️ `/ship` ו-`/land-and-deploy` מעלים ל-GitHub. להשתמש רק בכוונה.
- **eval (promptfoo)** — בודק שכל דרישה ש-`parseTender` חילץ באמת נמצאת בטקסט המכרז
  (`locateAll` מ-`sourceSpan.js`). דרישה שלא אותרה נכשלת: זו רשת נגד דרישה שהומצאה.
  לא רץ ב-`npm test` (עם Claude זו קריאת רשת). מתוך `server/`:
  - `npm run eval` — מנוע stub, בלי מפתח. מכרזים A/B/C מ-`test-data` + הפיקסטורה `multi-domain`.
  - `ENGINE=claude npm run eval` — רק כש-`ANTHROPIC_API_KEY` מוגדר ב-`.env`. בלי מפתח אל תגדיר `ENGINE=claude`.

---

*גרסה: 2.1 | עודכן: 2026-11-01 | גרסה 1.0 (תקופת Lovable) מ-2026-07-20*
