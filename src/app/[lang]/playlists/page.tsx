import type { Metadata } from "next";
import { pageMeta, type LangParams } from "@/lib/i18n/server";
import { PlaylistsView } from "@/components/PlaylistsView";

// القوائم محفوظة على جهاز كل زائر، فالصفحة ملهاش لازمة في جوجل
export function generateMetadata({ params }: { params: LangParams }): Metadata {
  return pageMeta(params, "/playlists", { title: "قوائم التشغيل", robots: { index: false, follow: true } });
}

export default function PlaylistsPage() {
  return <PlaylistsView />;
}
