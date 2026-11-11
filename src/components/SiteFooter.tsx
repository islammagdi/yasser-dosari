import Link from "next/link";
import { FEEDBACK_URL, feedbackHref } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-page flex-col gap-4 px-4 pb-32 pt-8 text-sm text-muted sm:px-6 md:flex-row md:items-center md:justify-between">
        <p className="leading-7">موقع تطوعي غير رسمي، لا يتبع الشيخ ولا أي جهة رسمية.</p>
        <nav aria-label="روابط الموقع" className="flex flex-wrap gap-x-5 gap-y-2">
          <a
            href={feedbackHref}
            {...(FEEDBACK_URL ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="flex min-h-11 items-center font-semibold text-gold-soft hover:text-gold"
          >
            اقترح تحسينًا
          </a>
          <Link href="/transfer" className="flex min-h-11 items-center hover:text-text">
            نقل بياناتي
          </Link>
          <Link href="/about" className="flex min-h-11 items-center hover:text-text">
            عن الموقع
          </Link>
          <Link href="/about#sources" className="flex min-h-11 items-center hover:text-text">
            المصادر
          </Link>
          <Link href="/about#privacy" className="flex min-h-11 items-center hover:text-text">
            سياسة الخصوصية
          </Link>
        </nav>
      </div>
    </footer>
  );
}