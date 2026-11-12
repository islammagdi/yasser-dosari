"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * صورة الغلاف مع خطة بديلة: لو الصورة فشلت في التحميل، بتختفي والغلاف المولّد اللي تحتها بيبان
 * (بدل أيقونة الصورة المكسورة).
 *
 * صور يوتيوب (i.ytimg.com) بتتعرض زي ما هي من غير تحسين Vercel: هي أصلًا JPEG مضغوطة بمقاسات ثابتة،
 * وتحسينها كان بيستهلك حصة "Image Optimization" المجانية، ولما الحصة تخلص الصور كلها بتقع.
 */
export function CoverImage({ src, sizes }: { src: string; sizes: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  const fromYoutube = src.includes("i.ytimg.com");
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      unoptimized={fromYoutube}
      onError={() => setFailed(true)}
      className="object-cover"
    />
  );
}
