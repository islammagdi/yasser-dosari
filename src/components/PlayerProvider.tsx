"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Recording } from "@/types";

import { markSurahListened } from "@/lib/useKhatma";
import { getProgressTime, saveProgress } from "@/lib/useProgress";
const STORAGE_KEY = "yd-player-v1";
export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

interface PlayerContextValue {
  current: Recording | null;
  queue: Recording[];
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  rate: number;
  error: string | null;
  playQueue: (items: Recording[], startIndex: number, startAt?: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (sec: number) => void;
  skip: (deltaSec: number) => void;
  setRate: (rate: number) => void;
  volume: number;
  muted: boolean;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  sleep: SleepTimer;
  setSleepTimer: (value: number | "end" | null) => void;
}

/** تايمر الإيقاف: بعد عدد دقايق، أو مع نهاية التلاوة الحالية */
export type SleepTimer = { kind: "minutes"; until: number } | { kind: "end" } | null;

// ---------- مشغّل يوتيوب (IFrame Player API) ----------
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setPlaybackRate(rate: number): void;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  loadVideoById(o: { videoId: string; startSeconds?: number }): void;
  cueVideoById(o: { videoId: string; startSeconds?: number }): void;
}
interface YTPlayerOptions {
  width: string;
  height: string;
  videoId: string;
  playerVars: Record<string, number>;
  events: { onReady: () => void; onStateChange: (e: { data: number }) => void };
}
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: YTPlayerOptions) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}
const YT_PLAYING = 1;
const YT_BUFFERING = 3;
const YT_ENDED = 0;

let ytApi: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  ytApi ??= new Promise((resolve) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return ytApi;
}

/** واجهة موحّدة للتحكم، سواء الصوت أو يوتيوب */
interface Media {
  play(): void;
  pause(): void;
  paused(): boolean;
  time(): number;
  duration(): number;
  seek(sec: number): void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return ctx;
}

interface Saved {
  queue: Recording[];
  index: number;
  time: number;
  rate: number;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const ytMountRef = useRef<HTMLDivElement>(null);
  const ytRef = useRef<YTPlayer | null>(null);
  const [queue, setQueue] = useState<Recording[]>([]);
  const [index, setIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRateState] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(1);
  const [muted, setMuted] = useState(false);
  const [sleep, setSleep] = useState<SleepTimer>(null);
  const resumeAt = useRef<number | null>(null);
  const autoplay = useRef(false);

  const current = index >= 0 ? queue[index] ?? null : null;
  const isYouTube = Boolean(current?.youtubeId);
  // لوحة الفيديو: مقفولة يعني الفيديو واقف (يوتيوب مش بيسمح بتشغيل فيديو مستخبي)
  const [videoClosed, setVideoClosed] = useState(true);
  const videoOpen = isYouTube && !videoClosed;

  const media = useCallback((): Media | null => {
    if (current?.youtubeId) {
      const p = ytRef.current;
      if (!p) return null;
      return {
        play: () => {
          setVideoClosed(false);
          p.playVideo();
        },
        pause: () => p.pauseVideo(),
        paused: () => ![YT_PLAYING, YT_BUFFERING].includes(p.getPlayerState()),
        time: () => p.getCurrentTime(),
        duration: () => p.getDuration(),
        seek: (s) => p.seekTo(s, true),
      };
    }
    const a = audioRef.current;
    if (!a || !current?.audioUrl) return null;
    return {
      play: () => void a.play().catch(() => setIsPlaying(false)),
      pause: () => a.pause(),
      paused: () => a.paused,
      time: () => a.currentTime,
      duration: () => a.duration || 0,
      seek: (s) => {
        a.currentTime = s;
      },
    };
  }, [current]);

  // استرجاع آخر تلاوة ووقتها (من غير تشغيل تلقائي)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Saved;
      if (!Array.isArray(saved.queue) || !saved.queue[saved.index]) return;
      setQueue(saved.queue);
      setIndex(saved.index);
      setRateState(saved.rate || 1);
      resumeAt.current = saved.time || 0;
    } catch {
      /* تخزين تالف أو غير متاح — نبدأ من الصفر */
    }
  }, []);

  // حفظ التقدّم كل شوية
  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(() => {
      try {
        const data: Saved = { queue, index, time: currentTime, rate };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        // مكان كل تلاوة لوحدها، عشان "أكمل الاستماع"
        saveProgress(current, currentTime, duration);
      } catch {
        /* تجاهل */
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [queue, index, currentTime, duration, rate, current]);

  // نهاية التسجيل (مشتركة بين الصوت ويوتيوب). في ref عشان يوتيوب يشوف آخر نسخة منها
  const next = useCallback(() => {
    if (index + 1 >= queue.length) return;
    autoplay.current = true;
    resumeAt.current = getProgressTime(queue[index + 1].id);
    setIndex(index + 1);
  }, [index, queue]);
  const handleEnded = () => {
    // تايمر "نهاية التلاوة": نقف هنا ومنكمّلش على اللي بعدها
    if (sleep?.kind === "end") {
      setSleep(null);
      setIsPlaying(false);
    } else if (index < queue.length - 1) next();
    else setIsPlaying(false);
  };
  const endedRef = useRef(handleEnded);
  endedRef.current = handleEnded;

  // تحميل التسجيل لما يتغيّر
  useEffect(() => {
    const audio = audioRef.current;
    if (!current) return;
    setError(null);
    const start = resumeAt.current ?? 0;
    setCurrentTime(start);
    setDuration(current.durationSec ?? 0);

    // ---- يوتيوب ----
    if (current.youtubeId) {
      // اللوحة تفتح لما المستخدم يشغّل، ومش لما الصفحة تسترجع آخر تلاوة
      setVideoClosed(!autoplay.current);
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      const videoId = current.youtubeId;
      let cancelled = false;
      setIsLoading(true);
      loadYouTubeApi().then(() => {
        if (cancelled || !window.YT || !ytMountRef.current) return;
        resumeAt.current = null;
        if (ytRef.current) {
          const opts = { videoId, startSeconds: start };
          if (autoplay.current) ytRef.current.loadVideoById(opts);
          else ytRef.current.cueVideoById(opts);
          return;
        }
        ytRef.current = new window.YT.Player(ytMountRef.current, {
          width: "100%",
          height: "100%",
          videoId,
          playerVars: { autoplay: autoplay.current ? 1 : 0, start: Math.floor(start), playsinline: 1, rel: 0 },
          events: {
            onReady: () => setIsLoading(false),
            onStateChange: (e) => {
              if (e.data === YT_PLAYING) {
                setIsPlaying(true);
                setIsLoading(false);
              } else if (e.data === YT_BUFFERING) setIsLoading(true);
              else if (e.data === YT_ENDED) endedRef.current();
              else setIsPlaying(false);
            },
          },
        });
      });
      return () => {
        cancelled = true;
      };
    }

    // ---- صوت ----
    ytRef.current?.stopVideo();
    if (!audio) return;
    if (!current.audioUrl) {
      audio.removeAttribute("src");
      audio.load();
      setIsPlaying(false);
      setError("هذا التسجيل غير متاح بعد.");
      return;
    }
    audio.src = current.audioUrl;
    audio.playbackRate = rate;
    if (autoplay.current) {
      audio.play().catch(() => setIsPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

   // متابعة الختمة: السورة بتتحسب لما المستمع يوصل لـ ٩٠٪ منها
  useEffect(() => {
    if (current?.category === "mushaf" && current.surah && duration > 0 && currentTime / duration >= 0.9) {
      markSurahListened(current.surah);
    }
  }, [current, currentTime, duration]);

  // يوتيوب مش بيبعت تحديث للوقت فبنسأله كل نص ثانية وهو شغّال
  useEffect(() => {
    if (!isYouTube || !isPlaying) return;
    const t = window.setInterval(() => {
      const p = ytRef.current;
      if (!p) return;
      setCurrentTime(p.getCurrentTime());
      const d = p.getDuration();
      if (d) setDuration(d);
    }, 500);
    return () => window.clearInterval(t);
  }, [isYouTube, isPlaying]);

  // السرعة والصوت للاتنين
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
    ytRef.current?.setPlaybackRate(rate);
  }, [rate, isLoading]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
      audio.muted = muted;
    }
    const p = ytRef.current;
    if (p) {
      p.setVolume(Math.round(volume * 100));
      if (muted) p.mute();
      else p.unMute();
    }
  }, [volume, muted, isLoading]);

  /** startAt: ثانية معيّنة (رابط مشاركة أو آية). من غيرها بنكمّل من آخر مكان وقف عنده */
  const playQueue = useCallback((items: Recording[], startIndex: number, startAt?: number) => {
    const target = items[startIndex];
    if (!target) return;
    // نفس التسجيل؟ يبقى toggle
    const m = media();
    if (current && target.id === current.id && m) {
      if (m.paused()) m.play();
      else m.pause();
      return;
    }
    autoplay.current = true;
    resumeAt.current = startAt ?? getProgressTime(target.id);
    setQueue(items);
    setIndex(startIndex);
  }, [current, media]);

  const toggle = useCallback(() => {
    const m = media();
    if (!m) return;
    autoplay.current = true;
    if (m.paused()) m.play();
    else m.pause();
  }, [media]);

  const prev = useCallback(() => {
    const m = media();
    // زي أي مشغّل: لو عدّى ٥ ثواني، "السابق" بيرجع لأول التسجيل
    if (m && m.time() > 5) {
      m.seek(0);
      setCurrentTime(0);
      return;
    }
    if (index <= 0) return;
    autoplay.current = true;
    resumeAt.current = getProgressTime(queue[index - 1].id);
    setIndex(index - 1);
  }, [media, index, queue]);

  const seek = useCallback((sec: number) => {
    const m = media();
    if (!m || !Number.isFinite(sec)) return;
    const s = Math.max(0, Math.min(sec, m.duration() || sec));
    m.seek(s);
    setCurrentTime(s);
  }, [media]);

  const skip = useCallback((delta: number) => {
    const m = media();
    if (m) seek(m.time() + delta);
  }, [media, seek]);

  const setRate = useCallback((r: number) => setRateState(r), []);

  /** إغلاق لوحة الفيديو = إيقاف التلاوة */
  const closeVideo = useCallback(() => {
    ytRef.current?.pauseVideo();
    setVideoClosed(true);
  }, []);

  // احتياط: لو الفيديو اشتغل واللوحة مقفولة، نوقّفه
  useEffect(() => {
    if (isYouTube && videoClosed && isPlaying) ytRef.current?.pauseVideo();
  }, [isYouTube, videoClosed, isPlaying]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)));
    if (v > 0) setMuted(false);
  }, []);
  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  // تايمر الإيقاف بالدقايق
  const setSleepTimer = useCallback((value: number | "end" | null) => {
    if (value === null) setSleep(null);
    else if (value === "end") setSleep({ kind: "end" });
    else setSleep({ kind: "minutes", until: Date.now() + value * 60_000 });
  }, []);

  useEffect(() => {
    if (sleep?.kind !== "minutes") return;
    const t = window.setTimeout(() => {
      audioRef.current?.pause();
      ytRef.current?.pauseVideo();
      setSleep(null);
    }, Math.max(0, sleep.until - Date.now()));
    return () => window.clearTimeout(t);
  }, [sleep]);

  // التحكم من شاشة القفل وسماعات البلوتوث (للصوت؛ يوتيوب له تحكمه الخاص)
  useEffect(() => {
    if (!("mediaSession" in navigator) || !current) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: "الشيخ ياسر الدوسري",
      album: current.subtitle ?? "",
    });
    const ms = navigator.mediaSession;
    ms.setActionHandler("play", toggle);
    ms.setActionHandler("pause", toggle);
    ms.setActionHandler("nexttrack", index < queue.length - 1 ? next : null);
    ms.setActionHandler("previoustrack", prev);
    ms.setActionHandler("seekbackward", () => skip(-10));
    ms.setActionHandler("seekforward", () => skip(10));
  }, [current, toggle, next, prev, skip, index, queue.length]);

  const value = useMemo<PlayerContextValue>(() => ({
    current, queue, isPlaying, isLoading, currentTime, duration, rate, error,
    playQueue, toggle, next, prev, seek, skip, setRate,
    volume, muted, setVolume, toggleMute, sleep, setSleepTimer,
  }), [current, queue, isPlaying, isLoading, currentTime, duration, rate, error, playQueue, toggle, next, prev, seek, skip, setRate, volume, muted, setVolume, toggleMute, sleep, setSleepTimer]);

  return (
    <PlayerContext.Provider value={value}>
      {children}

      {/* لوحة "يُشغَّل الآن" لتسجيلات يوتيوب: الفيديو لازم يفضل ظاهر (٢٠٠px على الأقل) طول ما هو شغّال */}
      <section
        aria-label="فيديو التلاوة"
        aria-hidden={!videoOpen}
        className={
          videoOpen
            ? "glass fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] start-3 z-40 rounded-2xl border border-white/10 p-1.5 shadow-float md:bottom-[calc(4.25rem+env(safe-area-inset-bottom))] md:start-6 md:w-[420px] md:rounded-b-none md:rounded-t-3xl md:border-b-0 md:p-0"
            : "pointer-events-none fixed -left-[9999px] top-0 w-[420px]"
        }
      >
        {/* الموبايل: مربع صغير في الركن بأقل مقاس يوتيوب بيسمح بيه، والعنوان موجود أصلًا في المشغّل تحت */}
        <div className="flex items-center justify-end gap-2 md:justify-between md:px-4 md:pb-2 md:pt-3">
          <span className="hidden min-w-0 items-center gap-2 text-xs text-muted md:flex">
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
            يُشغَّل الآن من يوتيوب
          </span>
          <button
            type="button"
            onClick={closeVideo}
            tabIndex={videoOpen ? 0 : -1}
            aria-label="إغلاق الفيديو وإيقاف التلاوة"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/10 hover:text-text md:h-10 md:w-10"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        {/* يوتيوب بيشترط إن المشغّل ميقلش عن ٢٠٠×٢٠٠، فسايبين هامش بسيط فوقه */}
        <div className="h-[224px] w-[224px] overflow-hidden rounded-xl bg-black md:mx-4 md:aspect-video md:h-auto md:w-auto md:rounded-2xl">
          <div ref={ytMountRef} />
        </div>
        <div className="hidden flex-col gap-0.5 px-4 pb-4 pt-3 md:flex">
          <p className="truncate font-semibold">{current?.title}</p>
          {current?.subtitle && <p className="truncate text-sm text-muted">{current.subtitle}</p>}
        </div>
      </section>

      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onLoadedMetadata={(e) => {
          const a = e.currentTarget;
          if (Number.isFinite(a.duration)) setDuration(a.duration);
          if (resumeAt.current) {
            a.currentTime = resumeAt.current;
            resumeAt.current = null;
          }
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => endedRef.current()}
        onError={() => {
          if (current?.audioUrl) {
            setIsLoading(false);
            setIsPlaying(false);
            setError("تعذّر تحميل التسجيل. تحقّق من الاتصال وحاول مرة أخرى.");
          }
        }}
      />
    </PlayerContext.Provider>
  );
}