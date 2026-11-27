"use client";

import { useEffect, useState } from "react";
import type { Season } from "@/lib/season";

/**
 * الموسم الحالي في الكومبوننتس: بيقرا data-season اللي حطه seasonInitScript.
 * أول رسم بيرجع "regular" (زي السيرفر)، وبعد الـ mount بيرجع القيمة الحقيقية.
 */
export function useSeason(): Season {
  const [season, setSeason] = useState<Season>("regular");
  useEffect(() => {
    setSeason(document.documentElement.dataset.season === "ramadan" ? "ramadan" : "regular");
  }, []);
  return season;
}
