import type { Metadata, Viewport } from "next";
import { SiteShell } from "@/components/SiteShell";
import "../globals.css";

// اللوحة متتعرضش في جوجل، وبالعربي دايمًا
export const metadata: Metadata = {
  title: "لوحة التحكم",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#F4EEE1", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return (
    <SiteShell lang="ar">
      <div className="flex flex-col gap-8">{children}</div>
    </SiteShell>
  );
}
