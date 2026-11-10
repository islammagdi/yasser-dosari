import type { Metadata } from "next";
import { TransferView } from "@/components/TransferView";

export const metadata: Metadata = { title: "نقل بياناتي", robots: { index: false, follow: true } };

export default function TransferPage() {
  return <TransferView />;
}
