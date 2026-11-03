import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <h1 className="font-display text-4xl font-bold">الصفحة دي مش موجودة</h1>
      <p className="text-muted">ممكن الرابط يكون اتغيّر. ارجع للرئيسية واختار القسم من هناك.</p>
      <Link href="/" className="flex min-h-11 items-center rounded-full bg-gold px-6 font-semibold text-gold-ink hover:bg-gold-soft">
        الرجوع للرئيسية
      </Link>
    </div>
  );
}
