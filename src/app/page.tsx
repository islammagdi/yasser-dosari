import { Hero } from "@/components/Hero";
import { HomeBrowser, type HomeSection } from "@/components/HomeBrowser";
import { recordings } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";

export default async function HomePage() {
  const [sections, recent, imamate] = await Promise.all([
    Promise.all(
      CATEGORIES.map(async (c): Promise<HomeSection> => {
        const all = await recordings.list({ category: c.slug });
        return { slug: c.slug, title: c.title, description: c.description, total: all.length, latest: all.slice(0, 5) };
      }),
    ),
    recordings.recent(4),
    recordings.imamate(),
  ]);

  return (
    <div className="flex flex-col gap-12">
      <Hero recent={recent} imamate={imamate} />
      <HomeBrowser sections={sections} />
    </div>
  );
}