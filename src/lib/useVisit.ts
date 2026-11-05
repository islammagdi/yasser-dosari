"use client";

import { useEffect, useState } from "react";
import type { Recording } from "@/types";

/**
 * "جديد من آخر زيارة": بنفتكر وقت آخر زيارة، والتسجيلات اللي اتضافت بعده بتتعلّم "جديد".
 * الزيارة = جلسة (تاب): الوقت بيتحدّث مرة واحدة أول ما الجلسة تبدأ، فالـ refresh مبيمسحش العلامات.
 * كله على جهاز الزائر بس، زي المفضلة والختمة.
 */
const KEY = "yd-last-visit-v1";
const SESSION_KEY = "yd-visit-baseline";

let cached: string | null | undefined;

function baseline(): string | null {
  if (cached !== undefined) return cached;
  try {
    const inSession = sessionStorage.getItem(SESSION_KEY);
    if (inSession !== null) {
      cached = inSession || null;
    } else {
      const last = localStorage.getItem(KEY);
      sessionStorage.setItem(SESSION_KEY, last ?? "");
      localStorage.setItem(KEY, new Date().toISOString());
      // أول زيارة خالص: مفيش حاجة "جديدة" بالنسبة له
      cached = last;
    }
  } catch {
    cached = null;
  }
  return cached;
}

/** وقت الزيارة اللي قبل دي (ISO)، أو null لو أول زيارة */
export function useLastVisit(): string | null {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => setValue(baseline()), []);
  return value;
}

export function isNewSince(r: Recording, since: string | null): boolean {
  return !!since && !!r.addedAt && r.addedAt > since;
}