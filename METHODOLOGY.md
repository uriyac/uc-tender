# OptiMatch — מתודולוגיית עבודה

> מסמך זה הוא עצמה של שיטת העבודה. כל קובץ אחר ב-`optimatch-docs/` נגזר ממנו.

---

## עקרון מנחה

כשעובדים עם AI builder (Lovable), הסיכון הגדול הוא איבוד הקשר בין פרומפט לפרומפט.
הפתרון: **כל פרומפט ל-Lovable מתבסס על קובץ MD קיים** — לא על זיכרון.

---

## מבנה התיקיות

```
optimatch-docs/
│
├── METHODOLOGY.md          ← אתה כאן — הכלל העליון
│
├── 00-foundation/
│   ├── PRODUCT.md          ← מה המוצר, למי, למה
│   └── MVP.md              ← מה בפנים, מה בחוץ, KPIs
│
├── 01-research/
│   └── *.docx              ← מסמכי מחקר שוק ותחרות (MRD, השוואת פלטפורמות)
│
├── 02-ux/
│   ├── PERSONAS.md         ← 3 פרסונות עם goals + frustrations
│   ├── UX-FLOWS.md         ← מסעות משתמש (actor → action → outcome)
│   └── SCREENS.md          ← inventory של כל מסך + מה בו
│
├── 03-build/
│   ├── BACKLOG.md          ← רשימת פרומפטים מסודרת לפי עדיפות
│   ├── ROADMAP.md          ← מיפוי פיצ'רים ל-MVP/Phase 2/3
│   └── ENGINE-PLAN.md      ← תוכנית בניית המנוע (שלבים 0-5)
│
└── 04-protocol/
    ├── KNOWLEDGE.md        ← ← ← זה נכנס ל-Lovable Project Knowledge
    ├── PROMPT-GUIDE.md     ← איך כותבים פרומפט טוב ל-Lovable
    └── CHANGELOG.md        ← מה נבנה, מתי, ומה השתנה
```

---

## הפרקים — סדר וסטטוס

| # | פרק | תוצר | סטטוס |
|---|-----|-------|--------|
| 0 | Product Foundation | `PRODUCT.md`, `MVP.md` | ✅ הושלם |
| 1 | Research & Insights | `RESEARCH.md` | ✅ הושלם |
| 2 | UX Architecture | `PERSONAS.md`, `UX-FLOWS.md`, `SCREENS.md` | 🔄 בעבודה |
| 3 | Build Plan | `BACKLOG.md`, `DATA.md` | ⏳ ממתין |
| 4 | Lovable Protocol | `KNOWLEDGE.md`, `PROMPT-GUIDE.md`, `CHANGELOG.md` | ⏳ ממתין |

---

## כלל עבודה עם Lovable

### לפני כל פרומפט:
1. בדוק ב-`SCREENS.md` מה המסך הנוכחי צריך להכיל
2. בדוק ב-`BACKLOG.md` שאתה בסדר הנכון
3. ודא ש-`KNOWLEDGE.md` מעודכן ב-Lovable Project Knowledge

### אחרי כל build:
1. עדכן `CHANGELOG.md` — מה נבנה
2. עדכן סטטוס ב-`BACKLOG.md` — mark as done
3. אם נוצרו החלטות חדשות — עדכן `PRODUCT.md` או `MVP.md`

### פרומפט טוב = 3 חלקים:
```
[הקשר] — מה כבר קיים / מה אנחנו בונים
[דרישה] — מה בדיוק אני רוצה עכשיו
[מגבלות] — מה לא לגעת בו
```

---

## עדכון מסמכים — מתי?

| מה קרה | מה לעדכן |
|---------|-----------|
| החלטת שינוי MVP | `MVP.md` |
| insight חדש ממשתמש | `PERSONAS.md` + `RESEARCH.md` |
| מסך חדש התווסף | `SCREENS.md` + `BACKLOG.md` |
| build הושלם ב-Lovable | `CHANGELOG.md` |
| השתנה הקשר הפרויקט | `KNOWLEDGE.md` → עדכן ב-Lovable |

---

*גרסה: 1.0 | עודכן: 2026-07-20*
