import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-page flex-col gap-4 px-4 pb-32 pt-8 text-sm text-muted sm:px-6 md:flex-row md:items-center md:justify-between">
        <p className="leading-7">
          موقع تطوعي غير رسمي. الموقع الرسمي للشيخ:{" "}
          <a href="https://yaldosry.com" target="_blank" rel="noopener noreferrer" className="text-gold-soft underline-offset-4 hover:underline">
            yaldosry.com
          </a>
        </p>
        <nav aria-label="روابط الموقع" className="flex flex-wrap gap-x-5 gap-y-2">
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