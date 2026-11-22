"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * صورة الغلاف مع خطة بديلة: لو الصورة فشلت في التحميل، بتختفي والغلاف المولّد اللي تحتها بيبان
 * (بدل أيقونة الصورة المكسورة).
 *
 * كل الأغلفة بتتعرض زي ما هي من غير تحسين Vercel (unoptimized)، صور يوتيوب وأغلفة R2:
 * التحسين بيستهلك حصة "Image Optimization" المجانية، ولما الحصة بتخلص (أو دومين R2 مش متضاف في
 * إعدادات الصور وقت الـ build) الصورة بترجع خطأ، فبتختفي هنا من غير ما حد يلاحظ،
 * وده اللي كان بيخلّي غلاف التسجيل يظهر في لوحة التحكم ومايظهرش في صفحة التلاوة.
 * عشان كده الأغلفة المرفوعة لازم تبقى JPG مضغوط (حوالي ٢٠٠ كيلو)، مش PNG.
 */
export function CoverImage({ src, sizes }: { src: string; sizes: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <Image src={src} alt="" fill sizes={sizes} unoptimized onError={() => setFailed(true)} className="object-cover" />;
}
