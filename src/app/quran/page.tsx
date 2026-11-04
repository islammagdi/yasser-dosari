import type { Metadata } from "next";
import { QuranIndex } from "@/components/QuranIndex";
import { surahIndex } from "@/lib/api/quranText";

export const metadata: Metadata = {
  title: "القرآن الكريم",
  description: "اقرأ القرآن الكريم بالرسم العثماني، سورة سورة.",
};

export const revalidate = 2592000;

export default async function QuranPage() {
  const surahs = await surahIndex();
  return (
    <>
      <div aria-hidden className="pattern-stars page-pattern" />
      <QuranIndex surahs={surahs} />
    </>
  );
}