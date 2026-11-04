import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchView } from "@/components/SearchView";

export const metadata: Metadata = { title: "البحث", robots: { index: false, follow: true } };

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