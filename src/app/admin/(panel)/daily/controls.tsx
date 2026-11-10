"use client";

import { useState, useTransition } from "react";
import { addDaily, removeDaily, unpinDaily, type ActionResult } from "../../actions";

const field = "min-h-11 rounded-xl border border-line-strong bg-ink px-3 text-text";

export function DailyAdd() {
  const [link, setLink] = useState("");
  const [date, setDate] = useState("");
  const [pending, start] = useTransition();
  const [r, setR] = useState<ActionResult | null>(null);
  return (
    <section className="glass-card flex flex-col gap-3 rounded-3xl p-5 text-sm">
      <h2 className="font-display text-2xl font-bold text-gold-soft">إضافة تلاوة</h2>
      <label className="flex flex-col gap-1">
        رابط صفحة التلاوة من الموقع
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://…/fard/yt-… أو /mushaf/mushaf-018"
          dir="ltr"
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1">
        تثبيت على يوم معيّن (اختياري، بالتاريخ الميلادي)
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${field} w-52`} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || !link.trim()}
          onClick={() =>
            start(async () => {
              const res = await addDaily(link, date || undefined);
              setR(res);
              if (res.ok) {
                setLink("");
                setDate("");
              }
            })
          }
          className="min-h-11 rounded-full bg-gold px-6 font-semibold text-gold-ink hover:bg-gold-soft disabled:opacity-50"
        >
          {pending ? "جارٍ الإضافة…" : "إضافة"}
        </button>
        {r && <span className={r.ok ? "text-gold-soft" : "text-[#E5636B]"}>{r.message}</span>}
      </div>
    </section>
  );
}

function Small({ label, run }: { label: string; run: () => Promise<ActionResult> }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => void (await run()))} className="min-h-10 px-3 text-[#E5636B] hover:underline disabled:opacity-50">
      {pending ? "…" : label}
    </button>
  );
}

export const DailyRemove = ({ id }: { id: string }) => <Small label="حذف" run={() => removeDaily(id)} />;
export const DailyUnpin = ({ date }: { date: string }) => <Small label="إلغاء التثبيت" run={() => unpinDaily(date)} />;
