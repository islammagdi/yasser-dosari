import type { Metadata } from "next";
import { SavedView } from "@/components/SavedView";

export const metadata: Metadata = { title: "المحفوظات", robots: { index: false, follow: true } };

export default function SavedPage() {
  return <SavedView />;
}
