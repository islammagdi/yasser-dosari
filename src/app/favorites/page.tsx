import type { Metadata } from "next";
import { FavoritesView } from "@/components/FavoritesView";
import { recordings } from "@/lib/api";
import { CATEGORIES } from "@/lib/categories";

export const metadata: Metadata = { title: "المفضلة" };

export default async function FavoritesPage() {
  // المفضلة محفوظة في المتصفح، فبنبعت كل التسجيلات والفلترة بتحصل هناك
  const all = (await Promise.all(CATEGORIES.map((c) => recordings.list({ category: c.slug })))).flat();

  return (
    <>
      <div aria-hidden className="pattern-stars page-pattern" />
      <FavoritesView all={all} title="المفضلة" />
    </>
  );
}