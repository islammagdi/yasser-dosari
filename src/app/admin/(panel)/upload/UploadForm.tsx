"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { prepareUpload, registerUpload, type ActionResult } from "../../actions";

const SECTION_OPTIONS = [
  { value: "", label: "سيبه بانتظار التصنيف" },
  { value: "fard", label: "الفروض" },
  { value: "taraweeh", label: "التراويح" },
  { value: "lectures:khutbah", label: "خطب الجمعة" },
  { value: "lectures:lesson", label: "دروس ومحاضرات" },
  { value: "rare", label: "تلاوات نادرة" },
];
const field = "min-h-11 rounded-xl border border-line-strong bg-ink px-3 text-text";

type Status = "ready" | "uploading" | "done" | "error";

interface Row {
  key: string;
  audio: File;
  image?: File;
  title: string;
  section: string;
  status: Status;
  progress: number;
  message?: string;
}

const baseName = (n: string) => n.replace(/\.[^.]+$/, "");
const sizeLabel = (b: number) => `${(b / 1024 / 1024).toFixed(1)} م.ب`;

/** مدة الملف من المتصفح نفسه (من غير ما نرفعه الأول) */
function readDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    const done = (d?: number) => {
      URL.revokeObjectURL(url);
      resolve(d && Number.isFinite(d) ? d : undefined);
    };
    a.preload = "metadata";
    a.onloadedmetadata = () => done(a.duration);
    a.onerror = () => done();
    a.src = url;
  });
}

/** رفع ملف على رابط R2 المؤقت، مع نسبة التقدّم (fetch مبيدّيش تقدّم الرفع) */
function put(url: string, file: File, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`R2 رفض الرفع (${xhr.status})`)));
    // غالبًا CORS مش متظبط على الـ bucket
    xhr.onerror = () => reject(new Error("الرفع اتقطع. اتأكد من النت ومن إعداد CORS على الـ bucket."));
    xhr.send(file);
  });
}

export function UploadForm() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // تحذير لو حد حاول يقفل الصفحة والرفع شغال
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  /** ملفات الصوت بتبقى صفوف، والصور بتتربط بالصوت اللي ليه نفس الاسم (rahman.mp3 + rahman.jpg) */
  const addFiles = (files: FileList | File[]) => {
    const list = [...files];
    const images = list.filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name));
    const audios = list.filter((f) => /^audio\//.test(f.type) || /\.(mp3|m4a)$/i.test(f.name));
    setRows((rs) => [
      ...rs,
      ...audios.map((audio) => ({
        key: `${audio.name}-${audio.size}-${Math.random()}`,
        audio,
        image: images.find((i) => baseName(i.name) === baseName(audio.name)),
        title: baseName(audio.name).replace(/[_-]+/g, " ").trim(),
        section: "",
        status: "ready" as Status,
        progress: 0,
      })),
    ]);
  };

  const uploadOne = async (r: Row): Promise<ActionResult> => {
    patch(r.key, { status: "uploading", progress: 0, message: undefined });
    const prep = await prepareUpload(r.audio.name, r.image?.name);
    if (!prep.ok) throw new Error(prep.message);
    const { slot } = prep;
    const duration = await readDuration(r.audio);
    const total = r.audio.size + (r.image?.size ?? 0);
    await put(slot.audioUrl, r.audio, (p) => patch(r.key, { progress: (p * r.audio.size) / total }));
    if (r.image && slot.imageUrl) {
      await put(slot.imageUrl, r.image, (p) => patch(r.key, { progress: (r.audio.size + p * r.image!.size) / total }));
    }
    patch(r.key, { progress: 1 });
    return registerUpload({ slot: { id: slot.id, audioKey: slot.audioKey, imageKey: slot.imageKey }, title: r.title, duration, section: r.section || undefined });
  };

  // واحد ورا التاني: عشان كل تسجيل يتضاف للفهرس بعد اللي قبله من غير ما يمسحه
  const uploadAll = async () => {
    setBusy(true);
    for (const r of rows) {
      if (r.status === "done") continue;
      if (!r.title.trim()) {
        patch(r.key, { status: "error", message: "اكتب العنوان" });
        continue;
      }
      try {
        const res = await uploadOne(r);
        patch(r.key, { status: res.ok ? "done" : "error", message: res.message });
      } catch (err) {
        patch(r.key, { status: "error", message: err instanceof Error ? err.message : "تعذّر الرفع" });
      }
    }
    setBusy(false);
  };

  const pending = rows.filter((r) => r.status !== "done").length;

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex min-h-40 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-6 text-center transition-colors ${
          drag ? "border-gold bg-gold/10" : "border-line-strong hover:border-gold/60 hover:bg-fg/5"
        }`}
      >
        <span className="font-display text-2xl font-bold">اسحب الملفات هنا، أو اضغط للاختيار</span>
        <span className="text-sm text-muted">صوت mp3 أو m4a. ولو عايز غلاف، حط صورة بنفس اسم الملف وهتتربط بيه لوحدها.</span>
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept="audio/mpeg,audio/mp4,audio/x-m4a,.mp3,.m4a,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {rows.length > 0 && (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.key} className="flex flex-col gap-3 rounded-2xl border border-line bg-raised p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
                <span className="truncate" dir="auto">
                  {r.audio.name} · {sizeLabel(r.audio.size)}
                  {r.image && ` · غلاف: ${r.image.name}`}
                </span>
                {r.status !== "uploading" && r.status !== "done" && (
                  <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="min-h-9 px-2 hover:text-text">
                    شيل
                  </button>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
                <input
                  value={r.title}
                  onChange={(e) => patch(r.key, { title: e.target.value })}
                  disabled={r.status === "uploading" || r.status === "done"}
                  placeholder="العنوان، مثلًا: صلاة العشاء ٢٨ جمادى الأولى ١٤٤٨"
                  aria-label="عنوان التسجيل"
                  className={field}
                />
                <select
                  value={r.section}
                  onChange={(e) => patch(r.key, { section: e.target.value })}
                  disabled={r.status === "uploading" || r.status === "done"}
                  aria-label="القسم"
                  className={field}
                >
                  {SECTION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {(r.status === "uploading" || r.status === "done") && (
                <div className="h-1.5 overflow-hidden rounded-full bg-fg/10" role="progressbar" aria-valuenow={Math.round(r.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.round(r.progress * 100)}%` }} />
                </div>
              )}
              {r.message && <p className={`text-sm ${r.status === "error" ? "text-[#E5636B]" : "text-gold-soft"}`}>{r.message}</p>}
            </li>
          ))}
        </ul>
      )}

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={uploadAll}
            disabled={busy || pending === 0}
            className="min-h-11 rounded-full bg-accent px-6 font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-50"
          >
            {busy ? "جارٍ الرفع…" : pending === 0 ? "كله اترفع" : `ارفع ${pending === 1 ? "الملف" : `الـ ${pending} ملفات`}`}
          </button>
          <Link href="/admin/recordings" className="min-h-11 px-3 py-2.5 text-sm font-semibold text-gold-soft hover:underline">
            صفحة التسجيلات والتصنيف
          </Link>
          {busy && <span className="text-sm text-muted">متقفلش الصفحة لحد ما الرفع يخلص.</span>}
        </div>
      )}
    </div>
  );
}
