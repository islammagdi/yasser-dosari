import type { Lang } from "@/lib/i18n/config";

/** بيخلي الموقع قابل للتثبيت كتطبيق (PWA). نسخة لكل لغة، والإنجليزي بيفتح على /en */
export function manifestFor(lang: Lang) {
  const en = lang === "en";
  return {
    name: en ? "Sheikh Yasser Al-Dosari Recitations" : "تلاوات الشيخ ياسر الدوسري",
    short_name: en ? "Yasser Al-Dosari" : "ياسر الدوسري",
    description: en
      ? "Prayers led by Sheikh Yasser Al-Dosari at the Grand Mosque, the full recorded Mushaf, Taraweeh, and khutbahs and lectures."
      : "تلاوات الصلوات المفروضة من المسجد الحرام، والمصحف المسجل، وصلاة التراويح، والخطب والمحاضرات.",
    lang,
    dir: en ? "ltr" : "rtl",
    id: en ? "/en" : "/",
    start_url: en ? "/en" : "/",
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

export const manifestResponse = (lang: Lang) =>
  new Response(JSON.stringify(manifestFor(lang)), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
