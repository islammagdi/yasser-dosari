import type { ImamatePrayer } from "@/types";
import type { PrayerTimes } from "@/lib/imamate";

/**
 * مواقيت الصلاة في مكة من Aladhan (API مجاني)، بطريقة أم القرى (method=4).
 * بترجّع وقت الأذان لكل صلاة، والإضافات (الإقامة، التراويح، التهجد) بتتحسب في expandWeeks.
 */
const NAMES: Record<string, ImamatePrayer> = { Fajr: "fajr", Dhuhr: "dhuhr", Asr: "asr", Maghrib: "maghrib", Isha: "isha" };

interface AladhanDay {
  timings: Record<string, string>;
  date: { gregorian: { date: string } }; // "01-11-2026"
}

export async function makkahPrayerTimes(dates: string[]): Promise<PrayerTimes> {
  const months = [...new Set(dates.map((d) => d.slice(0, 7)))]; // "2026-11"
  const out: PrayerTimes = {};
  await Promise.all(
    months.map(async (ym) => {
      const [y, m] = ym.split("-");
      const res = await fetch(
        `https://api.aladhan.com/v1/calendarByCity/${y}/${Number(m)}?city=Makkah&country=Saudi%20Arabia&method=4`,
        { next: { revalidate: 60 * 60 * 24 } },
      );
      if (!res.ok) throw new Error(`aladhan ${res.status}`);
      const { data } = (await res.json()) as { data: AladhanDay[] };
      for (const day of data) {
        const [dd, mm, yyyy] = day.date.gregorian.date.split("-");
        const iso = `${yyyy}-${mm}-${dd}`;
        out[iso] = {};
        for (const [name, key] of Object.entries(NAMES)) {
          const hhmm = day.timings[name]?.slice(0, 5); // "04:58 (+03)" ← "04:58"
          if (hhmm) out[iso][key] = hhmm; // وقت الأذان؛ الإضافات بتتحسب في expandWeeks
        }
      }
    }),
  );
  return out;
}