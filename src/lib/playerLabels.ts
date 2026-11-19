import { getCategory as cat } from "@/lib/categories";

/** اسم القسم للعرض في قايمة المشغّل */
export const getCategory = (slug: string) => cat(slug as never)?.title ?? "";
export const SLEEP_LABEL = "إيقاف التشغيل تلقائيًا:";
