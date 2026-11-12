"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * اختصار لوحة الأدمن: Ctrl+Shift+A.
 * ده للسرعة بس، مش حماية: لوحة الأدمن لسه محمية بالباسورد.
 */
export function AdminShortcut() {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // e.code مش e.key: عشان يشتغل والكيبورد عربي (الحرف هيبقى "ش" مش "a")
      if (!e.ctrlKey || !e.shiftKey || e.code !== "KeyA") return;

      // متشتغلش وإنت بتكتب في خانة بحث أو نص
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;

      e.preventDefault();
      router.push("/admin");
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router]);

  return null;
}