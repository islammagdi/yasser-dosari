"use client";

import { useL } from "@/lib/i18n/client";
import Link from "@/lib/i18n/nav";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFavorites } from "@/lib/useFavorites";
import { usePlayer } from "./PlayerProvider";
import { HeartIcon } from "./icons";
import { lockScroll } from "@/lib/scrollLock";
import { track } from "@/lib/stats/track";

export interface FeedClip {
  id: string;
  title: string;
  description?: string;
  video: string;
  poster?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  /** التسجيل الكامل اللي المقطع منه */
  full?: { href: string; title: string };
  ayah?: { text: string; ref: string; href: string };
}

const SITE = "yasser-dosari.vercel.app";

/** أقصى وقت لتجهيز ملف الفيديو قبل ما نعتبره فشل (بدل ما الزرار يفضل يلف للأبد) */
const FETCH_TIMEOUT = 60_000;

/**
 * بيجيب ملف الفيديو كـ File (للمشاركة على الحالة والتنزيل)، مع نسبة التحميل ووقت أقصى.
 * onProgress بياخد رقم من 0 لـ 100، أو -1 لو السيرفر مقالش حجم الملف.
 */
async function fetchFile(c: FeedClip, onProgress?: (pct: number) => void): Promise<File> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(c.video, { signal: ctrl.signal });
    if (!res.ok) throw new Error("fetch failed");
    const total = Number(res.headers.get("content-length")) || 0;
    let blob: Blob;
    if (res.body && onProgress) {
      const reader = res.body.getReader();
      const parts: BlobPart[] = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
        got += value.byteLength;
        onProgress(total ? Math.min(99, Math.round((got / total) * 100)) : -1);
      }
      blob = new Blob(parts, { type: res.headers.get("content-type") || "video/mp4" });
    } else {
      blob = await res.blob();
    }
    const ext = c.video.split(".").pop()?.split("?")[0] || "mp4";
    return new File([blob], `مقتطف-${c.id}.${ext}`, { type: blob.type || "video/mp4" });
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * «مقتطفات»: شاشة كاملة بتتقلّب لفوق ولتحت زي الريلز.
 * المقطع اللي قدامك بس هو اللي بيشتغل، وأول ضغطة على الصوت بتفضل لكل المقاطع.
 */
/** خلط عشوائي (Fisher–Yates) */
function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function ClipsFeed({ clips: source, startId }: { clips: FeedClip[]; startId?: string }) {
  const { t } = useL();
  /**
   * الترتيب العشوائي بيتعمل هنا في المتصفح، مع كل فتحة للتاب.
   * لو اتعمل في السيرفر بس، الـ Next بيحتفظ بالصفحة في الذاكرة شوية (Router Cache)،
   * فالرجوع للتاب من الهيدر كان بيرجّع نفس الترتيب.
   * لو الرابط فيه مقطع معيّن (مشاركة أو «مقطع اليوم») بيفضل هو الأول، والباقي عشوائي.
   */
  const [clips, setClips] = useState<FeedClip[] | null>(null);
  useEffect(() => {
    const first = source.find((c) => c.id === startId);
    setClips([...(first ? [first] : []), ...shuffle(source.filter((c) => c !== first))]);
    // startId مقصود إنه ميعيدش الخلط: الرابط بيتحدّث وإنت بتقلّب
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  // المقطع اللي بعده مبيبدأش يتحمّل غير لما اللي قدامك يبقى جاهز، عشان ميتقاسموش سرعة النت
  const [activeReady, setActiveReady] = useState(false);
  useEffect(() => setActiveReady(false), [active]);
  const [muted, setMuted] = useState(true);
  const player = usePlayer();

  // أول ما الصفحة تفتح: لو الرابط فيه مقطع معيّن (?c=...) ننزل عليه
  // المقطع اللي في الرابط بقى أول واحد بعد الخلط، فمفيش داعي ننزل عليه

  // المقطع الظاهر في الشاشة هو "النشط"، والرابط بيتحدّث عشان المشاركة
  useEffect(() => {
    const root = box.current;
    if (!root || !clips) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            const i = Number((e.target as HTMLElement).dataset.index);
            setActive(i);
            const url = new URL(window.location.href);
            url.searchParams.set("c", clips[i].id);
            window.history.replaceState(null, "", url);
          }
        }
      },
      { root, threshold: [0.6] },
    );
    Array.from(root.children).forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [clips]);

  // الصفحة واخدة الشاشة كلها: السكرول بتاع الموقع ورا يتقفل
  useEffect(() => lockScroll(), []);

  // لو فيه تلاوة شغالة في المشغّل، تقف أول ما مقطع يشتغل بصوت
  const pausePlayer = useCallback(() => {
    if (player.isPlaying) player.toggle();
  }, [player]);

  if (!source.length) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="font-display text-3xl font-bold">{t("مقتطفات")}</p>
        <p className="text-muted">{t("المقاطع القصيرة جاية قريب إن شاء الله.")}</p>
        <Link href="/" className="mt-2 min-h-11 rounded-full bg-accent px-6 py-2.5 font-semibold text-accent-ink">
          
          {t("الرئيسية")}
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[45] bg-black text-white">
      {/* شريط فوق: رجوع واسم القسم */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-3 pb-8 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <Link href="/" aria-label={t("رجوع للرئيسية")} className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/30 backdrop-blur">
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
        <span className="font-display text-2xl font-bold">{t("مقتطفات")}</span>
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? t("تشغيل الصوت") : t("كتم الصوت")}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/30 backdrop-blur"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
            {muted ? <path d="M16 9.5l5 5M21 9.5l-5 5" /> : <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />}
          </svg>
        </button>
      </div>

      {/* لحد ما الترتيب يتخلط (لحظة): شاشة سودا بدل ما يظهر الترتيب القديم ويتبدّل */}
      <div ref={box} className="h-[100dvh] snap-y snap-mandatory overflow-y-scroll overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {clips?.map((c, i) => (
          <ClipSlide
            key={c.id}
            clip={c}
            index={i}
            active={i === active}
            near={Math.abs(i - active) <= 1}
            preload={i === active ? "auto" : i === active + 1 && activeReady ? "auto" : "metadata"}
            onReady={i === active ? () => setActiveReady(true) : undefined}
            muted={muted}
            onUnmute={() => setMuted(false)}
            onPlaySound={pausePlayer}
          />
        ))}
      </div>
    </div>
  );
}

function ClipSlide({
  clip,
  index,
  active,
  near,
  preload,
  onReady,
  muted,
  onUnmute,
  onPlaySound,
}: {
  clip: FeedClip;
  index: number;
  active: boolean;
  near: boolean;
  preload: "auto" | "metadata";
  onReady?: () => void;
  muted: boolean;
  onUnmute: () => void;
  onPlaySound: () => void;
}) {
  const { t, en } = useL();
  const v = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState<"share" | "download" | null>(null);
  // نسبة تجهيز الملف للمشاركة/التحميل (-1 = شغال بس الحجم مش معروف)
  const [pct, setPct] = useState<number | null>(null);
  // المقطع بيحمّل (النت بطيء): نوضّح إنه شغال بدل شاشة واقفة
  const [buffering, setBuffering] = useState(false);
  /**
   * المتصفح مبيسمحش بفتح قايمة المشاركة غير بعد ضغطة "طازة". لو تجهيز الملف خد وقت،
   * الضغطة الأصلية بتنتهي والمشاركة بتترفض من غير أي رسالة (ده اللي كان بيخلي الزرار ميعملش حاجة).
   * فبنحتفظ بالملف ونطلب ضغطة تانية: «جاهز، اضغط للمشاركة».
   */
  const [ready, setReady] = useState<"file" | "link" | null>(null);
  const fileRef = useRef<File | null>(null);
  const [note, setNote] = useState("");
  // قلب الضغطتين: بيظهر مكان الصباع، والـ key بيخلّي كل ضغطتين يعملوا قلب جديد
  const [heart, setHeart] = useState<{ x: number; y: number; key: number } | null>(null);
  const fav = useFavorites();
  const favKey = clip.id; // المفضلة نفس قايمة التلاوات، والـ id بيبدأ بـ clip-
  const saved = fav.isFavorite(favKey);
  const lastTap = useRef(0);

  // المقطع النشط بس بيشتغل، واللي بيسيب الشاشة بيرجع لأوله
  useEffect(() => {
    const el = v.current;
    if (!el) return;
    if (active) {
      track({ type: "clip_view", id: clip.id, title: clip.title });
      // لسه مفيش كفاية من الفيديو يشتغل بيه: نبين إنه بيحمّل من الأول
      setBuffering(el.readyState < 3);
      el.play().then(() => setPaused(false)).catch(() => setPaused(true));
    } else {
      el.pause();
      el.currentTime = 0;
      setBuffering(false);
      setReady(null);
    }
    // الإحصائيات مع تغيّر المقطع النشط بس
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (active && !muted) onPlaySound();
  }, [active, muted, onPlaySound]);

  const flash = (t: string) => {
    setNote(t);
    window.setTimeout(() => setNote(""), 2200);
  };

  // ضغطة: تشغيل/إيقاف (أو تشغيل الصوت أول مرة). ضغطتين: حفظ في المفضلة زي الريلز
  const onTap = (e?: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // زي انستجرام: الضغطتين بيحفظوا بس، ومش بيشيلوا من المفضلة
      if (!saved) {
        fav.toggle(favKey);
        flash(t("اتحفظ في المفضلة"));
      }
      const box = e?.currentTarget.closest("section")?.getBoundingClientRect();
      const x = e && box ? e.clientX - box.left : (box?.width ?? 0) / 2;
      const y = e && box ? e.clientY - box.top : (box?.height ?? 0) / 2;
      setHeart({ x, y, key: now });
      window.setTimeout(() => setHeart((h) => (h?.key === now ? null : h)), 900);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    window.setTimeout(() => {
      if (lastTap.current !== now) return;
      const el = v.current;
      if (!el) return;
      if (muted) return onUnmute();
      if (el.paused) el.play().then(() => setPaused(false));
      else {
        el.pause();
        setPaused(true);
      }
    }, 300);
  };

  const pageUrl = () => `${window.location.origin}${en ? "/en" : ""}/clips?c=${clip.id}`;

  const getFile = async () => {
    if (fileRef.current) return fileRef.current;
    setPct(0);
    try {
      const f = await fetchFile(clip, setPct);
      fileRef.current = f;
      return f;
    } finally {
      setPct(null);
    }
  };

  const shareLink = async () => {
    const text = `${clip.title}\n${pageUrl()}`;
    if (navigator.share) {
      await navigator.share({ title: clip.title, text, url: pageUrl() });
      track({ type: "clip_share", id: clip.id });
    } else {
      await navigator.clipboard.writeText(pageUrl());
      flash(t("اتنسخ الرابط"));
    }
  };

  /** بيفتح قايمة المشاركة بالملف. لازم يتنادى من ضغطة مباشرة (مفيش await قبله) */
  const shareFile = async (file: File) => {
    await navigator.share({ files: [file], title: clip.title, text: `${clip.title}\n${pageUrl()}` });
    track({ type: "clip_share", id: clip.id });
  };

  const isAbort = (err: unknown) => (err as Error)?.name === "AbortError";
  const isNotAllowed = (err: unknown) => (err as Error)?.name === "NotAllowedError";

  // المشاركة: ملف الفيديو نفسه (عشان يتحط حالة واتساب)، ولو المتصفح مش بيدعم الملفات نشارك الرابط
  const share = async () => {
    setReady(null);
    const canFiles = typeof navigator.canShare === "function";
    // الملف متجهّز قبل كده: نفتح المشاركة على طول وإحنا لسه في نفس الضغطة
    if (fileRef.current && navigator.canShare?.({ files: [fileRef.current] })) {
      try {
        await shareFile(fileRef.current);
      } catch (err) {
        if (!isAbort(err)) flash(t("تعذّرت المشاركة، جرّب تاني"));
      }
      return;
    }
    if (!canFiles) {
      try {
        await shareLink();
      } catch {
        /* المستخدم قفل المشاركة */
      }
      return;
    }
    setBusy("share");
    const startedAt = Date.now();
    try {
      const file = await getFile();
      if (!navigator.canShare?.({ files: [file] })) {
        setReady("link");
        return;
      }
      // لو التجهيز كان سريع نجرب نفتح المشاركة على طول، غير كده نطلب ضغطة تانية
      if (Date.now() - startedAt > 4000) {
        setReady("file");
        return;
      }
      try {
        await shareFile(file);
      } catch (err) {
        if (isNotAllowed(err)) setReady("file");
        else if (!isAbort(err)) flash(t("تعذّرت المشاركة، جرّب تاني"));
      }
    } catch (err) {
      // النت فصل أو الملف خد وقت أكتر من اللازم: نعرض مشاركة الرابط بدل ما الزرار يفضل يلف
      flash(isAbort(err) ? t("النت بطيء، الفيديو مخلصش تحميل") : t("تعذّر تجهيز الفيديو"));
      setReady("link");
    } finally {
      setBusy(null);
    }
  };

  /** الضغطة التانية بعد ما الملف يجهز */
  const shareReady = async () => {
    const kind = ready;
    setReady(null);
    try {
      if (kind === "file" && fileRef.current) await shareFile(fileRef.current);
      else await shareLink();
    } catch (err) {
      if (!isAbort(err)) flash(t("تعذّرت المشاركة، جرّب تاني"));
    }
  };

  const download = async () => {
    setBusy("download");
    try {
      const file = await getFile();
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      track({ type: "clip_download", id: clip.id });
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      flash(t("اتحمّل على جهازك"));
    } catch (err) {
      flash((err as Error)?.name === "AbortError" ? t("النت بطيء، الفيديو مخلصش تحميل") : t("تعذّر التحميل دلوقتي"));
    } finally {
      setBusy(null);
    }
  };

  const act = "flex flex-col items-center gap-1 text-[11px] font-semibold drop-shadow";
  const actIcon = "flex h-12 w-12 items-center justify-center rounded-full bg-black/35 backdrop-blur transition-colors hover:bg-black/55";

  return (
    <section data-index={index} aria-label={clip.title} className="relative flex h-[100dvh] snap-start snap-always items-center justify-center overflow-hidden">
      <video
        ref={v}
        src={near ? clip.video : undefined}
        poster={clip.poster}
        muted={muted}
        loop
        playsInline
        preload={near ? preload : "none"}
        onWaiting={() => active && setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlayThrough={() => {
          setBuffering(false);
          onReady?.();
        }}
        onClick={onTap}
        className="h-full w-full touch-manipulation select-none object-contain"
      />

      {(paused || muted) && active && (
        <button
          type="button"
          onClick={onTap}
          className="absolute left-1/2 top-1/2 z-10 touch-manipulation -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/45 px-5 py-3 text-sm font-semibold backdrop-blur"
        >
          {muted ? t("اضغط لتشغيل الصوت 🔊") : t("▶ تشغيل")}
        </button>
      )}
      {active && buffering && !paused && (
        <span aria-label={t("جاري التحميل")} role="status" className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-12 w-12 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
      )}
      {ready && (
        <button
          type="button"
          onClick={shareReady}
          className="absolute inset-x-6 top-1/2 z-30 mx-auto max-w-xs -translate-y-1/2 rounded-2xl bg-[#CDAA62] px-5 py-4 text-center text-base font-bold text-[#1A1408] shadow-xl"
        >
          {ready === "file" ? t("الفيديو جاهز، اضغط للمشاركة على الحالة") : t("اضغط لمشاركة رابط المقطع")}
        </button>
      )}
      {heart && (
        <span key={heart.key} aria-hidden className="clip-heart pointer-events-none absolute z-20" style={{ left: heart.x, top: heart.y }}>
          <HeartIcon filled className="h-24 w-24 text-[#E5636B] drop-shadow-[0_4px_16px_rgba(0,0,0,0.45)]" />
        </span>
      )}

      {/* الأزرار على اليمين */}
      <div className="absolute bottom-[calc(9rem+var(--tabbar))] right-3 z-10 flex flex-col items-center gap-4">
        <button type="button" onClick={() => fav.toggle(favKey)} aria-pressed={saved} aria-label={saved ? t("إزالة من المفضلة") : t("حفظ في المفضلة")} className={act}>
          <span className={actIcon}>
            <HeartIcon filled={saved} className={`h-6 w-6 ${saved ? "text-[#E5636B]" : ""}`} />
          </span>
          {saved ? t("محفوظ") : t("حفظ")}
        </button>
        <button type="button" onClick={share} disabled={!!busy} aria-label={t("مشاركة")} className={act}>
          <span className={actIcon}>
            {busy === "share" ? (
              pct !== null && pct >= 0 ? (
                <span className="text-xs font-bold tabular-nums">{pct}%</span>
              ) : (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )
            ) : (
              <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 5l7 7-7 7M21 12H9a6 6 0 0 0-6 6" />
              </svg>
            )}
          </span>
          
          {t("حالة")}
        </button>
        <button type="button" onClick={download} disabled={!!busy} aria-label={t("تحميل")} className={act}>
          <span className={actIcon}>
            {busy === "download" ? (
              pct !== null && pct >= 0 ? (
                <span className="text-xs font-bold tabular-nums">{pct}%</span>
              ) : (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )
            ) : (
              <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
              </svg>
            )}
          </span>
          
          {t("تحميل")}
        </button>
      </div>

      {/* الكلام تحت */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 bg-gradient-to-t from-black/85 via-black/50 to-transparent pb-[calc(1.25rem+var(--tabbar))] pl-4 pr-20 pt-16">
        {clip.ayah && (
          <Link href={clip.ayah.href} className="block rounded-2xl bg-black/30 px-3 py-2 backdrop-blur-sm">
            <span dir="rtl" lang="ar" className="line-clamp-3 font-quran text-xl leading-[2.1]">{clip.ayah.text}</span>
            <span className="text-xs text-[#E7CD94]">{clip.ayah.ref}</span>
          </Link>
        )}
        <h2 className="font-display text-2xl font-bold leading-snug">{clip.title}</h2>
        {clip.description && <p className="line-clamp-2 text-sm text-white/80">{clip.description}</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {clip.full && (
            <Link href={clip.full.href} className="flex min-h-10 items-center gap-2 rounded-full bg-[#CDAA62] px-4 font-semibold text-[#1A1408]">
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
              </svg>
              
              {t("اسمعه كامل")}
            </Link>
          )}
          {/* المصدر: رابط لو موجود، اسم بس لو اتكتب من غير رابط، ولا حاجة لو المقطع من إنتاج الموقع */}
          {clip.sourceUrl ? (
            <a href={clip.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-white/75 underline-offset-4 hover:underline">
              
              {t("المصدر:")} {clip.sourceLabel ?? t("المقطع الأصلي")} ↗
            </a>
          ) : clip.sourceLabel ? (
            <span className="text-white/75">{t("المصدر:")} {clip.sourceLabel}</span>
          ) : null}
        </div>
        {note && <p className="text-sm text-[#E7CD94]">{note}</p>}
        <span className="sr-only">{SITE}</span>
      </div>
    </section>
  );
}
