import type { Metadata } from "next";
import { PlaylistsView } from "@/components/PlaylistsView";

// القوائم محفوظة على جهاز كل زائر، فالصفحة ملهاش لازمة في جوجل
export const metadata: Metadata = { title: "قوائم التشغيل", robots: { index: false, follow: true } };

export default function PlaylistsPage() {
  return <PlaylistsView />;
}
