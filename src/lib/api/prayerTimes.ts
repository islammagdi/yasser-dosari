import type { ImamatePrayer } from "@/types";
import type { PrayerTimes } from "@/lib/imamate";

/**
 * مواقيت الصلاة في مكة من Aladhan (API مجاني)، بطريقة أم القرى (method=4).
 * بنضيف ٤٠ دقيقة على الأذان (الإقامة + الصلاة)، عشان "الإمامة القادمة" تفضل ظاهرة لحد ما الصلاة تخلص.
 */
const AFTER_ADHAN_MIN = 40;
const NAMES: Record<string, ImamatePrayer> = { Fajr: "fajr", Dhuhr: "dhuhr", Asr: "asr", Maghrib: "maghrib", Isha: "isha" };

interface AladhanDay {
  timings: Record<string, string>;
  date: { gregorian: { date: string } }; // "01-11-2026"
}

function plusMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const t = Math.min(h * 60 + m + mins, 23 * 60 + 59);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
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
          if (hhmm) out[iso][key] = plusMinutes(hhmm, AFTER_ADHAN_MIN);
        }
      }
    }),
  );
  return out;
}