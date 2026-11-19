"use client";

import { useRef, useState, useTransition } from "react";
import { formatDuration } from "@/lib/format";
import { deleteReportAction, resolveReports, type ActionResult } from "../../actions";

/** مشغّل صغير للتلاوة، وزراير «استمع من الدقيقة» لكل بلاغ فيه دقيقة */
export function ReportPlayer({ audioUrl, youtubeId, times }: { audioUrl?: string; youtubeId?: string; times: number[] }) {
  const audio = useRef<HTMLAudioElement>(null);
  const unique = [...new Set(times)].sort((a, b) => a - b);

  const playFrom = (t: number) => {
    const el = audio.current;
    if (!el) return;
    // قبل الدقيقة بخمس ثواني، عشان تسمع اللي قبل المشكلة
    const go = () => {
      el.currentTime = Math.max(0, t - 5);
      el.play().catch(() => {});
    };
    if (el.readyState >= 1) go();
    else {
      el.addEventListener("loadedmetadata", go, { once: true });
      el.load();
    }
  };

  if (!audioUrl && youtubeId) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">التلاوة دي لسه فيديو:</span>
        <a href={`https://youtu.be/${youtubeId}`} target="_blank" rel="noopener noreferrer" className="text-gold-soft underline-offset-4 hover:underline">
          افتح على يوتيوب
        </a>
        {unique.map((t) => (
          <a
            key={t}
            href={`https://youtu.be/${youtubeId}?t=${Math.max(0, t - 5)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-9 rounded-full border border-line-strong px-3 py-1.5 tabular-nums text-gold-soft hover:border-gold/50"
          >
            من {formatDuration(t)}
          </a>
        ))}
      </div>
    );
  }
  if (!audioUrl) return null;

  return (
    <div className="flex flex-col gap-2">
      <audio ref={audio} controls preload="none" src={audioUrl} className="h-10 w-full max-w-xl" aria-label="استماع للتلاوة" />
      {unique.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {unique.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => playFrom(t)}
              className="min-h-9 rounded-full border border-line-strong px-3 py-1.5 text-sm tabular-nums text-gold-soft hover:border-gold/50"
            >
              استمع من {formatDuration(t)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function useAction() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const run = (fn: () => Promise<ActionResult>) => start(async () => setResult(await fn()));
  return { pending, result, run };
}

export function ResolveButton({ recordingId, count }: { recordingId: string; count: number }) {
  const { pending, result, run } = useAction();
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => resolveReports(recordingId))}
        className="min-h-11 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-40"
      >
        {pending ? "بيتمسح…" : count > 1 ? `اتحلّت (امسح ${count} بلاغات)` : "اتحلّت"}
      </button>
      {result && !result.ok && <span className="text-sm text-[#E5636B]">{result.message}</span>}
    </span>
  );
}

export function DeleteReportButton({ reportKey }: { reportKey: string }) {
  const { pending, result, run } = useAction();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(() => deleteReportAction(reportKey))}
      title={result && !result.ok ? result.message : undefined}
      className="min-h-9 px-2 text-sm text-muted hover:text-text disabled:opacity-40"
    >
      {pending ? "…" : result && !result.ok ? "فشل، جرّب تاني" : "تجاهل"}
    </button>
  );
}
