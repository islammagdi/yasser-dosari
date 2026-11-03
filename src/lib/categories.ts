import type { Category, LectureType, Prayer } from "@/types";

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

export function hijriMonthName(month: number): string {
  return HIJRI_MONTHS[month - 1] ?? "";
}

/** غلاف افتراضي لكل قسم (اختياري) — بيظهر لأي تسجيل في القسم ملوش imageUrl خاص بيه */
export const CATEGORY_COVERS: Partial<Record<Category, string>> = {
  // fard: "/images/covers/fard.jpg",
  // mushaf: "/images/covers/mushaf.jpg",
};
