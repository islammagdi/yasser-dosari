import { FridayCard } from "@/components/FridayCard";
import { loadDaily } from "@/lib/admin/daily";
import { WirdCard } from "@/components/WirdCard";
import { FridayKahf } from "@/components/FridayKahf";
import { Hero } from "@/components/Hero";
import { ClipOfDay } from "@/components/ClipOfDay";
import { RadioCard } from "@/components/RadioCard";
import { HomeCollections } from "@/components/HomeCollections";
import { clipFileUrl, loadClips } from "@/lib/clips";
import { HomePlaylists } from "@/components/HomePlaylists";
import { ImamateLog } from "@/components/ImamateLog";
import { SurahMap } from "@/components/SurahMap";
import { homeCollections, surahStats } from "@/lib/homeCollections";
import { buildSurahIndex } from "@/lib/surahIndex";
import { InstallCard } from "@/components/InstallCard";
import { RamadanCard } from "@/components/RamadanCard";
import { HomeBrowser, type HomeSection } from "@/components/HomeBrowser";
import { recordings } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";
import type { Recording } from "@/types";
import type { Metadata } from "next";
import { pageMeta, type LangParams } from "@/lib/i18n/server";

export function generateMetadata({ params }: { params: LangParams }): Metadata {
  return pageMeta(params, "/", {});
}

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
  // الورد: كل نسخ المصحف (المرتل من mp3quran، والمركز السعودي)، والزائر بيختار يسمع من أنهي واحدة
  const wirdItems = mushaf;
  const kahf = mushaf.find((r) => r.surah === 18 && !r.youtubeId) ?? mushaf.find((r) => r.surah === 18) ?? null;

  // سجلّ الإمامة: الفروض في آخر ٣ شهور هجرية فيها تسجيلات بس، عشان منبعتش الأرشيف كله للمتصفح
  const fardAll = allLists.flat().filter((r) => r.category === "fard" && r.hijriYear && r.hijriMonth && r.hijriDay);
  const logMonths = [...new Set(fardAll.map((r) => r.hijriYear! * 100 + r.hijriMonth!))].sort((a, b) => b - a).slice(0, 3);
  const logRecordings = fardAll.filter((r) => logMonths.includes(r.hijriYear! * 100 + r.hijriMonth!));

  // خريطة السور والمجموعات: من نفس الفهرس اللي بيبني صفحة /surah (من وصف يوتيوب)
  const surahIndex = buildSurahIndex(allLists.flat());
  const stats = surahStats(surahIndex);
  const collections = homeCollections(allLists.flat(), surahIndex);

  // مقتطف اليوم: من آخر ٣٠ مقطع، والاختيار بيحصل في المتصفح بتاريخ مكة
  const clipCards = (await loadClips()).slice(0, 30).map((c) => ({ id: c.id, title: c.title, poster: clipFileUrl(c.posterKey) }));

  return (
    <div className="flex flex-col gap-12">
      {/* ميزة جديدة: الإذاعة راكبة فوق الهيرو على الديسكتوب، وعلى الموبايل بعد «أحدث صلوات الحرم» */}
      <Hero recent={recent} imamate={imamate} dailyPool={dailyPool} dailyPinned={dailyPinned} top={<RadioCard />} />
      <div className="lg:hidden">
        <RadioCard />
      </div>
      {/* يوم الجمعة بس (من مغرب الخميس): أول حاجة بعد الهيرو */}
      <FridayKahf kahf={kahf} />
      <FridayCard slots={imamate} />
      <ClipOfDay clips={clipCards} />
      <WirdCard items={wirdItems} dismissible />
      <SurahMap stats={stats} />
      <ImamateLog recordings={logRecordings} />
      <RamadanCard slots={imamate} recordings={taraweeh} />
      <HomeCollections collections={collections} />
      <HomePlaylists />
      {/* القسم اللي لسه مفيهوش تسجيلات (زي التلاوات النادرة في الأول) مبيظهرش كتاب */}
      <HomeBrowser sections={sections.filter((s) => s.total > 0)} />
      <InstallCard />
    </div>
  );
}