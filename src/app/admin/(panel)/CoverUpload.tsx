"use client";

import { useRef, useState } from "react";
import { attachCover, prepareCover } from "../actions";

/** زرار اختيار غلاف لتسجيل خاص: بيرفع الصورة على R2 مباشرة وبيربطها بالتسجيل */
export function CoverUpload({ id, hasCover, onDone }: { id: string; hasCover: boolean; onDone?: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ busy: boolean; msg?: string; ok?: boolean }>({ busy: false });

  const pick = async (file: File) => {
    setState({ busy: true, msg: "جارٍ الرفع…" });
    try {
      const prep = await prepareCover(id, file.name);
      if (!prep.ok) throw new Error(prep.message);
      const res = await fetch(prep.url, { method: "PUT", body: file, headers: file.type ? { "Content-Type": file.type } : undefined });
      if (!res.ok) throw new Error(`R2 رفض الرفع (${res.status})`);
      const r = await attachCover(id, prep.key);
      setState({ busy: false, msg: r.message, ok: r.ok });
      if (r.ok) onDone?.();
    } catch (err) {
      setState({ busy: false, ok: false, msg: err instanceof Error ? err.message : "تعذّر الرفع. اتأكد من إعداد CORS على الـ bucket." });
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={state.busy}
        className="min-h-10 rounded-full border border-gold/50 px-4 text-sm font-semibold text-gold-soft hover:bg-gold/10 disabled:opacity-50"
      >
        {state.busy ? "جارٍ الرفع…" : hasCover ? "تغيير الغلاف" : "إضافة غلاف"}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pick(f);
          e.target.value = "";
        }}
      />
      {state.msg && !state.busy && <span className={`text-xs ${state.ok ? "text-gold-soft" : "text-[#E5636B]"}`}>{state.msg}</span>}
    </span>
  );
}
