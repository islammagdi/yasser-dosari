// دومين ملفات الصوت (R2): صور أغلفة التسجيلات الخاصة بتترفع جنب الصوت
const audioHost = (() => {
  try {
    return new URL(process.env.AUDIO_BASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // صور الفيديوهات المصغّرة من يوتيوب، وأغلفة التسجيلات الخاصة من R2
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      ...(audioHost ? [{ protocol: "https", hostname: audioHost }] : []),
    ],
  },
    // اللغة: التحويل بيحصل في طبقة الـ routing بتاعة Vercel من غير ما أي function تشتغل
  async redirects() {
    return [
      { source: "/ar", destination: "/", permanent: true },
      // صور المشاركة المولّدة بتفضل على /ar/... لإن Next بيكتب رابطها بالمسار الداخلي
      { source: "/ar/:path((?!.*opengraph-image$).*)", destination: "/:path", permanent: true },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/ar" },
        {
          source: "/:path((?!en(?:/|$)|ar(?:/|$)|api(?:/|$)|admin(?:/|$)|_next/|.*\\..*).+)",
          destination: "/ar/:path",
        },
      ],
    };
  },
};

export default nextConfig;
