import type { Prayer, Recording } from "@/types";
import { SURAH_NAMES } from "@/lib/quran";

/**
 * بيانات تجريبية بس — كل اللي بين [ ] لازم يتبدّل بالبيانات الحقيقية،
 * والسنين والشهور هنا لتجربة التقسيم مش أكتر.
 * عشان تجرب المشغّل: حط رابط mp3 في NEXT_PUBLIC_DEMO_AUDIO_URL جوه .env.local
 */
const demoAudio = process.env.NEXT_PUBLIC_DEMO_AUDIO_URL ?? "";
const ar = new Intl.NumberFormat("ar-EG", { useGrouping: false });
const DEMO_YEARS = [1446, 1445]; // الأحدث الأول

// المحاضرات: خطب الجمعة بتاريخها الهجري (العنوان بيتولّد تلقائيًا لو سبته فاضي).
// الدروس الدينية ليها عناوين خاصة، فضيفها بعناوينها الحقيقية مع lectureType: "lesson".
const khutbahDates: [year: number, month: number, day: number][] = [
  [1446, 9, 28],
  [1446, 9, 21],
  [1446, 9, 14],
  [1446, 9, 7],
];
const lectures: Recording[] = khutbahDates.map(([year, month, day], i) => ({
  id: `lecture-${i + 1}`,
  category: "lectures",
  lectureType: "khutbah",
  hijriYear: year,
  hijriMonth: month,
  hijriDay: day,
  title: "",
  subtitle: "المسجد الحرام",
  audioUrl: demoAudio,
}));

// الفروض: سنة ← شهر ← صلوات
// العنوان بيتولّد تلقائيًا من الصلاة والتاريخ (src/lib/labels.ts)
const demoMonths = [9, 8, 7]; // رمضان، شعبان، رجب
const demoDays = [15, 1];
const fard: Recording[] = DEMO_YEARS.flatMap((year) =>
  demoMonths.flatMap((month) =>
    demoDays.flatMap((day) =>
      (["fajr", "maghrib", "isha"] as Prayer[]).map((p) => ({
        id: `fard-${year}-${month}-${day}-${p}`,
        category: "fard" as const,
        prayer: p,
        hijriYear: year,
        hijriMonth: month,
        hijriDay: day,
        title: "",

        audioUrl: demoAudio,
      })),
    ),
  ),
);

// التراويح: سنة ← ليلة
const taraweeh: Recording[] = DEMO_YEARS.flatMap((year) =>
  Array.from({ length: 30 }, (_, i) => ({
    id: `taraweeh-${year}-${i + 1}`,
    category: "taraweeh" as const,
    hijriYear: year,
    night: i + 1,
    title: `الليلة ${ar.format(i + 1)}`,

    audioUrl: demoAudio,
  })),
);

// المصحف المسجل: ١١٤ سورة.
// لو حطيت رابط فولدر التلاوة في NEXT_PUBLIC_MUSHAF_AUDIO_BASE، كل سورة هتاخد رابط بالشكل: {base}/001.mp3
const mushafBase = (process.env.NEXT_PUBLIC_MUSHAF_AUDIO_BASE ?? "").replace(/\/$/, "");
const mushaf: Recording[] = SURAH_NAMES.map((name, i) => {
  const n = i + 1;
  const file = String(n).padStart(3, "0");
  return {
    id: `mushaf-${file}`,
    category: "mushaf" as const,
    surah: n,
    title: `سورة ${name}`,
    audioUrl: mushafBase ? `${mushafBase}/${file}.mp3` : demoAudio,
  };
});

// تواريخ إضافة تجريبية لسكشن "تمت إضافته حديثًا"
const demoAddedAt: Record<string, string> = {
  "fard-1446-9-15-isha": "2026-10-30",
  "taraweeh-1446-30": "2026-10-28",
  "lecture-1": "2026-10-25",
  "fard-1446-9-15-maghrib": "2026-10-22",
};
// صور الأغلفة: حط الصورة في public/images/covers/ واكتب مسارها قدام id التسجيل
const demoImages: Record<string, string> = {
   "fard-1446-9-15-isha": "/images/covers/isha.jpg",
   "mushaf-018": "/images/covers/kahf.jpg",
};

export const MOCK_RECORDINGS: Recording[] = [...fard, ...mushaf, ...taraweeh, ...lectures].map((r) => ({
  ...r,
  ...(demoAddedAt[r.id] && { addedAt: demoAddedAt[r.id] }),
  ...(demoImages[r.id] && { imageUrl: demoImages[r.id] }),
}));