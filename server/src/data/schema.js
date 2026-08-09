// schema.js — הישויות ונתוני ה-seed הראשוניים.
// ה-seed תואם 1:1 לנתונים שהיו קשיחים בפרוטוטייפ, כדי ש-parity יהיה מיידי.

// מצב ריק לגמרי — לבדיקת חוויית לקוח חדש (אונבורדינג מאפס).
export function emptySeed() {
  return {
    company: { id: 'c1', name: '', reg_no: '', specialties: [] },
    documents: [],
    projects: [],
    certifications: [],
    tenders: [],
    requirements: [],
    mappings: [],
    drafts: [],
    outcomes: [],
  };
}

export function seed() {
  return {
    company: {
      id: 'c1',
      name: 'פתרונות דיגיטליים לישראל בע״מ',
      reg_no: '515-3390-27',
      specialties: ['אנליטיקה', 'תחבורה חכמה', 'ניהול ידע'],
    },

    documents: [],

    projects: [
      { id: 'p1', name: 'נתיב ירוק לעבודה', year: '2023', source_doc_id: null,
        dimensions: ['11 רשויות', 'ניתוח סקרים', 'תחבורה שיתופית', 'ניהול נתונים'] },
      { id: 'p2', name: 'מערך שירותי קהילה', year: '2022', source_doc_id: null,
        dimensions: ['4 מחוזות', 'מוקדי שירות', 'הכשרת צוותים', 'מדדי SLA'] },
      { id: 'p3', name: 'שדרוג תשתיות מים', year: '2024', source_doc_id: null,
        dimensions: ['7 יישובים', 'תכנון הנדסי', 'פיקוח ביצוע'] },
      { id: 'p4', name: 'פלטפורמת דיווח דיגיטלית', year: '2023', source_doc_id: null,
        dimensions: ['ממשק לאזרח', 'אינטגרציה', 'אבטחת מידע'] },
    ],

    certifications: [
      { id: 'cert1', name: 'ISO 9001', valid_until: '2027', status: 'בתוקף' },
      { id: 'cert2', name: 'אישור ניהול ספרים', valid_until: null, status: 'בתוקף' },
      { id: 'cert3', name: 'סיווג קבלני ג-5', valid_until: null, status: 'בתוקף' },
    ],

    tenders: [
      { id: 't61', code: '#61/2026', name: 'פורטל תעסוקה', issuer: 'המוסד לביטוח לאומי', stage: 'אישור', days: 4, progress: 92, match_score: 61 },
      { id: 't39', code: '#39/2026', name: 'פלטפורמת נתוני בריאות', issuer: 'משרד הבריאות', stage: 'אישור', days: 6, progress: 88, match_score: 87 },
      { id: 't44', code: '#44/2026', name: 'ניהול מערך תחבורה', issuer: 'משרד התחבורה', stage: 'התאמה', days: 14, progress: 42, match_score: 78 },
      { id: 't51', code: '#51/2026', name: 'רשת איסוף פסולת', issuer: 'עיריית תל אביב', stage: 'טיוטה', days: 21, progress: 24, match_score: 72 },
      { id: 't67', code: '#67/2026', name: 'פריסת פס-רחב שלב ב', issuer: 'משרד התקשורת', stage: 'טיוטה', days: 28, progress: 47, match_score: 76 },
      { id: 't58', code: '#58/2026', name: 'מחסן נתונים בין-משרדי', issuer: 'מערך הדיגיטל', stage: 'טיוטה', days: 33, progress: 55, match_score: 81 },
      { id: 't63', code: '#63/2026', name: 'תיאום מענה חירום', issuer: 'פיקוד העורף', stage: 'טיוטה', days: 45, progress: 12, match_score: 68 },
    ],

    // נבנים בזמן ריצה (שלבים 2-3): requirements, mappings, drafts, outcomes
    requirements: [],
    mappings: [],
    drafts: [],
    outcomes: [],
  };
}
