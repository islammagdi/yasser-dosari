import { ContinueListening } from "@/components/ContinueListening";
import { DailyRecitation } from "@/components/DailyRecitation";
import { loadDaily } from "@/lib/admin/daily";
import { WirdCard } from "@/components/WirdCard";
import { FridayKahf } from "@/components/FridayKahf";
import { Hero } from "@/components/Hero";
import { RamadanCard } from "@/components/RamadanCard";
import { HomeBrowser, type HomeSection } from "@/components/HomeBrowser";
import { recordings } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";
import type { Recording } from "@/types";

/** رقم واحد من التاريخ الهجري عشان المقارنة: ١٤٤٨/٠٤/٠٨ ← 14480408 */
const hijriKey = (r: Recording) =>
  r.hijriYear && r.hijriMonth && r.hijriDay ? r.hijriYear * 10000 + r.hijriMonth * 100 + r.hijriDay : null;

/**
 * الأحدث الأول: بتاريخ الصلاة الهجري، ولو متساوي أو مش موجود بتاريخ الرفع.
 * يوتيوب بيرجّع الفيديوهات بترتيب القوايم مش بالتاريخ، فمن غير ده "الأحدث" بيطلع أي حاجة.
 */
function newestFirst(list: Recording[]): Recording[] {
  return [...list].sort((a, b) => {
    const ha = hijriKey(a);
    const hb = hijriKey(b);
    if (ha != null && hb != null && ha !== hb) return hb - ha;
    return (b.addedAt ?? "").localeCompare(a.addedAt ?? "");
  });
}

export default async function HomePage() {
  const [sections, recent, imamate, mushaf, taraweeh, daily, allLists] = await Promise.all([
    Promise.all(
      CATEGORIES.map(async (c): Promise<HomeSection> => {
        const all = await recordings.list({ category: c.slug });
        // المصحف بيفضل بترتيب السور، والباقي الأحدث الأول
        const ordered = c.slug === "mushaf" ? all : newestFirst(all);
        // تواريخ آخر ٥٠ تسجيل، عشان التابات تعرف فيه جديد من آخر زيارة ولا لأ
        const recentAdded = all.flatMap((r) => (r.addedAt ? [r.addedAt] : [])).sort().slice(-50);
        return { slug: c.slug, title: c.title, description: c.description, total: all.length, latest: ordered.slice(0, 5), recentAdded };
      }),
    ),
    recordings.recent(4),
    recordings.imamate(),
    recordings.list({ category: "mushaf" }),
    recordings.list({ category: "taraweeh" }),
    loadDaily(),
    // كل التسجيلات، عشان نلاقي تلاوات اليوم بالـ ID بتاعها
    Promise.all(CATEGORIES.map((c) => recordings.list({ category: c.slug }))),
  ]);

  // تلاوة اليوم: بنبعت للمتصفح التلاوات المختارة بس، وهو بيختار حسب تاريخ النهارده
  const byId = new Map(allLists.flat().map((r) => [r.id, r]));
  const dailyPool = (daily?.pool ?? []).flatMap((id) => byId.get(id) ?? []);
  const dailyPinned = Object.fromEntries(
    Object.entries(daily?.pinned ?? {}).flatMap(([date, id]) => (byId.has(id) ? [[date, byId.get(id)!]] : [])),
  );

  // سورة الكهف: الصوت أولًا، ولو مش موجود نسخة الفيديو
  // الورد: النسخة الصوتية بس لو موجودة، عشان منبعتش قايمة المصحف مرتين للمتصفح
  const wirdItems = mushaf.some((r) => !r.youtubeId) ? mushaf.filter((r) => !r.youtubeId) : mushaf;
  const kahf = mushaf.find((r) => r.surah === 18 && !r.youtubeId) ?? mushaf.find((r) => r.surah === 18) ?? null;

  return (
    <div className="flex flex-col gap-12">
      <Hero recent={recent} imamate={imamate} />
      <DailyRecitation pool={dailyPool} pinned={dailyPinned} />
      <ContinueListening />
      <WirdCard items={wirdItems} dismissible />
      <RamadanCard slots={imamate} recordings={taraweeh} />
      <FridayKahf kahf={kahf} />
      <HomeBrowser sections={sections} />
    </div>
  );
}