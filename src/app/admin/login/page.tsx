import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  if (isAdmin()) redirect("/admin");
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-10">
      <h1 className="font-display text-3xl font-bold">لوحة التحكم</h1>
      <LoginForm />
    </div>
  );
}
