import type { ImamatePrayer, ImamateWeek } from "@/types";

/**
 * جدول الإمامة من Google Sheet منشور كـ CSV.
 * الأعمدة: بداية الأسبوع (هجري) | الفجر | الظهر | العصر | المغرب | العشاء
 * الصلوات checkbox: TRUE معناها الشيخ بيؤمها الأسبوع ده.
 */
const SHEET_URL = process.env.IMAMATE_SHEET_CSV_URL;
const PRAYER_COLUMNS: ImamatePrayer[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export const imamateSheetEnabled = () => Boolean(SHEET_URL);

/** "1448-05-28" أو "28-5-1448" أو "28/5/1448" (أرقام عربي أو إنجليزي) ← "1448-05-28" */
function parseHijri(raw: string): string | null {
  const s = raw.trim().replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  const parts = s.split(/[-/.\s]+/).map(Number).filter((n) => !Number.isNaN(n));
  if (parts.length !== 3) return null;
  let [y, m, d] = parts[0] > 1000 ? parts : [parts[2], parts[1], parts[0]];
  // جوجل شيتس ممكن يحوّلها لصيغة أمريكية (شهر/يوم/سنة): نعكسهم لو الشهر طلع أكبر من ١٢
  if (m > 12 && d <= 12) [m, d] = [d, m];
  if (y < 1400 || m < 1 || m > 12 || d < 1 || d > 30) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const isChecked = (v = "") => /^(true|1|✓|✔|نعم|x)$/i.test(v.trim().replace(/^"|"$/g, ""));

export async function fetchImamateSheet(): Promise<ImamateWeek[]> {
  const res = await fetch(SHEET_URL!, { next: { revalidate: 60 * 30 } }); // كل نص ساعة
  if (!res.ok) throw new Error(`sheet ${res.status}`);
  const rows = (await res.text()).split(/\r?\n/).map((line) => line.split(","));

  const weeks: ImamateWeek[] = [];
  for (const row of rows.slice(1)) {
    const from = parseHijri((row[0] ?? "").replace(/"/g, ""));
    if (!from) continue;
    const prayers = PRAYER_COLUMNS.filter((_, i) => isChecked(row[i + 1]));
    if (prayers.length) weeks.push({ from, prayers });
  }
  return weeks;
}