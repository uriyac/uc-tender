import { createCanvas } from '@napi-rs/canvas';
import { PDFDocument } from 'pdf-lib';
import { writeFileSync } from 'node:fs';
import { ocrPdf, closeOcr } from '../src/lib/ocr.js';

// 1) draw a Hebrew "scanned" page image
const W=1000,H=500; const c=createCanvas(W,H); const ctx=c.getContext('2d');
ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
ctx.fillStyle='#111'; ctx.direction='rtl'; ctx.textAlign='right';
ctx.font='bold 36px Arial'; ctx.fillText('מכרז פומבי מספר 22/2026', W-50, 80);
ctx.font='28px Arial';
ctx.fillText('עיריית חדרה — שירותי ניהול ותחזוקה', W-50, 160);
ctx.fillText('על המציע להיות בעל ניסיון של 5 שנים לפחות', W-50, 230);
ctx.fillText('נדרשת ערבות בנקאית בסך 40000 שקל', W-50, 300);
ctx.fillText('מועד אחרון להגשה 20/05/2026', W-50, 370);
const png=c.toBuffer('image/png');

// 2) embed as image-only PDF (NO text layer = scanned)
const pdf=await PDFDocument.create(); const page=pdf.addPage([595,842]);
const img=await pdf.embedPng(png);
const dims=img.scaleToFit(515,760); page.drawImage(img,{x:40,y:842-40-dims.height,width:dims.width,height:dims.height});
const scanned=await pdf.save(); writeFileSync('tools/out/scanned-tender.pdf', scanned);
console.log('scanned PDF:', scanned.length, 'bytes (image-only, no text layer)');

// 3) OCR it
console.time('ocrPdf');
const res=await ocrPdf(Buffer.from(scanned));
console.timeEnd('ocrPdf');
await closeOcr();
console.log('confidence:', res.confidence, '| pages:', res.pages, '| source:', res.source);
console.log('--- extracted ---'); console.log(res.text || res.error);
