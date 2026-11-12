import type { MetadataRoute } from "next";

/** بيخلي الموقع قابل للتثبيت كتطبيق (PWA) من كروم والمتصفحات التانية */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "تلاوات الشيخ ياسر الدوسري",
    short_name: "ياسر الدوسري",
    description: "تلاوات الصلوات المفروضة من المسجد الحرام، والمصحف المسجل، وصلاة التراويح، والخطب والمحاضرات.",
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4EEE1",
    theme_color: "#F4EEE1",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}