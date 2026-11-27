"use client";

import { useEffect, useState } from "react";

/**
 * علامة «جديد» على الإذاعة: بتفضل ظاهرة لحد ما الزائر يشغّل الإذاعة أول مرة.
 * التخزين على الجهاز، ونفس الحدث بيحدّث كل الأماكن اللي فيها العلامة في نفس اللحظة.
 */
const KEY = "yd-radio-seen";
const EVENT = "yd-radio-seen";

export function markRadioSeen() {
  try {
    if (localStorage.getItem(KEY)) return;
    localStorage.setItem(KEY, "1");
  } catch {
    /* تخزين غير متاح */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** true = الزائر شغّل الإذاعة قبل كده. بتبدأ true عشان العلامة متظهرش وتختفي قبل ما نقرا التخزين */
export function useRadioSeen(): boolean {
  const [seen, setSeen] = useState(true);
  useEffect(() => {
    const read = () => {
      try {
        setSeen(Boolean(localStorage.getItem(KEY)));
      } catch {
        setSeen(true);
      }
    };
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, []);
  return seen;
}
