import type { Category, LectureType, Prayer } from "@/types";
import type { Lang } from "@/lib/i18n/config";

export interface CategoryInfo {
  slug: Category;
  label: string;
  title: string;
  description: string;
}

export const CATEGORIES: CategoryInfo[] = [
  {
    slug: "fard",
    label: "فروض",
    title: "الفروض",
    description: "تلاوات الشيخ في الصلوات الجهرية بالمسجد الحرام.",
  },
  {
    slug: "mushaf",
    label: "المصحف",
    title: "المصحف المسجل",
    description: "القرآن الكريم كاملًا بصوت الشيخ، سورة سورة.",
  },
  {
    slug: "taraweeh",
    label: "تراويح",
    title: "صلاة التراويح",
    description: "ليالي رمضان، ليلة بليلة.",
  },
  {
    slug: "lectures",
    label: "محاضرات",
    title: "الخطب والمحاضرات",
    description: "دروس ومحاضرات وخطب الشيخ.",
  },
  {
    slug: "rare",
    label: "نادرة",
    title: "تلاوات نادرة",
    description: "تلاوات ومقاطع نادرة للشيخ من خارج الصلوات المعتادة.",
  },
];

export function getCategory(slug: string): CategoryInfo | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export const PRAYER_LABELS: Record<Prayer, string> = {
  fajr: "الفجر",
  maghrib: "المغرب",
  isha: "العشاء",
};

export const LECTURE_TYPE_LABELS: Record<LectureType, string> = {
  khutbah: "خطبة جمعة",
  lesson: "درس ديني",
};

export const HIJRI_MONTHS = [
  "محرم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
] as const;

export const HIJRI_MONTHS_EN = [
  "Muharram",
  "Safar",
  "Rabi al-Awwal",
  "Rabi al-Thani",
  "Jumada al-Ula",
  "Jumada al-Akhirah",
  "Rajab",
  "Shaban",
  "Ramadan",
  "Shawwal",
  "Dhu al-Qadah",
  "Dhu al-Hijjah",
] as const;

export function hijriMonthName(month: number, lang: Lang = "ar"): string {
  return (lang === "en" ? HIJRI_MONTHS_EN : HIJRI_MONTHS)[month - 1] ?? "";
}

export const PRAYER_LABELS_EN: Record<Prayer, string> = { fajr: "Fajr", maghrib: "Maghrib", isha: "Isha" };

/** غلاف افتراضي لكل قسم (اختياري) — بيظهر لأي تسجيل في القسم ملوش imageUrl خاص بيه */
export const CATEGORY_COVERS: Partial<Record<Category, string>> = {
  // fard: "/images/covers/fard.jpg",
   mushaf: "/images/covers/mushaf.jpg",
};
