import type { Metadata } from "next";
import { pageMeta, type LangParams } from "@/lib/i18n/server";
import { SavedView } from "@/components/SavedView";

export function generateMetadata({ params }: { params: LangParams }): Metadata {
  return pageMeta(params, "/saved", { title: "المحفوظات", robots: { index: false, follow: true } });
}

export default function SavedPage() {
  return <SavedView />;
}
