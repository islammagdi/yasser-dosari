import type { MetadataRoute } from "next";
import { recordings } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";
import { siteUrl } from "@/lib/site";

// الخريطة بتتبني من نفس البيانات اللي الموقع بيعرضها، وبتتحدّث كل ساعة
export const revalidate = 3600;

/** خريطة الموقع لمحركات البحث: الصفحات الثابتة، والأقسام، وكل تلاوة، وسور المصحف للقراءة */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/quran`, changeFrequency: "yearly", priority: 0.7 },
    { url: `${siteUrl}/about`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/imamate`, changeFrequency: "daily", priority: 0.8 },
  ];

  // لو مصدر من المصادر وقع، الخريطة تطلع بالباقي بدل ما تفشل كلها
  const lists = await Promise.all(
    CATEGORIES.map((c) => recordings.list({ category: c.slug }).catch(() => [])),
  );

  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((c, i) => {
    const latest = lists[i].reduce<string | undefined>(
      (max, r) => (r.addedAt && (!max || r.addedAt > max) ? r.addedAt : max),
      undefined,
    );
    return {
      url: `${siteUrl}/${c.slug}`,
      lastModified: latest ? new Date(latest) : undefined,
      changeFrequency: c.slug === "mushaf" ? "monthly" : "daily",
      priority: 0.8,
    };
  });

  const recordingPages: MetadataRoute.Sitemap = lists.flat().map((r) => ({
    url: `${siteUrl}/${r.category}/${encodeURIComponent(r.id)}`,
    lastModified: r.addedAt ? new Date(r.addedAt) : undefined,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const surahPages: MetadataRoute.Sitemap = Array.from({ length: 114 }, (_, i) => ({
    url: `${siteUrl}/quran/${i + 1}`,
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  // صفحات السور (فهرس + ١١٤ صفحة): كل سورة بتلاواتها
  const surahListening: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/surah`, changeFrequency: "weekly", priority: 0.8 },
    ...Array.from({ length: 114 }, (_, i) => ({
      url: `${siteUrl}/surah/${i + 1}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];

  return [...staticPages, ...categoryPages, ...surahListening, ...recordingPages, ...surahPages];
}