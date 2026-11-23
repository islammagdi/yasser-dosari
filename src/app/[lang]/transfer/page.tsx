import type { Metadata } from "next";
import { pageMeta, type LangParams } from "@/lib/i18n/server";
import { TransferView } from "@/components/TransferView";

export function generateMetadata({ params }: { params: LangParams }): Metadata {
  return pageMeta(params, "/transfer", { title: "نقل بياناتي", robots: { index: false, follow: true } });
}

export default function TransferPage() {
  return <TransferView />;
}
