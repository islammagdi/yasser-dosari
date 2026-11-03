import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecordingList } from "@/components/RecordingList";
import { recordings } from "@/lib/api";
import { CATEGORIES, getCategory } from "@/lib/categories";

interface Props {
  params: { category: string };
}

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const c = getCategory(params.category);
  return c ? { title: c.title, description: c.description } : {};
}

export default async function CategoryPage({ params }: Props) {
  const category = getCategory(params.category);
  if (!category) notFound();
  const items = await recordings.list({ category: category.slug });

  return (
    <>
      <div aria-hidden className="pattern-stars page-pattern" />
      <RecordingList
        title={category.title}
        items={items}
        searchable
        yearTabs={category.slug === "fard" || category.slug === "taraweeh"}
        groupByMonth={category.slug === "fard"}
        numbered={category.slug === "taraweeh" || category.slug === "mushaf"}
        typeFilter={category.slug === "lectures"}
        versionTabs={category.slug === "mushaf"}
      />
    </>
  );
}