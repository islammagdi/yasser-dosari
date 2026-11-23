import type { Metadata } from "next";
import { pageL, pageMeta, type LangParams } from "@/lib/i18n/server";
import { FavoritesView } from "@/components/FavoritesView";
import { recordings } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";
import { clipFileUrl, loadClips } from "@/lib/clips";

export function generateMetadata({ params }: { params: LangParams }): Metadata {
  return pageMeta(params, "/favorites", { title: "المفضلة", robots: { index: false, follow: true } });
}

export default async function FavoritesPage({ params }: { params: LangParams }) {
  // المفضلة محفوظة في المتصفح، فبنبعت كل التسجيلات والفلترة بتحصل هناك
  const all = (await Promise.all(CATEGORIES.map((c) => recordings.list({ category: c.slug })))).flat();
  const clips = (await loadClips()).map((c) => ({ id: c.id, title: c.title, poster: clipFileUrl(c.posterKey) }));

  return (
    <>
      <div aria-hidden className="pattern-stars page-pattern" />
      <FavoritesView all={all} clips={clips} title={pageL(params).t("المفضلة")} />
    </>
  );
}