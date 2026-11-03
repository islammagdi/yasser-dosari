import Image from "next/image";
import type { Recording } from "@/types";
import { CATEGORY_COVERS } from "@/lib/categories";
import { CategoryIcon } from "./icons";

interface Props {
  recording: Recording;
  className?: string;
  sizes?: string;
  /** نص على الغلاف، زي رقم السورة أو الليلة */
  label?: string;
  /** "lg" للكروت المربعة الكبيرة، "sm" للأغلفة الصغيرة (المشغّل والهيرو) */
  size?: "sm" | "lg";
}

/** صورة الكارت. لو التسجيل ملوش صورة بيظهر غلاف مولّد بنقشة الموقع وأيقونة القسم */
export function RecordingCover({ recording, className = "", sizes = "64px", label, size = "sm" }: Props) {
  // الترتيب: صورة التسجيل نفسه ← غلاف القسم ← الغلاف المولّد
  const src = recording.imageUrl ?? CATEGORY_COVERS[recording.category];
  const lg = size === "lg";

  return (
    <span className={`relative block overflow-hidden bg-gradient-to-br from-emerald to-surface ${className}`}>
      {src ? (
        <>
          <Image src={src} alt="" fill sizes={sizes} className="object-cover" />
          {label && (
            <span
              className={`absolute start-1 rounded-md bg-ink/80 font-semibold text-gold-soft ${
                lg ? "bottom-2 start-2 px-2 py-0.5 text-sm" : "bottom-1 px-1.5 text-xs"
              }`}
            >
              {label}
            </span>
          )}
        </>
      ) : (
        <>
          <span aria-hidden className={`pattern-stars absolute inset-0 ${lg ? "opacity-20" : "opacity-25"}`} />
          <span className="absolute inset-0 flex items-center justify-center text-gold">
            {label ? (
              <span className={`font-display font-bold leading-none ${lg ? "text-6xl" : "text-2xl"}`}>{label}</span>
            ) : (
              <CategoryIcon category={recording.category} className={lg ? "h-1/3 w-1/3" : "h-1/2 w-1/2"} />
            )}
          </span>
        </>
      )}
    </span>
  );
}