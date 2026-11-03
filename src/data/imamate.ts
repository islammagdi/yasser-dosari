import type { ImamateWeek, RamadanNight } from "@/types";

/**
 * جدول إمامة الشيخ في المسجد الحرام.
 * رئاسة الشؤون الدينية بتعلن الجدول كل أسبوع (من الأحد للسبت) على حسابها @PRAGOVSA وفي الصحف.
 * أول ما الجدول ينزل: ضيف سطر بتاريخ أول يوم في الأسبوع بالهجري، والصلوات اللي فيها اسم الشيخ.
 * لو الشيخ مش في جدول الأسبوع، متضيفش حاجة، والموقع هيقول إنه مفيش إمامة معلنة.
 */
export const IMAMATE_WEEKS: ImamateWeek[] = [
  { from: "1448-04-02", prayers: ["fajr", "asr"] },
  { from: "1448-04-16", prayers: ["maghrib"] },
  { from: "1448-05-14", prayers: ["fajr", "asr"] },
    
   { from: "1448-05-28", prayers: ["fajr", "asr", "maghrib"] },  
];

/**
 * جدول رمضان (احتياطي لو شيت رمضان مش متظبط): كل سطر = جزء بيؤمه الشيخ في ليلة.
 * مثال: { year: 1448, night: 1, prayer: "taraweeh", part: "last" } = التسليمات الأخيرة والوتر ليلة ١ رمضان
 */
export const RAMADAN_NIGHTS: RamadanNight[] = [];