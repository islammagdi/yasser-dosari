import type { Metadata } from "next";
import { pageMeta, type LangParams } from "@/lib/i18n/server";
import { RadioView } from "@/components/RadioView";
import { recordings } from "@/lib/api";
import type { Category, Recording } from "@/types";

const DESC = "إذاعة الشيخ ياسر الدوسري: تلاوات مختارة عشوائيًا تشتغل ورا بعض من غير توقف.";

export function generateMetadata({ params }: { params: LangParams }): Metadata {
  return pageMeta(params, "/radio", { title: "الإذاعة", description: DESC });
}

// نفس تحديث باقي الصفحات: التلاوات الجديدة بتدخل الإذاعة تلقائيًا
export const revalidate = 3600;

/** الأقسام اللي بتدخل الإذاعة: التلاوات بس (من غير الخطب والدروس) */
const RADIO_CATEGORIES: Category[] = ["fard", "taraweeh", "rare", "mushaf"];

export default async function RadioPage() {
  const lists = await Promise.all(RADIO_CATEGORIES.map((c) => recordings.list({ category: c }).catch(() => [] as Recording[])));
  // الإذاعة صوت بس: تسجيلات يوتيوب محتاجة لوحة فيديو ظاهرة فمينفعش تشتغل في الخلفية
  const pool = lists
    .flat()
    .filter((r) => r.audioUrl && !r.youtubeId)
    .map(({ searchText: _s, ...r }) => r);

  return (
    <>
      <div aria-hidden className="pattern-stars page-pattern" />
      <RadioView pool={pool} />
    </>
  );
}
