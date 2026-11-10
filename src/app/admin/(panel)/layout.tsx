import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin/auth";
import { r2Enabled } from "@/lib/admin/r2";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/imamate", label: "جدول الإمامة" },
  { href: "/admin/ramadan", label: "جدول رمضان" },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!isAdmin()) redirect("/admin/login");
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <nav aria-label="أقسام اللوحة" className="flex flex-wrap gap-2">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="min-h-11 rounded-full border border-line-strong px-4 py-2.5 text-sm font-semibold text-gold-soft hover:border-gold/50">
              {n.label}
            </Link>
          ))}
        </nav>
        <form action={logout}>
          <button type="submit" className="min-h-11 px-3 text-sm text-muted hover:text-text">
            تسجيل الخروج
          </button>
        </form>
      </div>
      {!r2Enabled() && (
        <p className="rounded-2xl border border-[#E5636B]/50 p-4 text-sm">
          متغيرات R2 مش متظبطة، فالحفظ مش هيشتغل. راجع R2_ENDPOINT و R2_ACCESS_KEY_ID و R2_SECRET_ACCESS_KEY.
        </p>
      )}
      {children}
    </>
  );
}
