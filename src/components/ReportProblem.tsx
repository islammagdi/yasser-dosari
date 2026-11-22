"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { formatDuration } from "@/lib/format";
import { NOTE_MAX, REPORT_REASONS, type ReportReason } from "@/lib/reportReasons";
import { lockScroll } from "@/lib/scrollLock";

const STORE = "yd-reported-v1";
const DAY = 24 * 60 * 60 * 1000;

/** التلاوات اللي الزائر بلّغ عنها من الجهاز ده، ووقت كل بلاغ */
function reportedAt(id: string): number {
  try {
    return (JSON.parse(localStorage.getItem(STORE) ?? "{}") as Record<string, number>)[id] ?? 0;
  } catch {
    return 0;
  }
}

function markReported(id: string) {
  try {
    const all = JSON.parse(localStorage.getItem(STORE) ?? "{}") as Record<string, number>;
    // بنشيل القديم عشان الملف ميكبرش
    for (const k of Object.keys(all)) if (Date.now() - all[k] > DAY) delete all[k];
    all[id] = Date.now();
    localStorage.setItem(STORE, JSON.stringify(all));
  } catch {
    /* التخزين مش متاح */
  }
}

type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

/**
 * «بلّغ عن مشكلة» في صفحة التلاوة: لوحة بأسباب جاهزة وخانة تفاصيل اختيارية.
 * position: الثانية اللي الزائر واقف عندها دلوقتي، بتتبعت مع البلاغ لو وافق.
 */
export function ReportProblem({ id, category, position }: { id: string; category: string; position: () => number }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [at, setAt] = useState(0);
  const [withTime, setWithTime] = useState(true);
  const [state, setState] = useState<State>({ kind: "idle" });
  const trap = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const firstOption = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    setDone(Date.now() - reportedAt(id) < DAY);
  }, [id]);

  const show = () => {
    setAt(Math.floor(position()));
    setWithTime(true);
    setReason(null);
    setNote("");
    setState({ kind: "idle" });
    setOpen(true);
  };

  const close = useCallback(() => {
    setOpen(false);
    opener.current?.focus();
  }, []);

  // Escape بيقفل، والصفحة اللي ورا متتحركش وهي مفتوحة
  useEffect(() => {
    if (!open) return;
    firstOption.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", esc);
    const unlockScroll = lockScroll();
    return () => {
      document.removeEventListener("keydown", esc);
      unlockScroll();
    };
  }, [open, close]);

  async function send() {
    if (!reason) return;
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordingId: id,
          category,
          reason,
          note,
          at: withTime && at > 0 ? at : undefined,
          website: trap.current?.value ?? "",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setState({ kind: "error", message: data.message ?? "حصلت مشكلة في الإرسال. جرّب تاني بعد شوية." });
        return;
      }
      markReported(id);
      setDone(true);
      setState({ kind: "sent" });
    } catch {
      setState({ kind: "error", message: "مفيش اتصال بالإنترنت. جرّب تاني لما النت يرجع." });
    }
  }

  return (
    <>
      <button
        ref={opener}
        type="button"
        onClick={show}
        disabled={done}
        className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-muted underline-offset-4 transition-colors hover:text-text hover:underline disabled:no-underline disabled:opacity-70"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
        </svg>
        {done ? "وصلنا بلاغك عن التلاوة دي، شكرًا" : "بلّغ عن مشكلة في التلاوة"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div aria-hidden className="absolute inset-0 bg-[#000]/50" onClick={close} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative flex max-h-[90dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-float sm:max-w-md sm:rounded-3xl"
          >
            {state.kind === "sent" ? (
              <div className="flex flex-col gap-4 py-2">
                <h2 id={titleId} className="font-display text-2xl font-bold">
                  وصل البلاغ، شكرًا
                </h2>
                <p className="leading-7 text-muted">هنراجع التلاوة ونصلّحها في أقرب وقت إن شاء الله.</p>
                <button type="button" onClick={close} className="min-h-12 rounded-full bg-accent font-semibold text-accent-ink hover:bg-accent-hover">
                  تمام
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 id={titleId} className="font-display text-2xl font-bold">
                    إيه المشكلة؟
                  </h2>
                  <button type="button" onClick={close} aria-label="إغلاق" className="-m-2 flex h-11 w-11 items-center justify-center rounded-full text-muted hover:text-text">
                    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>

                <fieldset className="flex flex-col gap-1">
                  <legend className="sr-only">سبب البلاغ</legend>
                  {REPORT_REASONS.map((r, i) => (
                    <label key={r.value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-fg/5">
                      <input
                        ref={i === 0 ? firstOption : undefined}
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="h-5 w-5 accent-[#CDAA62]"
                      />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </fieldset>

                {at > 0 && (
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-fg/5">
                    <input type="checkbox" checked={withTime} onChange={(e) => setWithTime(e.target.checked)} className="h-5 w-5 accent-[#CDAA62]" />
                    <span>
                      المشكلة عند الدقيقة <span className="font-semibold tabular-nums">{formatDuration(at)}</span>
                    </span>
                  </label>
                )}

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-muted">تفاصيل (اختياري)</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
                    rows={3}
                    placeholder="مثلًا: الصوت بيقف بعد الركعة الأولى"
                    className="resize-none rounded-xl border border-line-strong bg-ink px-3 py-2.5 text-text"
                  />
                </label>

                {/* للبوتات بس: مخفية عن الزائر وعن قارئ الشاشة */}
                <input ref={trap} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-px w-px opacity-0" />

                {state.kind === "error" && (
                  <p role="alert" className="text-sm text-[#E5636B]">
                    {state.message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!reason || state.kind === "sending"}
                  className="min-h-12 rounded-full bg-accent font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-40"
                >
                  {state.kind === "sending" ? "بيتبعت…" : "ابعت البلاغ"}
                </button>
                <p className="text-xs leading-6 text-muted">مش بنطلب اسمك ولا أي بيانات عنك. بيتبعت مع البلاغ نوع جهازك بس، علشان نعرف لو المشكلة في متصفح معيّن.</p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
