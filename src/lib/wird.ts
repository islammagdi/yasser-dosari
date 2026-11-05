/**
 * الورد اليومي: تقسيم المصحف على عدد أيام، بالسور (لأن التسجيلات الصوتية سورة سورة).
 * وزن كل سورة = عدد صفحاتها في مصحف المدينة، عشان اليوم اللي فيه البقرة ميبقاش زي اليوم اللي فيه جزء عمّ.
 */

/** صفحة بداية كل سورة في مصحف المدينة (٦٠٤ صفحة). متولّدة من quran-meta، ومش بتتغيّر */
const SURAH_START_PAGE = [
  1, 2, 50, 77, 106, 128, 151, 177, 187, 208, 221, 235, 249, 255, 262, 267, 282, 293, 305, 312, 322, 332, 342, 350,
  359, 367, 377, 385, 396, 404, 411, 415, 418, 428, 434, 440, 446, 453, 458, 467, 477, 483, 489, 496, 499, 502, 507,
  511, 515, 518, 520, 523, 526, 528, 531, 534, 537, 542, 545, 549, 551, 553, 554, 556, 558, 560, 562, 564, 566, 568,
  570, 572, 574, 575, 577, 578, 580, 582, 583, 585, 586, 587, 587, 589, 590, 591, 591, 592, 593, 594, 595, 595, 596,
  596, 597, 597, 598, 598, 599, 599, 600, 600, 601, 601, 601, 602, 602, 602, 603, 603, 603, 604, 604, 604,
] as const;

/** عدد صفحات السورة تقريبًا. السور القصيرة اللي بتتشارك صفحة بتاخد ربع صفحة على الأقل */
export function surahPages(n: number): number {
  const start = SURAH_START_PAGE[n - 1];
  const next = n < 114 ? SURAH_START_PAGE[n] : 605;
  return Math.max(0.25, next - start);
}

export const TOTAL_PAGES = 604;

/** خيارات مدة الختمة اللي بتظهر للزائر */
export const WIRD_DURATIONS = [7, 15, 30, 60] as const;

/** تاريخ النهارده بتوقيت جهاز الزائر: "2026-11-05" */
export function localToday(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** عدد الأيام بين تاريخين (b - a) */
export function daysBetween(a: string, b: string): number {
  const utc = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

/**
 * سور ورد النهارده: السور اللي لسه متسمعتش بترتيب المصحف، لحد ما نوصل لنصيب اليوم من الصفحات.
 * النصيب = الصفحات الباقية ÷ الأيام الباقية، فلو فوّت يوم الورد بيكبر شوية، ولو سبق بيصغر.
 */
export function pickToday(done: ReadonlySet<number>, daysLeft: number): number[] {
  const remaining: number[] = [];
  for (let n = 1; n <= 114; n++) if (!done.has(n)) remaining.push(n);
  if (remaining.length === 0) return [];

  const left = remaining.reduce((sum, n) => sum + surahPages(n), 0);
  const target = left / Math.max(1, daysLeft);
  const today: number[] = [];
  let pages = 0;
  for (const n of remaining) {
    // بنقف لو السورة الجاية هتبعدنا عن النصيب أكتر ما هتقرّبنا،
    // إلا لو اللي معانا أقل من نص النصيب (زي الفاتحة لوحدها قبل البقرة)
    if (today.length && pages >= target / 2 && pages + surahPages(n) - target > target - pages) break;
    today.push(n);
    pages += surahPages(n);
    if (pages >= target) break;
  }
  return today;
}

/** تذكير يومي بالورد على تقويم Google لحد آخر يوم في الخطة */
export function wirdGoogleUrl(fromDate: string, days: number, hhmm: string, siteUrl: string): string {
  const start = `${fromDate.replace(/-/g, "")}T${hhmm.replace(":", "")}00`;
  const [h, m] = hhmm.split(":").map(Number);
  const endMin = h * 60 + m + 30;
  const end = `${fromDate.replace(/-/g, "")}T${String(Math.floor(endMin / 60) % 24).padStart(2, "0")}${String(endMin % 60).padStart(2, "0")}00`;
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: "الورد اليومي: ختمة بصوت الشيخ ياسر الدوسري",
    dates: `${start}/${end}`,
    details: `ورد اليوم جاهز على الموقع:\n${siteUrl}`,
    recur: `RRULE:FREQ=DAILY;COUNT=${days}`,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

/** نفس التذكير كملف .ics (آيفون وباقي التطبيقات)، بتوقيت جهاز الزائر */
export function wirdIcs(fromDate: string, days: number, hhmm: string, siteUrl: string): Blob {
  const d = fromDate.replace(/-/g, "");
  const t = hhmm.replace(":", "");
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//yasser-dosari//wird//AR",
    "BEGIN:VEVENT",
    `UID:wird-${d}-${days}@yasser-dosari`,
    `DTSTAMP:${now}`,
    `DTSTART:${d}T${t}00`,
    "DURATION:PT30M",
    `RRULE:FREQ=DAILY;COUNT=${days}`,
    "SUMMARY:الورد اليومي: ختمة بصوت الشيخ ياسر الدوسري",
    `DESCRIPTION:ورد اليوم جاهز على الموقع:\\n${siteUrl}`,
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    "DESCRIPTION:الورد اليومي",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
}