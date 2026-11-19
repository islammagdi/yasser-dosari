import Link from "next/link";
import { countReports } from "@/lib/admin/reports";
import { toArabicDigits } from "@/lib/format";

export default async function AdminHome() {
  const reports = await countReports();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl font-bold">لوحة التحكم</h1>
      {reports > 0 && (
        <Link href="/admin/reports" className="flex flex-col gap-1 rounded-3xl border border-[#E5636B]/50 p-5 hover:border-[#E5636B]">
          <span className="font-display text-2xl font-bold">{reports === 1 ? "فيه بلاغ جديد" : `فيه ${toArabicDigits(reports)} بلاغات جديدة`}</span>
          <span className="text-sm text-muted">مشاكل بلّغ عنها الزوار في تلاوات. افتحها علشان تسمع وتصلّح.</span>
        </Link>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/admin/status" className="glass-card flex flex-col gap-1 rounded-3xl p-5 hover:border-gold/40">
          <span className="font-display text-2xl font-bold text-gold-soft">حالة الموقع</span>
          <span className="text-sm text-muted">فحص سريع لكل أجزاء الموقع: يوتيوب، والتخزين، والصوتيات، والجدول، والإشعارات</span>
        </Link>
        <Link href="/admin/recordings" className="glass-card flex flex-col gap-1 rounded-3xl p-5 hover:border-gold/40">
          <span className="font-display text-2xl font-bold text-gold-soft">التسجيلات</span>
          <span className="text-sm text-muted">صنّف التسجيلات الجديدة، وعدّل أقسام وعناوين التسجيلات الموجودة</span>
        </Link>
        <Link href="/admin/daily" className="glass-card flex flex-col gap-1 rounded-3xl p-5 hover:border-gold/40">
          <span className="font-display text-2xl font-bold text-gold-soft">تلاوة اليوم</span>
          <span className="text-sm text-muted">اختر التلاوات التي تظهر في الرئيسية كل يوم</span>
        </Link>
        <Link href="/admin/imamate" className="glass-card flex flex-col gap-1 rounded-3xl p-5 hover:border-gold/40">
          <span className="font-display text-2xl font-bold text-gold-soft">جدول الإمامة</span>
          <span className="text-sm text-muted">أضف أسبوع الإمامة الجديد أو عدّل الأسابيع السابقة</span>
        </Link>
        <Link href="/admin/ramadan" className="glass-card flex flex-col gap-1 rounded-3xl p-5 hover:border-gold/40">
          <span className="font-display text-2xl font-bold text-gold-soft">جدول رمضان</span>
          <span className="text-sm text-muted">ليالي التراويح والتهجد التي يؤمها الشيخ</span>
        </Link>
      </div>
    </div>
  );
}
