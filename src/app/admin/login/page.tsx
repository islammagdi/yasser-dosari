import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: { expired?: string } }) {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-10">
      <h1 className="font-display text-3xl font-bold">لوحة التحكم</h1>
      {searchParams.expired && (
        <p className="rounded-2xl border border-gold/40 bg-gold/5 p-3 text-sm">تم تسجيل خروجك تلقائيًا بعد فترة من عدم النشاط. سجّل الدخول مرة أخرى.</p>
      )}
      <LoginForm />
    </div>
  );
}
