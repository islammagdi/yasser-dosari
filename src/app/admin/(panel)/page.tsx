import Link from "next/link";

export default function AdminHome() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl font-bold">لوحة التحكم</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/admin/recordings" className="glass-card flex flex-col gap-1 rounded-3xl p-5 hover:border-gold/40">
          <span className="font-display text-2xl font-bold text-gold-soft">التسجيلات</span>
          <span className="text-sm text-muted">صنّف التسجيلات الجديدة، وعدّل أقسام وعناوين التسجيلات الموجودة</span>
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
