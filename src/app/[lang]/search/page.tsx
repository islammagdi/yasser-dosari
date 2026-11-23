import type { Metadata } from "next";
import { pageMeta, type LangParams } from "@/lib/i18n/server";
import { Suspense } from "react";
import { SearchView } from "@/components/SearchView";

export function generateMetadata({ params }: { params: LangParams }): Metadata {
  return pageMeta(params, "/search", { title: "البحث", robots: { index: false, follow: true } });
}

export default function SearchPage() {
  return (
    <>
      <div aria-hidden className="pattern-stars page-pattern" />
      <Suspense>
        <SearchView />
      </Suspense>
    </>
  );
}