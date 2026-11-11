"use client";

import { useState, useTransition } from "react";
import { restoreBackupAction, type ActionResult } from "../../actions";

export function RestoreButton({ name, backupKey, label }: { name: string; backupKey: string; label: string }) {
  const [pending, start] = useTransition();
  const [r, setR] = useState<ActionResult | null>(null);
  return (
    <span className="flex items-center gap-2">
      {r && <span className={r.ok ? "text-gold-soft" : "text-[#E5636B]"}>{r.message}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          window.confirm(`استرجاع الشكل اللي كان قبل حفظ ${label}؟ الشكل الحالي هيتحفظ نسخة احتياطية الأول.`) &&
          start(async () => setR(await restoreBackupAction(name, backupKey)))
        }
        className="min-h-10 rounded-full border border-gold/50 px-4 font-semibold text-gold-soft hover:bg-gold/10 disabled:opacity-50"
      >
        {pending ? "جارٍ الاسترجاع…" : "استرجاع"}
      </button>
    </span>
  );
}
