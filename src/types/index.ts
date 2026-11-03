export type Category = "fard" | "mushaf" | "taraweeh" | "lectures";

export type Prayer = "fajr" | "maghrib" | "isha";

export type LectureType = "khutbah" | "lesson";

/** جدول الإمامة بيشمل الصلوات الخمس */
export type ImamatePrayer = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

/** موعد إمامة واحد من الجدول الأسبوعي */
export interface ImamateSlot {
  id: string;
  /** التاريخ الميلادي بتوقيت مكة: "2026-11-10" — الهجري بيتحسب منه تلقائيًا */
  date: string;
  prayer: ImamatePrayer;
  /** اختياري: وقت الصلاة بتوقيت مكة "20:30"، عشان الموعد يعدّي بعد الصلاة مش بنهاية اليوم */
  time?: string;
  /** صلوات الشيخ في الأسبوع ده كله، عشان تتعرض تحت الموعد */
  weekPrayers?: ImamatePrayer[];
}

/** أسبوع من جدول الإمامة، زي ما رئاسة الشؤون الدينية بتعلنه: من الأحد للسبت، وكل إمام على صلوات ثابتة */
export interface ImamateWeek {
  /** أول يوم في الأسبوع (الأحد) بالتاريخ الهجري كما في الإعلان: "1448-05-14" */
  from: string;
  /** الصلوات اللي هيؤمها الشيخ طول الأسبوع */
  prayers: ImamatePrayer[];
}

/** تسجيل صوتي واحد. ده الشكل اللي الـ backend لازم يرجّعه. */
export interface Recording {
  id: string;
  category: Category;
  title: string;
  /** سطر وصفي قصير: المكان، السور، إلخ */
  subtitle?: string;
  /** ISO date: "2025-03-14" */
  date?: string;
  durationSec?: number;
  audioUrl: string;
  /** لو التسجيل من يوتيوب: بيتشغّل في مشغّل يوتيوب الصغير بدل الصوت */
  youtubeId?: string;
  /** اسم الصلاة كما يظهر، للفروض اللي فيها أكتر من صلاة: "صلاتا المغرب والعشاء" */
  prayerLabel?: string;
  /** نص إضافي للبحث مش بيظهر، زي عنوان فيديو يوتيوب الأصلي كامل */
  searchText?: string;
  /** اسم النسخة لو القسم فيه أكتر من تسجيل، زي مصحفين بتسجيلين مختلفين */
  versionLabel?: string;
  /** صورة الكارت (اختيارية) — من غيرها بيظهر غلاف مولّد بلون القسم */
  imageUrl?: string;
  /** ISO date لتاريخ الإضافة على الموقع — بيتستخدم في "تمت إضافته حديثًا" */
  addedAt?: string;
  /** للمحاضرات: خطبة جمعة أو درس ديني */
  lectureType?: LectureType;
  /** للفروض */
  prayer?: Prayer;
  /** للفروض والتراويح: السنة الهجرية، مثلًا 1446 */
  hijriYear?: number;
  /** للفروض: رقم الشهر الهجري من 1 (محرم) لـ 12 (ذو الحجة) */
  hijriMonth?: number;
  /** للفروض: اليوم في الشهر الهجري من 1 لـ 30 */
  hijriDay?: number;
  /** للتراويح: رقم الليلة من 1 لـ 30 */
  night?: number;
  /** للمصحف: رقم السورة من 1 لـ 114 */
  surah?: number;
}

export interface ListParams {
  category: Category;
  limit?: number;
}
