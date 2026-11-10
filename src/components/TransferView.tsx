"use client";

import { useEffect, useState } from "react";
import { collect, fromCode, parseBackup, restore, summarize, toCode, type Backup } from "@/lib/transfer";

/** نقل البيانات: من الجهاز القديم (كود أو ملف) ← للجهاز الجديد */
export function TransferView() {
  const [mine, setMine] = useState<{ backup: Backup; code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [input, setInput] = useState("");
  const [incoming, setIncoming] = useState<Backup | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const backup = collect();
    toCode(backup).then((code) => setMine({ backup, code }));
  }, []);

  const mySummary = mine ? summarize(mine.backup) : [];

  const copy = async () => {
    if (!mine) return;
    await navigator.clipboard.writeText(mine.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  const share = async () => {
    if (!mine) return;
    try {
      await navigator.share({ text: mine.code });
    } catch {
      /* المستخدم لغى */
    }
  };
  const download = () => {
    if (!mine) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(mine.backup)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `yasser-dosari-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const readCode = async (text: string) => {
    setInput(text);
    setError("");
    setIncoming(null);
    if (!text.trim()) return;
    const b = text.trim().startsWith("{") ? parseBackup(text) : await fromCode(text);
    if (b) setIncoming(b);
    else setError("الكود غير صحيح أو ناقص. تأكد أنك نسخته كاملًا.");
  };
  const readFile = async (f: File | undefined) => {
    if (f) await readCode(await f.text());
  };
  const apply = () => {
    if (!incoming) return;
    restore(incoming);
    window.location.href = "/";
  };

  const btn = "min-h-11 rounded-full px-5 text-sm font-semibold transition-colors";
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">نقل بياناتي</h1>
        <p className="max-w-2xl text-lg leading-8 text-muted">
          المفضلة وقوائم التشغيل والختمة والورد ومكانك في التلاوات محفوظة على هذا الجهاز فقط. لنقلها إلى جهاز آخر: انسخ الكود من هنا، وافتح الصفحة نفسها على الجهاز الجديد، والصقه.
        </p>
      </div>

      <section className="glass-card flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
        <h2 className="font-display text-2xl font-bold text-gold-soft">١. من هذا الجهاز</h2>
        {!mine ? (
          <p className="text-muted">جارٍ التجهيز…</p>
        ) : mySummary.length === 0 ? (
          <p className="text-muted">لا توجد بيانات محفوظة على هذا الجهاز بعد.</p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-2 text-sm">
              {mySummary.map((s) => (
                <li key={s} className="rounded-full bg-white/5 px-3 py-1">{s}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              {canShare && (
                <button type="button" onClick={share} className={`${btn} bg-gold text-gold-ink hover:bg-gold-soft`}>
                  إرسال الكود (واتساب وغيره)
                </button>
              )}
              <button type="button" onClick={copy} className={`${btn} ${canShare ? "border border-line-strong text-gold-soft" : "bg-gold text-gold-ink hover:bg-gold-soft"}`}>
                {copied ? "تم النسخ ✓" : "نسخ الكود"}
              </button>
              <button type="button" onClick={download} className={`${btn} border border-line-strong text-gold-soft`}>
                تنزيل كملف
              </button>
            </div>
            <p className="text-xs leading-6 text-muted">
              أسهل طريقة: أرسل الكود لنفسك على واتساب، وافتحه من الجهاز الجديد. لا تشاركه مع أحد، فهو يحتوي على بياناتك.
            </p>
          </>
        )}
      </section>

      <section className="glass-card flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
        <h2 className="font-display text-2xl font-bold text-gold-soft">٢. إلى هذا الجهاز</h2>
        <textarea
          value={input}
          onChange={(e) => readCode(e.target.value)}
          placeholder="الصق الكود هنا (يبدأ بـ YD1:)"
          dir="ltr"
          rows={4}
          className="w-full rounded-2xl border border-line-strong bg-ink p-4 font-mono text-xs text-text"
        />
        <label className="flex flex-wrap items-center gap-2 text-sm text-muted">
          أو اختر الملف:
          <input type="file" accept="application/json,.json" onChange={(e) => readFile(e.target.files?.[0])} className="text-sm" />
        </label>
        {error && <p className="text-sm text-[#E5636B]">{error}</p>}
        {incoming && (
          <div className="flex flex-col gap-3 rounded-2xl border border-gold/40 bg-gold/5 p-4">
            <p className="font-semibold">سيتم نقل:</p>
            <ul className="flex flex-wrap gap-2 text-sm">
              {summarize(incoming).map((s) => (
                <li key={s} className="rounded-full bg-white/5 px-3 py-1">{s}</li>
              ))}
            </ul>
            <p className="text-sm text-muted">ستحلّ هذه البيانات محل الموجود على هذا الجهاز.</p>
            <button type="button" onClick={apply} className={`${btn} self-start bg-gold text-gold-ink hover:bg-gold-soft`}>
              نقل البيانات
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
