"use client";

import { useState, useTransition } from "react";
import { sendPush, type ActionResult } from "../../actions";

const field = "min-h-11 rounded-xl border border-line-strong bg-ink px-3 text-text";

export function NotifyForm({ preset }: { preset: { title: string; body: string; url: string } }) {
  const [title, setTitle] = useState(preset.title);
  const [body, setBody] = useState(preset.body);
  const [url, setUrl] = useState(preset.url);
  const [pending, start] = useTransition();
  const [r, setR] = useState<ActionResult | null>(null);

  return (
    <section className="glass-card flex flex-col gap-4 rounded-3xl p-5 text-sm">
      <label className="flex flex-col gap-1">
        العنوان
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} className={field} />
      </label>
      <label className="flex flex-col gap-1">
        النص
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={160} rows={3} className={`${field} py-2`} />
      </label>
      <label className="flex flex-col gap-1">
        الرابط عند الضغط (صفحة من الموقع)
        <input value={url} onChange={(e) => setUrl(e.target.value)} dir="ltr" className={field} />
      </label>

      {/* معاينة شكل الإشعار */}
      <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-lg" />
        <div className="min-w-0">
          <p className="font-semibold">{title || "العنوان"}</p>
          <p className="text-muted">{body || "النص"}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => window.confirm("إرسال الإشعار لكل المشتركين؟") && start(async () => setR(await sendPush(title, body, url)))}
          className="min-h-12 rounded-full bg-gold px-8 font-semibold text-gold-ink hover:bg-gold-soft disabled:opacity-50"
        >
          {pending ? "جارٍ الإرسال…" : "إرسال"}
        </button>
        {r && <span className={r.ok ? "text-gold-soft" : "text-[#E5636B]"}>{r.message}</span>}
      </div>
    </section>
  );
}
