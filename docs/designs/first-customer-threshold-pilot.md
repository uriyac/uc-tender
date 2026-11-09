# תכנון: הלקוח הראשון — בדיקת תנאי סף על מכרז חי

נוצר ב-/office-hours, 2026-10-07
Branch: main
Repo: uriyac/uc-tender
Status: CANCELLED (הפגישה בוטלה, 2026-11-09)
Mode: Startup

> **⛔ בוטל (עודכן 2026-11-09):** פגישת הפיילוט עם המנכ"ל (יעד 15/10) **בוטלה ולא התקיימה**, כי המערכת עדיין לא עובדת על מכרז אמיתי. קריטריוני ההצלחה שמתוארכים ל-15/10 אינם בתוקף. המסמך נשמר כתיעוד. תאריך פגישה חדש ייקבע רק אחרי שהמערכת תעבוד מקצה לקצה על מכרז אמיתי עם המנוע האמיתי.

## הבעיה
UC TENDER בגרסה 1.0 עובד מקצה לקצה מאז 22 בספטמבר 2026, אבל רק על חברת בדיקה בדויה ועל מנוע דמה (stub). אף אדם מחוץ למייסד לא הריץ עליו מכרז אמיתי. הסיכון המרכזי הוא לא טכני. עוד לא ידוע אם מישהו ישלם, ועל איזה כאב.

## ראיות לביקוש
- היו ראיונות עם חברות ייעוץ. מהם עלה כאב ה"גמישות המכרזית": חברות מוותרות על מכרזים סמוכים כי "זה לא בדיוק אנחנו".
- **הראיה הכי חזקה:** אדם אחד, בעלים או מנכ"ל של חברה קטנה, הסכים לנסות את המוצר כשיהיה מוכן, ו"מחכה". המוצר מוכן כבר כשבועיים והוא עוד לא קיבל אותו.
- אין עדיין: תשלום, התחייבות או שימוש בפועל. הערכה: יש **השערה עם ליד אחד חם**, לא ביקוש מוכח.

## המצב הקיים (המתחרה האמיתי)
המנכ"ל שמחכה "עושה את זה עם מודל AI לשימוש עצמי" (ChatGPT/Claude כללי). המשמעות: הבעיה כבר פתורה אצלו "מספיק טוב", בכלי שהוא בחר בעצמו. העלות היא כנראה עשרות שקלים בחודש (הערכה, לא נבדק). כדי שיעבור, UC TENDER צריך לנצח את ה-AI הכללי שלו, לא את BIDO.

המייסד מעריך שה-AI הכללי שלו (1) ממציא נתונים, (2) לא זוכר את החברה בין מכרזים, ו-(3) מפספס תנאי סף. **אבל המייסד סימן גם "לא בטוח מה חסר לו".** אלה הנחות של המייסד, לא מילים של הלקוח.

## משתמש היעד והנתיב הכי צר
- **האדם:** בעלים או מנכ"ל של חברה קטנה שמגישה מכרזים בעצמה. הוא גם הקונה וגם המשתמש.
- **הפרסונה הזו תקפה לסבב 1 בלבד.** מסמכי האסטרטגיה מניחים קונה = סמנכ"ל פיתוח עסקי ומשתמש = מנהל מכרזים בחברה בינונית. אחרי הפגישה מחליטים אם להחליף את פרסונת היעד, ואם כן, מעדכנים את מסמכי האסטרטגיה. עד אז, שום החלטת מוצר לא נשענת על הפרסונה החדשה.
- **הנתיב הכי צר:** מסך תנאי הסף הקיים במוצר, על מכרז שהוא מגיש עכשיו. כל דרישה מסומנת עומד / לא עומד / לא ידוע.

## מגבלות
- מייסד יחיד, לא טכני בכלי פיתוח.
- המנוע האמיתי (Claude) גמור בקוד, וחסר לו רק `ANTHROPIC_API_KEY` + `ENGINE=claude`.
- המוצר משווק כאופליין/on-prem, אבל מנוע Claude שולח תוכן מסמכים לענן של Anthropic. **צריך לגלות את זה ללקוח מראש ולקבל ממנו הסכמה בכתב.**
- **מסך תנאי הסף שכבר קיים** (`prototype/index.html`, טאב "תנאי סף") מראה היום: סטטוס (✓ / ✕ / ?), שם הדרישה, מה יש לחברה, סימון "(מוצהר)" כשהמידע הגיע מהפרופיל ולא ממסמך, וכפתור "+ הוסף לפרופיל". **הוא לא מראה** ציטוט של הסעיף במכרז, עמוד במסמך החברה, או פעולה של "מה להשיג לפני הדדליין". **ואין לו ייצוא.**
- קובץ ה-exe הנייד עובד. המתקין המלוטש (NSIS) תקוע על Developer Mode.

## הנחות (סוכמו במפגש)
1. הצעד הבא הוא שהמנכ"ל שמחכה יריץ מכרז אמיתי שלו עד 15/10, לפני כל פיצ'ר חדש.
2. המתחרה שצריך לנצח הוא ה-AI הכללי שלו. צריך לנצח במקורות, בזיכרון החברה ובבדיקת תנאי סף אמינה. (הבוקר העצמאי ערער על זה. המייסד השאיר את ההנחה כמו שהיא. הפגישה כוללת שאלה שיכולה להפריך אותה, ראו שלב 3.)
3. מפעילים את מנוע Claude לפני שהוא נוגע במוצר. לעולם לא מראים לו את מנוע הדמה.
4. בפגישה צופים בו עובד ולא עושים דמו, כדי לגלות איזה כאב הוא משלם עליו.
5. לא מוסרים לו exe בסבב הזה. הפגישה נעשית על המחשב של המייסד.

## נקודת מבט חיצונית (בוקר Claude עצמאי)
- **החיזוק:** כלי ראשון שמכיר את החברה *שלך*, עם כל עובדה קשורה למסמך מקור, ועונה על "האם מותר לי להגיש, ובאיזו הוכחה?", בעברית. עם הזמן הוא הופך לזיכרון המכרזים של החברה.
- **התובנה:** "לא בטוח מה חסר לו" היא התשובה הכי חושפנית. כל הליבה בנויה על כאבים שהונחו, לא כאבים שנשמעו.
- **ההנחה שערער עליה:** הנחה 2 בוחרת את שדה הקרב לפני שראינו אותו. אם הוא תופס את ההמצאות של ChatGPT בשתי דקות ומעולם לא נפסל על תנאי סף, האימות הוא דבר בסיסי ולא משהו שמשלמים עליו. בנוסף, זיכרון החברה דורש קליטת מסמכים, חיכוך ש-ChatGPT לא מבקש.
- **אב-טיפוס ל-48 שעות:** הפעלה ידנית (concierge) עם המנוע האמיתי, ומסך אחד מצוין של תנאי סף. לדלג על טיוטות, גמישות, מסך הלמידה, קונסולת הניהול והמתקין.

## דרכים שנשקלו
- **A: בדיקת תנאי סף ידנית (נבחרה).** S. מנוע אמיתי, המייסד טוען את מסמכי הלקוח, מסך תנאי סף אחד על מכרז חי.
- **B: פיילוט מלא על המוצר כולו.** M. נדחתה לסבב הראשון: איטית יותר, ויותר דברים יכולים להישבר מול הלקוח היחיד. מועמדת לסבב 2.
- **C: נתיחה של מכרזי עבר.** S. נדחתה כדרך ראשית כי הוא לא נוגע במוצר. מ-A לוקחים ממנה רק את ההשוואה מול ה-ChatGPT שלו, על המכרז הנוכחי. הנתיחה המלאה של מכרזי עבר נשארת כחלופה אם הוא לא מספק מכרז חי (ראו טבלת התוצאות).

## הדרך הנבחרת: A — בדיקת תנאי סף ידנית

**לוח זמנים** (היום: רביעי, 2026-10-07)

| תאריך | מה |
|---|---|
| 07–08/10 | שיחת טלפון לקביעת פגישה. |
| 07–09/10 | במקביל: שלב 0. |
| עד א' 11/10 | המנכ"ל שולח מכרז, מסמכים, צ'אטים ואישור בכתב. |
| 12–13/10 | שלב 2: קליטה ובדיקה ידנית. |
| עד ה' 15/10 | שלב 3: הפגישה. **זה גם המועד של קריטריון ההצלחה.** |

**שלב 0 — הכנה (07–09/10, במקביל לשיחה; עבודה על המנוע, בלי פיצ'רים חדשים)**
1. להפעיל את מנוע Claude במחשב של המייסד בלבד. המפתח עם תקרת הוצאה חודשית, ניתן לביטול, ולעולם לא נכנס לקובץ exe שמופץ. המייסד משלם על השימוש.
2. להריץ את סט המדידה הקיים, ואז 3 מכרזים ציבוריים אמיתיים, כולל אחד סרוק בעברית.
3. **מגבלת זמן: יום עבודה אחד לתיקוני OCR ופענוח.** מה שלא מתוקן עד אז, המייסד מתקן ידנית את הדרישות שחולצו עבור מכרז הפיילוט, ומסמן בפגישה שהן תוקנו ביד. **"פלט גולמי" = הפלט לפני כל תיקון ידני, כולל התיקונים של השלב הזה.** לכן שומרים צילום של החילוץ וההכרעות המקוריים לפני התיקון. פער שתלוי בדרישה שתוקנה ביד נרשם כ"שירות ידני".
4. **השלמת המסך בצורה הכי זולה:** הסעיף במכרז והעמוד במסמך לא נבנים כקוד בסבב הזה. המייסד מכין לפני הפגישה דף ליווי (Word) שמפרט לכל שורה את הסעיף במכרז, את המסמך והעמוד, ומה להשיג לפני הדדליין. **ייצוא מהמסך לא נכלל בסבב 1.**

**שלב 1 — הזמנה (07–11/10)**
5. בשיחה לבקש: מכרז שהוא מגיש עכשיו, מסמכי החברה (תעודות, דוחות כספיים, המלצות), ואם יש לו, את הצ'אט עם ה-AI על המכרז הזה.
6. **גילוי והסכמה בכתב לפני כל עיבוד.** הודעת WhatsApp או מייל שמסבירה:
   - הניתוח רץ דרך Claude של Anthropic בענן, ותוכן המסמכים נשלח לשם לעיבוד. לצרף את תנאי שמירת הנתונים העדכניים של Anthropic API, ולבדוק אותם ביום השליחה.
   - הקבצים נשמרים בתיקייה נפרדת במחשב של המייסד, ונמחקים עד 14 יום אחרי הפגישה, אלא אם הוא מבקש אחרת.
   - **שום מסמך לא מעובד לפני שהגיעה תשובה "מאשר" בכתב.**

**שלב 2 — קליטה ובדיקה (12–13/10)**
7. המייסד טוען בעצמו את מסמכי הלקוח ובודק ידנית את "אטומי העובדות".
8. מריצים את המכרז. **לפני כל תיקון, שומרים צילום מסך של הפלט הגולמי של המנוע.** אחר כך המייסד בודק כל שורה במסך תנאי הסף מול חוברת המכרז ומול מסמך המקור, ומתקן לפני הפגישה כל הכרעה או ציטוט שגויים. אסור להציג ללקוח היחיד "לא עומד" שגוי. **כל תיקון נרשם ביומן תיקונים, ומסומן בפגישה כ"תוקן ביד"**, בדיוק כמו התיקונים משלב 0.
9. אם הוא שלח צ'אטים עם ה-AI, המייסד מסמן מראש איפה התוצאות שונות. זו הכנה בלבד, ולא נחשבת לקריטריון ההצלחה.

**שלב 3 — הפגישה (עד 15/10, פנים מול פנים, על הלפטופ של המייסד, המנכ"ל מפעיל בעצמו)**
10. **קו הבסיס להשוואה הוא הרצה חיה בפגישה:** הוא מריץ קודם את המכרז ב-ChatGPT כמו שהוא עושה תמיד, עם הפרומפט הרגיל שלו, **על המכשיר שלו ובחשבון שלו**, עם ההיסטוריה, ההנחיות האישיות והזיכרון שלו. אם זה לא מתאפשר, רושמים את זה כמגבלה של קו הבסיס. אחר כך הוא עובר למסך תנאי הסף של UC TENDER, עם דף הליווי.
11. המייסד שותק ורושם: במה הוא סומך, מה הוא בודק שוב, מה הוא מעתיק החוצה, ומתי הוא אומר "וואו" או "אז מה".
11א. **בדיקת המצאות:** המייסד מסמן כל עובדה על החברה בפלט של ChatGPT (מספר, שנה, פרויקט, תעודה) שאין לה מקור במסמכים שלו. המנכ"ל אומר על כל אחת "נכון" או "לא נכון". את התוצאה רושמים בנפרד: כמה עובדות מומצאות, וכמה מהן הוא תפס בעצמו בלי עזרה.
    - **כלל החלטה:** אם יש לפחות עובדה שגויה אחת שהוא **לא** תפס בעצמו, כאב ההמצאות מאושר, וקישור למקור הוא נקודת מכירה. אם אין המצאות בכלל, או שהוא תפס את כולן בעצמו, ההמצאות הן לא כאב שמשלמים עליו, ומצמצמים את טענת הערך לתנאי סף.
12. בסוף ארבע שאלות:
    - "אי פעם נפסלתם, או כמעט נפסלתם, על תנאי סף?" (בודקת את הנחה 2. אם התשובה "לא, אף פעם", זה סימן שההנחה שגויה.)
    - "איך אתה משתמש היום במידע על החברה ממכרז למכרז?" (בודקת את כאב הזיכרון. אי אפשר להוכיח אותו בהרצה אחת.)
    - "מה היה קורה במכרז הזה בלי זה?"
    - "כמה זה שווה לך לכל מכרז?"

**סבב 1 בודק רק שניים מהכאבים:** תנאי סף ונתונים מומצאים. כאב הזיכרון נבדק בשאלה בלבד, ואם יש סימנים לכאב, בהרצה של מכרז שני בסבב 2.

**לא בסבב הזה:** טיוטות, מנוע הגמישות, מסך הלמידה, קונסולת הניהול, המתקין, ייצוא, ליטוש ממשק, מסירת exe.

## טבלת תוצאות — מה עושים בכל מקרה
| מה קרה | מה עושים |
|---|---|
| לא נקבע תאריך, או שעד 11/10 לא הגיעו המסמכים **והאישור בכתב** | הליד מתקרר. עוברים לדרך C עם מה שכן יש (מכרז עבר), ובמקביל מתחילים לחפש 3 לידים נוספים מאותו סוג. המסמכים הגיעו אבל האישור מתעכב? מחכים עד 12/10 לכל המאוחר, ואחרי זה מזיזים את הפגישה פעם אחת בלבד, **לכל המאוחר עד 22/10. מועד קריטריון ההצלחה זז איתה.** אם גם 22/10 עובר, הליד מתקרר. |
| הוא מסרב שהמסמכים יעברו לענן | מריצים רק את חוברת המכרז (מסמך ציבורי) ומול נתוני חברה שהוא **מצהיר** בעל פה, בלי להעלות מסמכים. את הנתונים אוספים בשיחת טלפון קצרה עד 12/10, כדי ששלב 2 (צילום פלט גולמי, בדיקה, יומן תיקונים) ירוץ כרגיל לפני הפגישה. סימן "(מוצהר)" מוצג על הכול. **הצלחה בענף הזה:** פער שמוכח מול סעיף בחוברת, והמנכ"ל מאשר בעל פה שהנתון שלו לא עומד בסעיף. את התוצאה רושמים בנפרד, ולא כהצלחה המלאה. ובנוסף: לרשום את הסירוב כראיה ש-on-prem אמיתי הוא דרישה ולא סתם יתרון. |
| נמצא פער מוכח **שהמנוע מצא בלי תיקון**, והוא נקב במחיר או ביקש מכרז נוסף | הצלחה. סבב 2 = דרך B עם הצעת מחיר לפיילוט. |
| הפער המוכח היחיד נמצא בזכות "שירות ידני" (תיקון של המייסד או דף הליווי), והוא נקב במחיר | זו לא הצלחה של המוצר. קודם מתקנים את המנוע כדי שימצא את הפער לבד, ובודקים שוב על מכרז שני. במקביל רושמים את זה כראיה שאולי יש ביקוש לשירות מלווה. |
| נמצא פער מוכח, אבל הוא לא נקב במחיר ולא ביקש עוד | עניין בלי ביקוש. לשאול ישירות מה חסר כדי שישלם, ולא לבנות כלום עד שיש תשובה. |
| לא נמצא אף פער ש-ChatGPT פספס | ההנחה המרכזית שגויה. עוצרים כל פיתוח ובודקים מחדש את הערך. |

**"פער מוכח"** = המייסד יכול להצביע על הסעיף בחוברת ועל העמוד במסמך החברה, **והמנכ"ל מסכים** שזה פער אמיתי.

## שאלות פתוחות
- **מה הכאב שהוא משלם עליו?** היום זו הנחה. סבב 1 עונה על תנאי סף ועל נתונים מומצאים. כאב הזיכרון נשאר פתוח עד סבב 2.
- **ענן מול on-prem לאורך זמן:** אם לקוחות דורשים שהמסמכים לא יצאו מהמחשב, צריך מנוע מקומי או גרסה עם השחרה (redaction). זו החלטה גדולה אחרי סבב 1, לא עכשיו.
- **מחיר ומודל:** חודשי או לפי מכרז? עוגן להשוואה: לפי מחקר המתחרים הקודם (desk research, לא נבדק מול BIDO עצמם), bido.ai גובה כ-₪99 לניתוח הראשון.

## קריטריוני הצלחה (עד 2026-10-15)
- המנכ"ל **הפעיל בעצמו**, על המחשב של המייסד, את מסך תנאי הסף על מכרז אמיתי שהוא מגיש עכשיו, עם המסמכים האמיתיים שלו, דרך המנוע האמיתי.
- נמצא לפחות פער מוכח אחד (לפי ההגדרה למעלה) שההרצה החיה שלו ב-ChatGPT פספסה, **והמנוע מצא אותו בלי תיקון ידני** (לפי הפלט הגולמי השמור משלב 2). פער שנמצא רק בזכות תיקון של המייסד או בזכות דף הליווי נרשם בנפרד כ"שירות ידני". הוא לא נחשב להצלחה של המוצר.
- נרשמה תוצאת בדיקת ההמצאות (סעיף 11א), גם אם היא אפס.
- הוא נקב בסכום בשקלים, או ביקש להריץ מכרז נוסף.

## הפצה
- **סבב 1: אין הפצה.** הפגישה על המחשב של המייסד, עם נתונים שנטענו מראש. מפתח ה-API לא יוצא מהמחשב.
- סבב 2 (אם יגיע): מסירת exe נייד ללקוח דורשת קודם החלטה איך הלקוח מקבל גישה למנוע בלי שהמפתח של המייסד ייכנס לקובץ, ואיך מעבירים אליו את הנתונים שכבר נקלטו. מתקין NSIS ו-CI/CD לא נחוצים עד שיהיו כמה לקוחות.

## תלויות
- מפתח API של Anthropic עם תקרת הוצאה (חוסם מספר 1).
- אישור בכתב מהמנכ"ל, ומכרז שהוא מגיש עכשיו בפועל.
- תיקון שבירות כשמנוע אמיתי פוגש קלט אמיתי (מוגבל ליום אחד, עם חלופה ידנית).

## המשימה
**היום או מחר (07–08/10):** להתקשר למנכ"ל שמחכה ולקבוע פגישה של שעה עד יום חמישי 15/10. לבקש שעד יום ראשון 11/10 ישלח מכרז שהוא מגיש עכשיו, את מסמכי החברה, ואם יש, את הצ'אט שלו עם ה-AI. אחרי השיחה לשלוח לו את הודעת הגילוי וההסכמה (שלב 1, סעיף 6). במקביל אפשר להפעיל את המנוע (שלב 0). **כל פיצ'ר חדש מחכה עד אחרי הפגישה.**

## מה שמתי לב אליו באופן שבו אתה חושב
- בשאלת הביקוש בחרת קודם "ראיונות בלבד", ורק בלחיצה השנייה עלה ש"מישהו מחכה לי". הראיה הכי חזקה שלך הייתה שם כל הזמן, אבל לא הובלת איתה.
- על השאלה מה חסר לו סימנת את שלושת הכאבים **וגם** "לא בטוח מה חסר לו". זו כנות נדירה, ובדיוק מה שהופך את הפגישה הבאה לניסוי ולא לדמו.
- את הנחה 2 שמרת מול הערעור של הבוקר, בלי לנמק. בגלל זה השאלה "אי פעם נפסלתם, או כמעט נפסלתם, על תנאי סף?" נמצאת בפגישה. תשמע את התשובה שלו גם אם היא סותרת את ההנחה.
- בנית מוצר שלם עם 69 בדיקות ירוקות. ליכולת הביצוע אין ספק. השאלה היא לאן מכוונים אותה.

<!-- gstack:office-hours:concerns:start -->
## Reviewer Concerns

Disposition: CONCERNS_RECORDED

Stop: MAX_ITERATIONS

### R3-1 — consistency

**Problem**

> The success criterion counts a gap only if the engine found it 'without manual correction (per the raw output saved in stage 2)'. But Stage 0 step 3 lets the founder hand-correct the pilot tender's extracted requirements BEFORE the stage-2 run. So the 'raw' screenshot from step 8 can already include requirements the founder fixed by hand. A gap that depends on a requirement repaired in stage 0 would then be wrongly credited to the engine, even though stage 0 fixes must be disclosed in the meeting.

**Remedy**

> Define 'raw engine output' as output from before any stage-0 requirement correction too. Either save the unaided extraction and verdicts before the stage-0 hand fixes, or rule that a gap whose requirement was hand-corrected in stage 0 is recorded as 'manual service', not as engine success.

### R3-2 — consistency

**Problem**

> The outcome table sends 'proven gap found + he named a price or asked for another tender' to 'success, round 2 = path B'. It does not tell an engine-found gap apart from a gap found only by manual service (a founder correction or the Word companion page). The success criteria say a manual-service gap is not product success. If the only gap was manual and he still named a price, the table routes to the product-success branch while the criteria say it is not one. No row covers 'gap found only by manual service'.

**Remedy**

> Split the gap rows in the outcome table, or qualify them, as engine-found versus manual-service-only. Give the manual-service-only case its own next step (for example: validate the engine fix before round 2, or treat it as evidence for a service offering).

### R3-3 — completeness

**Problem**

> Round 1 says it tests two pains: threshold conditions and fabricated data. Step 11a now measures fabrication, and the success criteria require only that the result is recorded, 'even if it is zero'. But neither the outcome table nor any decision rule says what a given fabrication result means. For example, many fabrications that he did not catch versus zero fabrications, or fabrications he caught on his own. So round 1 measures the fabrication pain but cannot conclude anything from it.

**Remedy**

> Add a decision rule for the fabrication result. Example: uncaught wrong company facts mean the pain is confirmed and source-linking is a selling point. Zero fabrications, or all caught on his own, mean fabrication is not a paid pain and the value claim is narrowed. Put the rule in the outcome table or next to step 11a.

### R3-4 — consistency

**Problem**

> The lead-goes-cold row now allows a single move of the meeting if consent comes after 12/10. But the success criteria are hard-dated 'by 2026-10-15', and the schedule says the 15/10 meeting date is also the success-criterion deadline. The document does not say whether a moved meeting moves the success deadline, or how far the meeting can move. Under the current text, a moved meeting automatically fails the criteria.

**Remedy**

> State the latest date for the one allowed move (for example by 22/10), and state that the success-criterion deadline moves with it. Or state that any move past 15/10 counts as the criterion being missed, and say which branch follows.

### R3-5 — clarity

**Problem**

> In the cloud-refusal branch, the run uses company data that he declares verbally. The document never says when that verbal data is collected and entered. If refusal is known only by 11/10 and the data is collected in the meeting, stage 2 (founder checks, raw-output screenshot, correction log) cannot run before the meeting. The 'unaided engine' attribution rule then has no saved raw output to rely on.

**Remedy**

> Say when the declared data is collected in the refusal branch. For example, a short phone call by 12/10 so stage 2 can run as usual. Or say explicitly that in this branch the run happens live in the meeting and is screenshotted there before anything is corrected.

### R3-6 — clarity

**Problem**

> Step 10 has him run ChatGPT 'as he always does, with his usual prompt' in person, while the meeting takes place on the founder's laptop. The document does not say which device and account the ChatGPT baseline runs on. On the founder's laptop, without his logged-in account, his history, custom instructions and memory, the baseline is weaker than his real workflow. The comparison could then show a 'gap ChatGPT missed' unfairly, and it would also undercut the memory-pain question.

**Remedy**

> Specify that the ChatGPT baseline runs on his own device or logged into his own account, with his usual context. Record any deviation from that as a limit on the baseline.

### R3-7 — consistency

**Problem**

> The schedule table puts stage 0 in parallel on 07-08/10. The stage 0 header says 07-09/10. This is a minor date mismatch.

**Remedy**

> Align the two, for example to 07-09/10 in the schedule table.
<!-- gstack:office-hours:concerns:end -->
