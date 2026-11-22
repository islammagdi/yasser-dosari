import type { Recording } from "@/types";

/** رقم واحد من التاريخ الهجري عشان المقارنة (التراويح: الليلة مكان اليوم في رمضان) */
function hijriKey(r: Recording): number {
  if (!r.hijriYear) return 0;
  const month = r.hijriMonth ?? (r.night ? 9 : 0);
  const day = r.hijriDay ?? r.night ?? 0;
  return r.hijriYear * 10000 + month * 100 + day;
}

/** المضاف حديثًا الأول (بتاريخ الإضافة)، ولو متساوي فالأحدث بتاريخ الصلاة */
export function newestAdded(list: Recording[]): Recording[] {
  return [...list].sort((a, b) => (b.addedAt ?? "").localeCompare(a.addedAt ?? "") || hijriKey(b) - hijriKey(a));
}
