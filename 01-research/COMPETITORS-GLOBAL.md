# COMPETITORS-GLOBAL.md — ניתוח-עומק של המתחרים הגלובליים החזקים

> מחקר 2026-09-22. חמש המערכות המוכחות ביותר (אלגוריתם + אימוץ) בתחום מכרזים/הצעות AI.
> לכל אחת: איך המערכת והאלגוריתם עובדים · חוזקות · חולשות · מה ללמוד ואיך מנצחים.
> נגזר מ-[COMPETITOR-BIDO.md](COMPETITOR-BIDO.md). המתחרה המקומי הישיר נשאר bido.ai.

---

## תמונת-על — שלושה תפקידים, ואיפה כל אחת יושבת
מערכת מכרזים שלמה עושה 3 דברים: **(1) גילוי** הזדמנויות · **(2) ניתוח** (סיכונים/תנאי-סף/התאמה) · **(3) מענה** (טיוטה/טפסים).
רובן מתמחות ב-1–2. הטבלה:

| מערכת | גילוי | ניתוח | מענה | מודל | קהל |
|--------|:---:|:---:|:---:|------|-----|
| **Responsive** (RFPIO) | — | ◐ | ✅ | ספריית-תוכן ארגונית | Enterprise B2B |
| **AutogenAI** | ◐ | ◐ | ✅✅ | LLM-native drafting | Enterprise/Gov |
| **Sweetspot** | ✅ | ✅ | ✅ | capture end-to-end | GovCon US (SMB) |
| **Thalamus AI** | ◐ | ✅ | ✅ | lifecycle + למידה | Enterprise bid-teams |
| **Deltek GovWin IQ** | ✅✅ | — | — | מודיעין-שוק | GovCon US (Enterprise) |

---

## 1. Responsive (לשעבר RFPIO) — הבנצ'מרק
**איך זה עובד:** לב המערכת הוא **ספריית-תוכן ארגונית** (Q&A מאושרות). כשמגיע RFP/DDQ/שאלון,
ה-AI **מפרק את הדרישות** ו**מושך תשובות מהספרייה** (LookUp) → טיוטה + workflow שיתופי. "80% מהר יותר".
- **TRACE Score™** — מדד-ביטחון קנייני שמאמת תוכן שנוצר מול "מקורות מהימנים" ומסמן בעיות תאימות (accuracy/relevance/traceability).
- 20+ אינטגרציות, 75+ APIs, Trust Center לממשל.

**חוזקות:** מוביל-שוק בהיקף ובאימוץ (Microsoft: 17M$ נחסך, 21K שעות). ספריית-תוכן וממשל הכי בשלים.
**חולשות (מ-G2):**
- 🔴 **התוכן מגיע מספרייה שמתוחזקת ידנית — לא מידע ארגוני נלמד.** דורש תחזוקה מתמדת (הכאב המבני מס' 1).
- חיפוש **תלוי מילות-מפתח**; אנליטיקה חלשה; UI עמוס (legacy מול חדש); learning curve; תמחור אנטרפרייז.

**מה ללמוד / איך מנצחים:** ה-TRACE Score מוכיח שהשוק **רוצה** מדד-אמינות — אבל אצלם זה *ציון*, אצלנו **אכיפה דטרמיניסטית בקוד** (guardrail). המוט שלנו — **זיכרון שלומד** — תוקף ישירות את "ספרייה מתוחזקת ידנית".

---

## 2. AutogenAI — האלגוריתם החזק ביותר בניסוח
**איך זה עובד:** לכל לקוח **"language engine" מותאם** — מנוע LLM שאומן/כויל על קורפוס הלקוח + טון-המותג,
עם knowledge graph לשליפת ראיות. Workflow: Qualify/Extract → Manage → Write → Research → Review.
"institutional knowledge that compounds with every pursuit". FedRAMP High (היחיד למחזור-חיים מלא).

**חוזקות:** ניסוח מהפסקה הראשונה ברמה גבוהה, win-themes, מהירות (70% drafting, 241% success לטענתם).
G2 4.3/5, פרסי "Best ROI / Fastest Implementation / Best Support". הכי ממומן ב-AI-native.
**חולשות (מביקורות):**
- 🔴 **הזיות** — "gateway references not accurate"; **אימות-תוכן מוגבל** → סיכון ב-RFP טכני/רגולטורי.
- אין יצירת גרפיקה/צ'ארטים (שובר workflow); version-control ידני בעבודה מרובת-משתתפים.
- תמחור אנטרפרייז אטום, מינ' 5 מושבים, דמי-onboarding, **הכל non-refundable**.

**מה ללמוד / איך מנצחים:** הם הכי חזקים בניסוח — **שם לא ננצח** ב-key-free. אבל **ההזיות שלהם הן בדיוק הפער שלנו**:
אפילו המנוע החזק בשוק ממציא references. **אפס-הזיות-עם-מקור, אכוף בקוד**, הוא הבידול שהם לא נותנים.

---

## 3. Sheetspot / **Sweetspot** — התאום הפונקציונלי שלנו (capture)
**איך זה עובד:** end-to-end ל-GovCon: **גילוי** מ-SAM.gov/USAspending/FPDS + 1,000+ מקורות state/local;
**התאמת-יכולות** — מנתח הצעות-עבר, capability statements וביוגרפיות, ו**"ממפה את היכולות שלך" להזדמנויות לפי past-performance** (לא חיפוש-מילים סטטי);
**"shred and draft"** קנייני — מפרק RFP למטריצות תאימות + טיוטת pink-team בדקות. ניטור agentic, 167M+ awards.

**חוזקות:** מאחד גילוי+capture+מענה; **התאמה לפי יכולות אמיתיות** (בדיוק המוט שלנו: זיכרון+גמישות); YC, מהיר-צמיחה, מיקוד SMB.
**חולשות:** צעיר יחסית (פחות מוכח מ-Responsive/GovWin); **נעול ל-GovCon אמריקאי** (SAM.gov וכו') — לא רלוונטי לישראל; דורש past-performance איכותי כדי לעבוד.

**מה ללמוד / איך מנצחים:** הכי דומה לנו רעיונית — **"shred and draft" = parseTender+generateDraft שלנו**, "capability mapping = buildMapping+גמישות שלנו". ללמוד את ה-UX של ההתאמה. הפער שלנו: **עברית/ישראל + אפס-הזיות + on-prem** שהם לא מכסים.

---

## 4. Thalamus AI — התאום של לולאת-הלמידה שלנו
**איך זה עובד:** מחזור-חיים 8-שלבי (Capture→Plan→Qualify→Coordinate→Track→Respond→Win→**Learn**).
הלב: **"structured institutional memory graph"** — לוכד החלטות, תיקונים, פידבק-סוקרים, זכיות והפסדים;
הידע **מצטבר בין הגשות** → מזין **bid/no-bid scoring**, ו**winning themes + העדפות-סוקר מאומנים** לתשובות הבאות.
**AI Clarification Register** (חוזה עמימויות-קונה), מטריצות-תאימות (מפורש+מרומז), זיהוי-סיכונים לפי היסטוריה.

**חוזקות:** מחזור-חיים מלא; **הלמידה-המוסדית = בדיוק S4 שלנו** (כיול ניבוי + מסגור-שזוכה מועדף); מיצוב "lifecycle לא writing".
**חולשות:** צעיר/פחות מוכח באימוץ; ה-graph דורש נפח-נתונים כדי להבשיל (כמו הכיול שלנו); אין תמחור גלוי.

**מה ללמוד / איך מנצחים:** זו **האמת של הכיוון שלנו** — memory-graph של win/loss שמזין bid/no-bid. ללמוד את המבנה שלהם ל-S4.3 (כיול) ו-S4 (זיכרון-מפרסם). הפער שלנו: אפס-הזיות אכוף + עברית + on-prem פרטי.

---

## 5. Deltek GovWin IQ — סטנדרט מודיעין-השוק
**איך זה עובד:** בסיס-נתונים ענק של הזדמנויות פדרליות/SLED עם **מחקר היסטורי ו-incumbent עמוק**; "research-first" עם AI מעל. גילוי/מעקב בלבד — **לא כותב הצעות**.
**חוזקות:** עומק-הנתונים ההיסטורי הכי טוב; חיפוש חזק.
**חולשות (מ-Capterra):** 🔴 **יקר מאוד** ($20K–$60K+/שנה, primes שש-ספרתי; העלאות 8-15%/שנה, auto-renew); **איכות-דאטה** (כפילויות, ערכי-placeholder, הזדמנויות "מתות"); UI מיושן, בלי מובייל; contact-data דל; **גילוי בלבד** (בלי ניתוח/מענה).

**מה ללמוד / איך מנצחים:** לא מתחרה ישיר (גילוי בלבד, US). הלקח: **עומק-דאטה = חפיר**, אבל המחיר והדאטה-הגולמי פותחים פתח למוצר זול+מדויק+ממוקד-פעולה.

---

## סינתזה — החולשות המשותפות = הפתחים שלנו

**1. 🔴 "ספרייה מתוחזקת ידנית" — הכאב המבני של כל השוק.**
Responsive/Loopio: התוכן ידני, לא נלמד; חיפוש תלוי-מילים; תחזוקה אינסופית. → **המוט שלנו: זיכרון שמצטבר ולומד מכל הגשה.**

**2. 🔴 הזיות — סיכון אוניברסלי, אפילו אצל המנוע החזק.**
AutogenAI ממציא references; Responsive נאלץ להמציא "TRACE Score" כתגובה. → **אפס-הזיות אכוף בקוד + ציטוט-מקור** הוא בידול אמיתי ומגן-מפסילה, לא "ציון".

**3. 🔴 תמחור אנטרפרייז אטום ויקר.**
כולן: "contact sales", מינימום-מושבים, non-refundable, עשרות-אלפי $. → **פתח ל-SMB**: תמחור שקוף (bido ₪99–990) לקבלנים ישראלים שמתומחרים החוצה.

**4. 🟡 שתיים מתכנסות למוטים שלנו — אזהרה + אימות.**
Sweetspot (capability-matching) ו-Thalamus (memory-graph של win/loss) עושות בדיוק את הגמישות+הלמידה שלנו — **מוכיח שהכיוון נכון**, אבל חייבים לרוץ מהר על מה שהן *לא* מכסות: **עברית/מכרזים ישראליים + אפס-הזיות אכוף + on-prem פרטי**.

## שלוש מסקנות אסטרטגיות
1. **לא לנצח בניסוח** (AutogenAI) ולא ב**עומק-דאטה** (GovWin) — לנצח ב**אמון (אפס-הזיות) + זיכרון-שלומד + מיקוד ישראלי/on-prem**.
2. **הזיכרון והלמידה הם ה-moat הנכון** — Sweetspot+Thalamus מאמתים; לבנות S4 מהר.
3. **תמחור שקוף ל-SMB** — כל השוק הגלובלי יקר ואטום; זה פתח.

## מקורות
- Responsive: [product](https://www.responsive.io/product) · [G2 pros/cons](https://www.g2.com/products/responsive-formerly-rfpio/reviews?qs=pros-and-cons) · [Tribble review](https://tribble.ai/blog/responsive-rfpio-review-pricing-features-limitations-2026/)
- AutogenAI: [site](https://autogenai.com) · [G2](https://www.g2.com/products/autogenai/reviews) · [SiftHub review](https://www.sifthub.io/blog/autogenai-pricing-features-reviews)
- Sweetspot: [site](https://www.sweetspot.so/) · [GovCon tools](https://www.sweetspot.so/blog/govcon-ai-tools-small-business-federal-contractors/)
- Thalamus AI: [site](https://thalamushq.ai) · [best AI RFP](https://thalamushq.ai/blogs/best-ai-rfp-software)
- Deltek GovWin IQ: [Capterra reviews](https://www.capterra.com/p/154858/GovWin-IQ/reviews/) · [TechnoMile capture comparison](https://technomile.com/resources/best-ai-capture-management-platforms-government-contractors-2026-comparison)

*גרסה: 1.0 | 2026-09-22*
