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
};

export default nextConfig;
