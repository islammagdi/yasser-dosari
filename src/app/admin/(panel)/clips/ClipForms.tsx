"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Clip } from "@/lib/clips";
import { SURAH_NAMES } from "@/lib/quran";
import { prepareClip, saveClip, type ActionResult, type ClipInput } from "../../actions";
import { faststart } from "@/lib/faststart";

export type Rec = { id: string; title: string };
const field = "min-h-11 w-full rounded-xl border border-line-strong bg-ink px-3 text-text";
const label = "flex flex-col gap-1.5 text-sm font-medium";

/** صورة مصغّرة من الفيديو نفسه (من ثانية ١ أو نصه لو أقصر)، من غير ما نرفعه الأول */
function makePoster(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    const done = (b: Blob | null) => {
      URL.revokeObjectURL(url);
      resolve(b);
    };
    v.onloadedmetadata = () => {
      v.currentTime = Math.min(1, (v.duration || 2) / 2);
    };
    v.onseeked = () => {
      const c = document.createElement("canvas");
      const scale = Math.min(1, 720 / Math.max(v.videoWidth, 1));
      c.width = Math.round(v.videoWidth * scale);
      c.height = Math.round(v.videoHeight * scale);
      const ctx = c.getContext("2d");
      if (!ctx) return done(null);
      ctx.drawImage(v, 0, 0, c.width, c.height);
      c.toBlob((b) => done(b), "image/jpeg", 0.82);
    };
    v.onerror = () => done(null);
    v.src = url;
  });
}

function put(url: string, body: Blob, type: string, onProgress?: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`R2 رفض الرفع (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("الرفع اتقطع. اتأكد من النت ومن إعداد CORS على الـ bucket."));
    xhr.send(body);
  });
}

/**
 * لو اللي اتلزق رابط تلاوة من الموقع نفسه (https://…/fard/fard-1446-7-1-isha أو /fard/…)،
 * بيرجّع الـ id بتاعها (آخر جزء في الرابط). أي حاجة تانية بترجع undefined.
 */
function recordingIdFromLink(text: string): string | undefined {
  const t = text.trim();
  if (!/^(https?:\/\/|\/)/.test(t)) return undefined;
  try {
    const parts = new URL(t, "https://x").pathname.split("/").filter(Boolean);
    return parts.length >= 2 ? decodeURIComponent(parts[parts.length - 1]) : undefined;
  } catch {
    return undefined;
  }
}

/** خانات بيانات المقطع: مشتركة بين الرفع والتعديل */
export function MetaFields({ v, set, recordings, disabled }: { v: ClipInput; set: (p: Partial<ClipInput>) => void; recordings: Rec[]; disabled?: boolean }) {
  const recTitle = recordings.find((r) => r.id === v.recordingId)?.title ?? "";
  const [recQuery, setRecQuery] = useState(recTitle);
  useEffect(() => setRecQuery(recTitle), [recTitle]);
  const listId = useRef(`recs-${Math.random().toString(36).slice(2)}`).current;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className={`${label} sm:col-span-2`}>
        العنوان
        <input value={v.title} onChange={(e) => set({ title: e.target.value })} disabled={disabled} className={field} placeholder="مثلًا: ﴿فبأي آلاء ربكما تكذبان﴾ من صلاة العشاء" />
      </label>
      <label className={`${label} sm:col-span-2`}>
        وصف قصير (اختياري)
        <input value={v.description ?? ""} onChange={(e) => set({ description: e.target.value })} disabled={disabled} className={field} />
      </label>
      <label className={label}>
        رابط المقطع الأصلي (فاضي لو المقطع من عندك)
        <input dir="ltr" value={v.sourceUrl ?? ""} onChange={(e) => set({ sourceUrl: e.target.value })} disabled={disabled} className={field} placeholder="https://t.me/…" />
      </label>
      <label className={label}>
        اسم المصدر (اختياري)
        <input value={v.sourceName ?? ""} onChange={(e) => set({ sourceName: e.target.value })} disabled={disabled} className={field} placeholder="مثلًا: قناة تلاوات ياسر الدوسري" />
      </label>
      <label className={`${label} sm:col-span-2`}>
        التسجيل الكامل اللي المقطع منه (اختياري: تلاوة أو درس أو خطبة)
        <input
          list={listId}
          value={recQuery}
          onChange={(e) => {
            const text = e.target.value;
            // رابط التلاوة من الموقع: بنربط بيه على طول
            const fromLink = recordingIdFromLink(text);
            if (fromLink) {
              set({ recordingId: fromLink });
              setRecQuery(recordings.find((r) => r.id === fromLink)?.title ?? text.trim());
              return;
            }
            setRecQuery(text);
            const hit = recordings.find((r) => r.title === text);
            set({ recordingId: hit?.id ?? (text ? v.recordingId : undefined) });
          }}
          disabled={disabled}
          className={field}
          placeholder="الزق رابط التلاوة من الموقع، أو اكتب العنوان واختار من القايمة"
        />
        <datalist id={listId}>
          {recordings.map((r) => (
            <option key={r.id} value={r.title} />
          ))}
        </datalist>
        {v.recordingId && (
          <span className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gold-soft">مربوط ✓</span>
            <span dir="ltr" className="text-muted">
              {v.recordingId}
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                set({ recordingId: undefined });
                setRecQuery("");
              }}
              className="min-h-8 px-1 text-muted underline-offset-4 hover:text-text hover:underline"
            >
              إلغاء الربط
            </button>
          </span>
        )}
      </label>
      <div className="grid grid-cols-[minmax(0,1fr)_90px_90px] gap-2 sm:col-span-2">
        <label className={label}>
          الآيات (اختياري): السورة
          <select value={v.surah ?? ""} onChange={(e) => set({ surah: e.target.value ? Number(e.target.value) : undefined })} disabled={disabled} className={field}>
            <option value="">—</option>
            {SURAH_NAMES.map((n, i) => (
              <option key={i} value={i + 1}>
                {i + 1}. {n}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          من آية
          <input type="number" inputMode="numeric" value={v.ayahFrom ?? ""} onChange={(e) => set({ ayahFrom: e.target.value ? Number(e.target.value) : undefined })} disabled={disabled || !v.surah} className={field} />
        </label>
        <label className={label}>
          لآية
          <input type="number" inputMode="numeric" value={v.ayahTo ?? ""} onChange={(e) => set({ ayahTo: e.target.value ? Number(e.target.value) : undefined })} disabled={disabled || !v.surah} className={field} />
        </label>
      </div>
    </div>
  );
}

const EMPTY: ClipInput = { title: "", sourceUrl: "" };

/** فورم رفع مقطع جديد */
export function ClipForm({ recordings }: { recordings: Rec[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [meta, setMeta] = useState<ClipInput>(EMPTY);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState<ActionResult | null>(null);

  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const submit = async () => {
    if (!file) return setMsg({ ok: false, message: "اختار فيديو الأول" });
    if (!meta.title.trim()) return setMsg({ ok: false, message: "اكتب عنوان المقطع" });
    setBusy(true);
    setMsg(null);
    setProgress(0);
    try {
      const prep = await prepareClip(file.name);
      if (!prep.ok) throw new Error(prep.message);
      const poster = await makePoster(file);
      // «فهرس في الأول» قبل الرفع (زي scripts/optimize-clips.mjs): من غيره المتصفح بيحمّل المقطع كله قبل ما يشغّل.
      // لو الملف جاهز أصلًا أو مش مفهوم، بيترفع زي ما هو
      const body = /\.(mp4|mov|m4v)$/i.test(file.name) ? ((await faststart(file).catch(() => null)) ?? file) : file;
      await put(prep.videoUrl, body, file.type || "video/mp4", setProgress);
      if (poster) await put(prep.posterUrl, poster, "image/jpeg");
      const r = await saveClip({ ...meta, id: prep.id, videoKey: prep.videoKey, posterKey: poster ? prep.posterKey : undefined, notify });
      setMsg(r);
      if (r.ok) {
        setFile(null);
        setMeta(EMPTY);
        router.refresh();
      }
    } catch (err) {
      setMsg({ ok: false, message: err instanceof Error ? err.message : "تعذّر الرفع" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-line bg-raised p-5">
      <div className="flex flex-wrap items-start gap-4">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="flex aspect-[9/16] w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line-strong text-center text-sm text-muted hover:border-gold/60"
        >
          {preview ? <video src={preview} muted playsInline className="h-full w-full object-cover" /> : "اختار فيديو"}
        </button>
        <input
          ref={input}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFile(f);
            e.target.value = "";
          }}
        />
        <div className="min-w-[16rem] flex-1">
          <MetaFields v={meta} set={(p) => setMeta((m) => ({ ...m, ...p }))} recordings={recordings} disabled={busy} />
        </div>
      </div>

      {busy && (
        <div className="h-1.5 overflow-hidden rounded-full bg-fg/10" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={submit} disabled={busy || !file} className="min-h-11 rounded-full bg-accent px-6 font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-50">
          {busy ? `جارٍ الرفع… ${Math.round(progress * 100)}٪` : "ارفع المقطع"}
        </button>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} disabled={busy} className="h-5 w-5 accent-[#CDAA62]" />
          ابعت إشعار للمشتركين
        </label>
        {msg && <span className={`text-sm ${msg.ok ? "text-gold-soft" : "text-[#E5636B]"}`}>{msg.message}</span>}
      </div>
    </div>
  );
}
