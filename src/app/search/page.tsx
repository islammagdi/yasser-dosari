import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchView } from "@/components/SearchView";

export const metadata: Metadata = { title: "البحث" };

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