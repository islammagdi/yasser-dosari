import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KhatmaProgress } from "@/components/KhatmaProgress";
import { RecordingList } from "@/components/RecordingList";
import { WirdCard } from "@/components/WirdCard";
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
  const all = await recordings.list({ category: category.slug });
  // الفروض والتراويح كبار: بنبعت للمتصفح أحدث سنة بس، والباقي بيتجاب لما الزائر يفتح السنة
  const byYear = category.slug === "fard" || category.slug === "taraweeh";
  const years = byYear ? [...new Set(all.map((r) => r.hijriYear).filter((y): y is number => !!y))].sort((a, b) => b - a) : [];
  const items = byYear && years.length ? all.filter((r) => r.hijriYear === years[0]) : all;

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
        yearSource={byYear && years.length ? { category: category.slug, years } : undefined}
        extra={
          category.slug === "mushaf" ? (
            <>
              <WirdCard items={items} />
              <KhatmaProgress items={items} />
            </>
          ) : undefined
        }
      />
    </>
  );
}