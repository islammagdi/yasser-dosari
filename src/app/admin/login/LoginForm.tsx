"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 rounded-full bg-accent font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-50"
    >
      {pending ? "جارٍ الدخول…" : "دخول"}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useFormState(login, {});
  return (
    <form action={action} className="glass-card flex flex-col gap-4 rounded-3xl p-6">
      <label className="flex flex-col gap-2 text-sm">
        كلمة المرور
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="min-h-12 rounded-xl border border-line-strong bg-ink px-4 text-base text-text"
        />
      </label>
      {state.error && <p className="text-sm text-[#E5636B]">{state.error}</p>}
      <Submit />
    </form>
  );
}
