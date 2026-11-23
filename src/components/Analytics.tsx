"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/stats/track";

/** بيسجّل زيارة لكل صفحة، حتى التنقل جوه الموقع من غير reload */
export function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    // نستنى عنوان الصفحة الجديدة يتحدّث
    const t = window.setTimeout(() => track({ type: "pageview" }), 400);
    return () => window.clearTimeout(t);
  }, [pathname]);
  return null;
}
