// mapping.js — מיפוי שדה-טופס → נתון בפרופיל החברה. הלב של S3.
//
// אפס-הזיות (העיקרון המרכזי של המוצר):
//   - שדה ממופה שיש לו ערך בפרופיל → status 'filled' (ייכתב לטופס, source='פרופיל החברה').
//   - שדה ממופה שאין לו ערך בפרופיל → status 'missing' (מסומן; לא ממציאים — המשתמש ישלים בפרופיל).
//   - שדה חתימה/תאריך/אנושי → status 'manual' (נכנס לצ׳קליסט החתימות).
//   - שדה שלא זוהה → status 'manual' (השלמה ידנית). לעולם לא כותבים ערך שאינו מהפרופיל.

// נרמול שם-שדה להשוואה: הסרת ניקוד/פיסוק/סוגריים, סופיות, lowercase.
const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
function norm(s) {
  return String(s || '').toLowerCase()
    .replace(/[֑-ׇ]/g, '')
    .replace(/["'׳״.,:;()\[\]{}\/\\_\-]/g, ' ')
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .replace(/\s+/g, ' ').trim();
}

// [regex על שם-השדה המנורמל, מפתח בפרופיל, תווית לתצוגה]
// מסודר מהמובהק לכללי — ה-regex הראשון שתופס מנצח. נורמליזציה מסירה גרשיים/פיסוק/סופיות.
const FIELD_MAP = [
  [/ח פ|ח\.?פ|מספר.*(חברה|תאגיד|עוסק|זיהוי|רישומ|ישות)|עוסק מורשה|ע מ|מס רישומ/, 'reg_no', 'ח.פ. / מספר רישום'],
  [/דוא ל|דואל|מייל|אימייל|דואר אלקטרונ|email|e mail/i, 'email', 'דוא"ל'],
  [/טלפונ|נייד|פלאפונ|סלולר|phone|mobile|פקס/i, 'contact_phone', 'טלפון'],
  [/סיווג קבלנ|דרגת סיווג|רשמ קבלנ|סיווג|classification/i, 'classification', 'סיווג קבלני'],
  [/מחזור|היקפ כספ|מחזור שנת/, 'avg_turnover', 'מחזור כספי'],
  [/שנות.*ניסיונ|ותק|ניסיונ.*שנימ|שנימ.*ניסיונ/, 'senior_experience_years', 'שנות ניסיון'],
  [/מספר.*עובד|כמות.*עובד|עובד|כח אדמ|מצבת|צוות/, 'certified_staff', 'מספר עובדים'],
  [/איש קשר|אישקשר|נציג|מנהל קשר|ליצירת קשר|contact/i, 'contact_name', 'איש קשר'],
  [/אתר|אינטרנט|website|url/i, 'website', 'אתר אינטרנט'],
  [/ישות|התאגדות|סוג.*תאגיד|צורת.*התאגד|מעמד משפטי/, 'legal_entity', 'סוג התאגדות'],
  [/כתובת|מען|רחוב|עיר|ישוב/, 'address', 'כתובת'],
  [/תפקיד|תואר מקצוע|בעל תפקיד/, 'key_person_title', 'תפקיד בעל התפקיד'],
  [/תחומ|התמחות|עיסוק|ענפ|domain/i, 'main_domain', 'תחום עיקרי'],
  [/שמ.*(מציע|משתתפ|מתמודד|זוכה|חברה|תאגיד|עוסק|עסק|ספק|קבלנ|הגוף|הישות)|שמ מלא/, 'name', 'שם המציע'],
];

// שדות אנושיים/חתימה/תאריך — לא ממולאים אוטומטית, נכנסים לצ׳קליסט חתימות.
const MANUAL_CUES = [/חתימ|signature|sign/i, /תאריכ|date/i, /חותמת|stamp/i, /נציג מוסמכ|מורשה חתימ/i];

function isManualField(nname, type) {
  if (type === 'Signature') return true;
  return MANUAL_CUES.some((re) => re.test(nname));
}

// company = אובייקט פרופיל החברה. מחזיר לכל שדה רשומת-מיפוי.
export function mapFields(fields, company = {}) {
  return (fields || []).map((f) => {
    const nname = norm(f.name);

    if (isManualField(nname, f.type)) {
      return { name: f.name, type: f.type, label: f.name, value: '', source: null, status: 'manual', reason: 'שדה אנושי (חתימה/תאריך/חותמת)' };
    }
    for (const [re, key, label] of FIELD_MAP) {
      if (re.test(nname)) {
        const val = company[key];
        if (val != null && String(val).trim()) {
          return { name: f.name, type: f.type, label, key, value: String(val).trim(), source: 'פרופיל החברה', status: 'filled' };
        }
        return { name: f.name, type: f.type, label, key, value: '', source: null, status: 'missing', reason: 'ממופה אך חסר בפרופיל החברה' };
      }
    }
    return { name: f.name, type: f.type, label: f.name, value: '', source: null, status: 'manual', reason: 'לא זוהה מיפוי — השלמה ידנית' };
  });
}

// סיכום לתצוגה/צ׳קליסט.
export function summarize(mapped) {
  const by = (s) => mapped.filter((m) => m.status === s);
  return {
    total: mapped.length,
    filled: by('filled').length,
    missing: by('missing').length,
    manual: by('manual').length,
    coverage: mapped.length ? Math.round((by('filled').length / mapped.length) * 100) : 0,
  };
}
