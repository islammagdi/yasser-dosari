/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // صور الفيديوهات المصغّرة من يوتيوب
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com" }],
  },
};

export default nextConfig;
