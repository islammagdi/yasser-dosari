import type { Recording } from "@/types";
import { normalizeArabic } from "./format";

/** كل كلمة في البحث لازم تكون موجودة (بأي ترتيب): "الفجر الزخرف" بتلاقي فجر فيه الزخرف */
/** للإنجليزي: "Al-Kahf" و "alkahf" و "Ya'Sin" بيتطابقوا */
const latin = (s: string) => s.replace(/[-'’ʼ`]/g, "");

export function searchTerms(query: string): string[] {
  return latin(normalizeArabic(query)).split(/\s+/).filter(Boolean);
}

export function matchesSearch(r: Recording, terms: string[]): boolean {
  if (!terms.length) return true;
  // العنوان بالإنجليزي كمان، عشان البحث في النسخة الإنجليزي
  const text = latin(normalizeArabic(`${r.title} ${r.subtitle ?? ""} ${r.searchText ?? ""} ${r.titleEn ?? ""} ${r.subtitleEn ?? ""}`));
  return terms.every((t) => text.includes(t));
}