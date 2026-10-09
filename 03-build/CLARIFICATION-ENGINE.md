# CLARIFICATION-ENGINE.md — שכבת Qualification + Clarification

> 2026-10-07. מענה לשאלת המחקר "Clarification Engine" + אפיון יישום מול הקוד הקיים.
> מקורות: מחברת NotebookLM "מחקר מערכות מכרזים" (ראה [[RESEARCH-LEARNINGS]]) + סקירת `server/src`.
> תוויות: [Fact] אומת במקור · [Vendor] טענת ספק · [Inference] מסקנה שלי · [Not found] לא נמצא במחקר.

---

## 0. תשובה קצרה

1. **הדפוס קיים בשוק, אבל חלקי.** מערכות מובילות יודעות *לייצר* שאלות הבהרה לעורך המכרז ו*לסמן* מידע חסר. **[Not found]** לא נמצא אצל אף מתחרה (גלובלי או ישראלי) מנגנון שבו **תשובה פנימית של הספק מעדכנת אוטומטית את החלטת ה-Go/No-Go**, ולא מנגנון assumption tracking מפורש. זה החלון של UC TENDER.
2. **הדרך למנוע החלטה כפויה היא ארכיטקטונית, לא פרומפט:** ה-Gate מחושב בקוד מסטטוסי הדרישות; ה-LLM לא מוציא GO; ברירת המחדל לחוסר מידע היא Unknown; ו-GO למרות אי-ודאות דורש **קבלת-סיכון מפורשת של אדם**, שנשמרת כאובייקט.
3. **תיקון אחד לאפיון:** "Eligibility Score" צריך להיות **Eligibility Status** (PASS / CONDITIONAL / HOLD / FAIL), לא ציון. ציון ממצע — ותנאי-סף אחד פוסל גם ב-95%.

---

## 1. מה השוק עושה היום (ממצאי המחקר)

| יכולת | מי | מה בדיוק | הערכה |
|---|---|---|---|
| Clarification questions לעורך המכרז | **Responsive** [Fact] | יצירת שאלות ברמת שאלה/פרויקט, ריכוז, ייצוא ל-Excel, ייבוא תשובות בחזרה; גם risk assessment | הוכחה שה-workflow אמיתי. **חיצוני בלבד.** |
| Handoff לאדם כשאין מקור | **AutoRFP** [Vendor] | כשהמערכת לא מוצאת מקור — מעבירה לאדם; audit trail | human-in-the-loop בסיסי |
| "לא לנחש" | **BIDO FLOW** [Vendor] | כשהמערכת לא בטוחה — מסמנת לבדיקה במקום לנחש; קישור למקור | BIDO מבינה את העיקרון |
| עומד / לא עומד / מידע חסר | **TenderAce** [Vendor] | השוואה מול Business Profile; "מידע חסר מסומן ולא מומצא" | tri-state קיים בישראל |
| שאלות הבהרה → פעולה | **Lictorium** [Vendor] | workflow שבו שאלות הבהרה הופכות לפעולה; ציטוט סעיף+עמוד | הכי קרוב חיצונית |
| קריאת תשובות הבהרה + שינויי מועדים/תנאים | **BidPilot** [Vendor] | מזהה שינויים שהבהרות יצרו | צד ה-issuer של הלולאה |
| Compliance matrix מתעדכנת עם amendments | **GovDash** [Fact] | המטריצה מתעדכנת מול תיקוני מכרז | change impact |
| Strict RAG — "אני לא יודע" | ספרות אקדמית (מקור 3) | המודל חייב להשיב "לא יודע" כשאין מידע | עיקרון, לא מוצר |
| Assumption tracking / Risk acceptance | — | **[Not found]** כיכולת מוצר מפורשת | הזדמנות |
| Internal supplier clarification שמעדכן Go/No-Go | — | **[Not found]** אצל BIDO, TenderAce, BidPilot, Lictorium (בפרסומים) | **הבידול** |

**למה זה קריטי בישראל [Fact]:** הבהרות משנות בפועל תנאי-סף ומועדים — במכרז המסלקה הפנסיונית 5/2025 פורסמו 400+ שאלות בשני סבבים; בביטוח לאומי שונה תנאי-סף כספי והמועד נדחה; באיכילוב פורסם "עדכון תנאי סף ומועדים". ה-Clarification הוא חלק מה-core workflow, לא edge case.

---

## 2. הסטטוסים — ומי רשאי להזיז אותם

האפיון מגדיר 4 סטטוסים. במודל הנתונים צריך 6 (ב-UI אפשר להציג 4):

| סטטוס פנימי | מוצג כ- | משמעות |
|---|---|---|
| `met_verified` | Met | יש Fact מאומת + ראיה שעוברת בדיקה דטרמיניסטית |
| `met_claimed` | Met (ממתין לראיה) | המשתמש אמר "כן" / פרופיל-הצהרה — **אין עדיין מסמך** |
| `not_met` | Not Met | ראיה שהחברה לא עומדת (או תשובה "לא") |
| `unknown_company` | Unknown | חסר מידע אצל החברה |
| `unknown_tender` | Needs Clarification | המכרז עמום / סותר / חסר |
| `needs_clarification` | Needs Clarification | נוצרה שאלה ממתינה (פנימית או לעורך) |

**מכונת מצבים — הכלל המרכזי: אין מעבר אוטומטי ל-Met.**

```
unknown_* ──שאלה──▶ needs_clarification
needs_clarification ──"כן" מהמשתמש──▶ met_claimed ──העלאת ראיה+בדיקה──▶ met_verified
needs_clarification ──"לא"──▶ not_met
needs_clarification ──"לא יודע"/אין מענה──▶ נשאר needs_clarification
needs_clarification(issuer) ──תשובת עורך המכרז──▶ עדכון ה-rule של הדרישה → הערכה מחדש מלאה
met_verified ──ראיה פגה / גרסת מכרז חדשה──▶ unknown_company / הערכה מחדש
```

| מי | רשאי לקבוע |
|---|---|
| **קוד דטרמיניסטי** (השוואת rule מול Fact) | `met_verified`, `not_met` |
| **משתמש** | `met_claimed`, `not_met`, קבלת-סיכון |
| **LLM** | רק *להציע*: פענוח דרישה, זיהוי עמימות, ניסוח שאלה, הסבר. **לעולם לא** `met_*` לתנאי-סף |

---

## 3. זיהוי: מתי לעצור ולשאול

### 3.1 צד המכרז (`unknown_tender`) — שאלה לעורך המכרז
| טריגר | דוגמה | זיהוי |
|---|---|---|
| מונח לא מוגדר | "פרויקטים **דומים**", "היקף **משמעותי**" | regex + LLM |
| תקופה בלי עוגן | "5 השנים האחרונות" — עד מועד ההגשה? מתחילה או סיום? | rule חלקי (period בלי anchor) |
| כמות/היקף חסר | "ניסיון בפרויקטים בהיקף גדול" בלי ₪ | rule בלי threshold |
| סתירה בין מסמכים | חוברת אומרת 3 פרויקטים, נספח אומר 5 | השוואת requirements בין מסמכים |
| מידע חסר במכרז | ערבות נדרשת בלי סכום/תוקף | שדה חובה ריק ב-rule |
| ספק מכהן / תנאי מגביל תחרות | "היכרות עם המערכת הקיימת" | קיים היום ב-`checkRedFlags` |

### 3.2 צד הספק (`unknown_company`) — שאלה פנימית
| טריגר | דוגמה | למי |
|---|---|---|
| `missing_fact` | אין בפספורט פרויקט שעומד בחלון הזמן | Bid manager / SME |
| `missing_evidence` | יש טענה על פרויקט, אין אישור ביצוע עם היקף | בעל המסמך |
| `expired_evidence` | אישור ניהול ספרים פג לפני מועד ההגשה | כספים |
| `commitment` | "נוכל להעמיד מנהל פרויקט 100%?" · "ערבות ₪500K?" · "לו״ז?" | HR / כספים / הנהלה |
| `partner` | "יש שותף/קבלן משנה שמשלים את הדרישה?" | הנהלה |
| `conflict` | שני מסמכים עם היקף שונה לאותו פרויקט | Bid manager |

**עדיפות:** deterministic first (rule חסר שדה, Fact חסר, תוקף) → LLM רק לעמימות סמנטית.

---

## 4. אובייקט ה-Clarification

```js
{
  id, tender_id,
  requirement_ids: [],            // מקושרת לדרישה ספציפית — חובה
  target: 'internal' | 'issuer',
  trigger: 'ambiguity' | 'conflict' | 'missing_tender_info' |
           'missing_fact' | 'missing_evidence' | 'expired_evidence' | 'commitment' | 'partner',
  question: 'קצרה וממוקדת',
  why_it_matters: 'בלי תשובה חיובית סעיף 4.2 נשאר HOLD ולכן לא ניתן להמליץ GO.',
  decision_impact: 'flips_gate' | 'affects_score' | 'informational',
  source: { document, clause: '4.2.3', page: 17, quote: '...' },
  answer_kind: 'yes_no' | 'number' | 'date' | 'upload' | 'free',
  assignee, due_date,            // issuer: לפני מועד אחרון לשאלות הבהרה!
  status: 'open' | 'answered' | 'evidence_requested' | 'resolved' | 'unresolved' | 'sent_to_issuer',
  answer, answer_source: 'user_statement' | 'evidence_upload' | 'issuer_answer',
  evidence_fact_ids: [],
  assessment_before, assessment_after,   // סטטוס ה-Gate לפני/אחרי — שקיפות + למידה
  created_by: 'system' | 'ai' | 'human'
}
```

**שאלה לעורך המכרז — נוסח מוכן להגשה** (לא "מצאתי סעיף לא ברור"):
> **סעיף 4.2.3** — "שלושה פרויקטים דומים בחמש השנים האחרונות".
> **השפעה:** פרויקט A של החברה תלוי בפרשנות; בלעדיו יש רק 2 פרויקטים → FAIL.
> **שאלה מוצעת:** "נא להבהיר האם לצורך סעיף 4.2.3 ייחשב פרויקט שמועד סיומו חל בחמש השנים שקדמו למועד האחרון להגשה, אף שמועד תחילתו מוקדם יותר."

ייצוא: רשימת שאלות issuer כ-Word/Excel לפי פורמט ועדת המכרזים, לפני מועד השאלות.

---

## 5. מה קורה אחרי תשובה

| תשובה | אפקט |
|---|---|
| "כן" (הצהרה) | → `met_claimed` + נוצרת אוטומטית בקשת ראיה (`evidence_requested`). **ה-Gate לא הופך PASS — לכל היותר CONDITIONAL.** |
| העלאת מסמך | חילוץ Fact → **אישור משתמש** → בדיקה דטרמיניסטית מול ה-rule → `met_verified` או `not_met` |
| "לא" | → `not_met`; אם הדרישה `fatal` → FAIL (עם `remediable_before_deadline` אם רלוונטי) |
| "לא יודע" / אין מענה עד ה-due | נשאר `needs_clarification`. **שום הנחה.** |
| שותף/קבלן משנה | → `met_claimed` + `dependency` (סיכון) + בקשת מסמך שותף |
| תשובת עורך המכרז | עדכון `normalized_rule` של הדרישה → **הערכה מחדש של כל הדרישות** (לא רק אחת) |

אחרי כל אחד: חישוב מחדש של Gate, Coverage, Gaps, Risk, והמלצה — עם הצגת "לפני → אחרי":
> "שאלתי את סמנכ״ל הכספים, קיבלתי אישור רו״ח, סעיף 3.1 עבר ל-Met-Verified. ההמלצה עברה מ-HOLD ל-CONDITIONAL GO."

---

## 6. ההחלטה: Gate, לא ציון

```
FAIL         ← לפחות דרישת-סף אחת not_met
HOLD         ← אין FAIL, ולפחות דרישת-סף אחת unknown / needs_clarification
CONDITIONAL  ← כל דרישות-הסף met, אבל לפחות אחת met_claimed (ראיה חסרה)
PASS         ← כל דרישות-הסף met_verified
```

מוצג יחד (לא מתערבב):
- **Eligibility Status** — ה-Gate (ראשי, בראש המסך).
- **Evidence Coverage** — % דרישות שהוכרעו עם ראיה מאומתת.
- **Match / Opportunity Score** — כדאיות; מוצג רק ב-PASS/CONDITIONAL או אחרי קבלת סיכון.
- **Missing Evidence · Critical Gaps · Risks · Required Actions** — כל אחד עם `source` (סעיף/עמוד במכרז + Fact/מסמך אצל החברה).

---

## 7. איך מונעים החלטה כפויה — 8 כללים

1. **ה-Gate מחושב, לא מיוצר.** פונקציה טהורה מסטטוסי הדרישות. אין שדה `recommendation` שה-LLM ממלא.
2. **ברירת מחדל = Unknown.** כל שדה חסר, rule חלקי או Fact לא מאומת → unknown. אין "met by default" (היום: מחזור כספי מסומן met אם השדה לא ריק — לתקן).
3. **ל-LLM אין הרשאת met לתנאי-סף.** הוא מפענח ומנסח; ההכרעה דטרמיניסטית. גמישות מכרזית — לדרישות איכות/ניקוד בלבד.
4. **GO תחת אי-ודאות = קבלת-סיכון מפורשת.** במצב HOLD, הכפתור הוא "המשך למרות X פתוחים" → נוצר אובייקט:
   ```js
   risk_acceptance { tender_id, requirement_ids, reason, accepted_by, accepted_at, assumption: 'מניחים שהפרויקט ייחשב דומה' }
   ```
   מופיע בדוח ההחלטה, בחבילת ההגשה, ונשמר ל-outcome (כך לומדים: כמה קבלות-סיכון הסתיימו בפסילה). זה ה-**assumption tracking** שלא נמצא בשוק.
5. **אין ירוק ב-HOLD.** ה-UI לא מציג ציון גבוה או צבע ירוק כשה-Gate HOLD/FAIL. ה-Gate מעל הציון, תמיד.
6. **תקציב שאלות.** רק שאלות שיכולות **להפוך את ה-Gate** (`decision_impact: flips_gate`) מוצגות קודם; ממוינות לפי fatal → deadline → מאמץ. 5–7 בסבב ראשון. (סיכון שהמחקר מציין: AI מייצר שאלות מיותרות → users לא עונים.)
7. **מודעות למועדים.** שאלות issuer מוגבלות למועד האחרון לשאלות הבהרה; אחרי המועד → הופכות לסיכון, לא לשאלה.
8. **מדידה.** לכל מכרז: כמה Unknown נפתחו/נסגרו, כמה שאלות שינו החלטה, כמה קבלות-סיכון → פסילה. **False Met = 0** כיעד תפעולי.

---

## 8. מה קיים היום בקוד ומה חסר

| קיים | איפה | מצב |
|---|---|---|
| `status: 'unknown'` בבדיקות-סף | `engine/*/checkThresholds` | ✅ בסיס טוב |
| השלמה ידנית לפער | `POST /tenders/:id/requirements/:rid/resolve` | 🟡 היום = resolved; צריך = `met_claimed` |
| כפתור "+ הוסף לפרופיל" על unknown | פרוטוטייפ | 🟡 זה כבר "שאלה פנימית" בסיסית — להפוך לאובייקט |
| "שקול שאלת הבהרה" בדגל תנאי מגביל | `checkRedFlags` | 🟡 טקסט בלבד, לא אובייקט |
| `go_decision = score >= 60` | `learning/index.js` | 🔴 להחליף ב-Gate |
| met מחזור בלי השוואה · overlap≥1 → met | `checkThresholds`, `stub analyzeMatch` | 🔴 false Met |
| Clarification object / Gate / risk_acceptance / requirement status מלא | — | ⬜ לבנות |

### יישום בשלבים (מתאים לארכיטקטורה: `records` גנרי + engine stub/claude + guardrail)
1. ✅ **(נבנה 2026-10-07 — ראה CHANGELOG)** **P0 — Gate + סטטוסים:** `requirement.status` (6 ערכים) · `computeGate(requirements)` טהור + טסטים · תיקון false Met · `snapshotPrediction` שומר Gate. *key-free.*
2. **P0 — Clarifications v1 (פנימי):** collection `clarifications` · `engine.detectClarifications(tender, requirements, kb)` — ב-stub: deterministic (unknown סף, Fact חסר, תוקף); ב-claude: + עמימות סמנטית וניסוח · `POST /clarifications/:id/answer` → מעבר סטטוס → חישוב Gate מחדש · טאב "שאלות פתוחות" במסך הניתוח עם "לפני → אחרי".
3. **P1 — Issuer clarifications:** ניסוח שאלה רשמית + קישור סעיף/עמוד · ייצוא Word/Excel · שדה מועד שאלות הבהרה.
4. **P1 — Risk acceptance** + הצגה בדוח ההחלטה ובחבילת ההגשה + הזנה ל-outcome.
5. **P1 — Issuer answers / addenda** → עדכון rule → הערכה מחדש (גשר ל-Amendment Impact Engine).

---

## 9. ה-Core Flow המאושר

```
Tender → Parsing → Qualification → Initial Gate → Clarification Questions
       → Updated Assessment → Gap Analysis → Final Decision (+ Risk Acceptance)
       → Compliance → Response
```
ולא `Tender → Generate Answer`. ה-Response הוא downstream — נכתב רק מ-Facts מאומתים, והשומר הקיים (`guardrail.js`) ממשיך לחסום כל עובדה בלי מקור.

---

*גרסה: 1.0 | 2026-10-07*
