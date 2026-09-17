// checklist.js — צ׳קליסטים לחבילת ההגשה (S3.4 + S3.5).
//   documentsChecklist: אילו מסמכים המכרז דורש, ומה כבר קיים במאגר (✓/✗) — אפס-הזיות:
//     "have" נקבע רק מקיום ממשי במאגר הידע (אישורים/מסמכים). מה שלא נמצא — מסומן חסר.
//   signaturesChecklist: היכן נדרשת חתימה/חותמת — משדות ה'manual' של הטופס + סריקת טקסט המכרז.

// --- מסמכים נדרשים ---
// [regex בטקסט המכרז, תווית המסמך, בודק-קיום(knowledge)->bool|null]
//   null = "לא ניתן לדעת מהמאגר" (למשל ערבות שמונפקת פר-מכרז) → פריט פעולה, לא כשל.
const hasCert = (kb, re) => (kb.certifications || []).some((c) => re.test(c.name || ''));
const hasDoc = (kb, cat) => (kb.documentCategories || []).includes(cat);

const DOC_RULES = [
  [/ISO|תקן|תו תקן|הסמכה/i, 'תעודת ISO / תקן', (kb) => hasCert(kb, /ISO|תקן/i)],
  [/סיווג קבלני|קבלן רשום|רשם הקבלנים/, 'אישור סיווג קבלני', (kb) => hasCert(kb, /סיווג/) || !!kb.classification],
  [/ערבות/, 'ערבות בנקאית', () => null], // מונפקת פר-מכרז — תמיד פריט פעולה
  [/ביטוח|אחריות מקצועית|צד ג/, 'אישור קיום ביטוחים', (kb) => hasCert(kb, /ביטוח/)],
  [/ניהול ספרים|מוסד ללא כוונת רווח/, 'אישור ניהול ספרים', (kb) => hasCert(kb, /ניהול ספרים/)],
  [/ניכוי מס|פטור מניכוי/, 'אישור ניכוי מס במקור', (kb) => hasCert(kb, /ניכוי מס/)],
  [/מאזן|דו"?ח כספי|דוח כספי|רו"?ח מבקר|מחזור/, 'דוחות כספיים / מאזן מבוקר', (kb) => hasDoc(kb, 'financial')],
  [/קורות חיים|קו"?ח|צוות|כוח אדם|מנהל פרויקט|מהנדס/, 'קורות חיים של אנשי צוות', (kb) => hasDoc(kb, 'staff')],
  [/המלצות|ממליצים|לקוחות|שביעות רצון/, 'מכתבי המלצה / רשימת לקוחות', (kb) => hasDoc(kb, 'clients')],
  [/תצהיר|נספח א|כתב התחייבות/, 'תצהירים / נספחים חתומים', () => null],
];

export function documentsChecklist(rawText, knowledge = {}) {
  const text = rawText || '';
  const seen = new Set();
  const items = [];
  for (const [re, label, check] of DOC_RULES) {
    if (seen.has(label) || !re.test(text)) continue;
    seen.add(label);
    const have = check(knowledge);
    items.push({
      label,
      status: have === true ? 'have' : have === false ? 'missing' : 'action',
      note: have === true ? 'קיים במאגר' : have === false ? 'לא נמצא במאגר — יש לצרף' : 'להנפיק/לצרף לפני הגשה',
    });
  }
  return items;
}

// --- חתימות / חותמות ---
// מקבל את שדות ה-manual מהטופס (mapFields) + טקסט המכרז.
export function signaturesChecklist(mappedManual = [], rawText = '') {
  const items = [];
  for (const m of mappedManual) {
    if (m.status !== 'manual') continue;
    items.push({ label: m.label || m.name, note: m.reason || 'למילוי/חתימה ידנית בטופס' });
  }
  const text = rawText || '';
  const add = (re, label, note) => { if (re.test(text) && !items.some((i) => i.label === label)) items.push({ label, note }); };
  add(/חתימה.*(מורשה|מוסמכ)|מורשה חתימה/, 'חתימת מורשה חתימה', 'נדרשת חתימת מורשה חתימה של התאגיד');
  add(/חותמת.*(חברה|תאגיד)|חותמת החברה/, 'חותמת החברה', 'הטבעת חותמת התאגיד');
  add(/נוטריון|אימות.*עו"?ד|בפני עו"?ד/, 'אימות עו״ד / נוטריון', 'נדרש אימות חתימה בפני עו״ד/נוטריון');
  add(/ערבות/, 'חתימה על כתב הערבות', 'חתימה + אישור הבנק על הערבות');
  return items;
}

export function checklistSummary(docs, sigs) {
  return {
    documents: { total: docs.length, have: docs.filter((d) => d.status === 'have').length,
      missing: docs.filter((d) => d.status === 'missing').length, action: docs.filter((d) => d.status === 'action').length },
    signatures: { total: sigs.length },
  };
}
