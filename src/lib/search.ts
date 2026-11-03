import type { Recording } from "@/types";
import { normalizeArabic } from "./format";

/** كل كلمة في البحث لازم تكون موجودة (بأي ترتيب): "الفجر الزخرف" بتلاقي فجر فيه الزخرف */
export function searchTerms(query: string): string[] {
  return normalizeArabic(query).split(/\s+/).filter(Boolean);
}

export function matchesSearch(r: Recording, terms: string[]): boolean {
  if (!terms.length) return true;
  const text = normalizeArabic(`${r.title} ${r.subtitle ?? ""} ${r.searchText ?? ""}`);
  return terms.every((t) => text.includes(t));
}