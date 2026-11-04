import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** بيسمح لمحركات البحث بكل الموقع ما عدا الـ API، وبيدلّها على الخريطة */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}