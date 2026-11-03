import { FridayKahf } from "@/components/FridayKahf";
import { Hero } from "@/components/Hero";
import { RamadanCard } from "@/components/RamadanCard";
import { HomeBrowser, type HomeSection } from "@/components/HomeBrowser";
import { recordings } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";

export default async function HomePage() {
  const [sections, recent, imamate, mushaf, taraweeh] = await Promise.all([
    Promise.all(
      CATEGORIES.map(async (c): Promise<HomeSection> => {
        const all = await recordings.list({ category: c.slug });
        return { slug: c.slug, title: c.title, description: c.description, total: all.length, latest: all.slice(0, 5) };
      }),
    ),
    recordings.recent(4),
    recordings.imamate(),
    recordings.list({ category: "mushaf" }),
    recordings.list({ category: "taraweeh" }),
  ]);

  // سورة الكهف: الصوت أولًا، ولو مش موجود نسخة الفيديو
  const kahf = mushaf.find((r) => r.surah === 18 && !r.youtubeId) ?? mushaf.find((r) => r.surah === 18) ?? null;

  return (
    <div className="flex flex-col gap-12">
      <Hero recent={recent} imamate={imamate} />
      <RamadanCard slots={imamate} recordings={taraweeh} />
      <FridayKahf kahf={kahf} />
      <HomeBrowser sections={sections} />
    </div>
  );
}