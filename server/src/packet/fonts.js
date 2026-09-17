// fonts.js — איתור פונט עברי לבנדל/הטמעה. אותו דפוס כמו export/pdf.js:
// פונט-מערכת (Windows/macOS) עם fallback ל-DejaVu ב-Linux (סביבת הפיילוט).
// אם אין אף פונט עברי — מחזיר null, והמילוי מדלג על ערכים עבריים (אפס-הזיות נשמר).

import { existsSync, readFileSync } from 'node:fs';

const FONT_CANDIDATES = [
  'C:/Windows/Fonts/arial.ttf',
  'C:/Windows/Fonts/david.ttf',
  '/Library/Fonts/Arial.ttf',
  '/System/Library/Fonts/Supplemental/Arial.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
];

export const HEB_FONT_PATH = FONT_CANDIDATES.find((p) => existsSync(p)) || null;

// מחזיר Buffer של הפונט (להטמעה ב-pdf-lib) או null.
export function hebFontBytes() {
  return HEB_FONT_PATH ? readFileSync(HEB_FONT_PATH) : null;
}
