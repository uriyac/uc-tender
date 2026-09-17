// http.js — עזרי HTTP משותפים.
//
// AsyncRouter: Router של Express שעוטף אוטומטית כל handler, כך ש-rejection של
// פונקציה א-סינכרונית (או throw סינכרוני) מועבר ל-next(err) → ל-error handler
// המרכזי, במקום להשאיר את הבקשה תלויה. ב-Express 4 שגיאות async אינן נתפסות לבד,
// ולכן בלי העטיפה הזו קריאת-מנוע שנכשלת (Claude/חילוץ) הייתה מקפיאה את הבקשה.
//
// עטיפה נעשית רק ל-handlers רגילים (arity < 4). error-middleware (err,req,res,next)
// מזוהה לפי 4 ארגומנטים ואינו נעטף.

import { Router } from 'express';

const wrap = (fn) =>
  fn.length >= 4
    ? fn // error-middleware — לא לעטוף
    : function (req, res, next) {
        return Promise.resolve().then(() => fn(req, res, next)).catch(next);
      };

export function AsyncRouter() {
  const r = Router();
  for (const m of ['get', 'post', 'put', 'delete', 'patch', 'use', 'all']) {
    const orig = r[m].bind(r);
    r[m] = (...args) => orig(...args.map((a) => (typeof a === 'function' ? wrap(a) : a)));
  }
  return r;
}
