"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Recording } from "@/types";

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
  playQueue: (items: Recording[], startIndex: number) => void;
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
      } catch {
        /* تجاهل */
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [queue, index, currentTime, rate, current]);

  // تحميل التسجيل لما يتغيّر
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    setError(null);
    setCurrentTime(resumeAt.current ?? 0);
    setDuration(current.durationSec ?? 0);
    if (!current.audioUrl) {
      audio.removeAttribute("src");
      audio.load();
      setIsPlaying(false);
      setError("التسجيل ده لسه مش متاح.");
      return;
    }
    audio.src = current.audioUrl;
    audio.playbackRate = rate;
    if (autoplay.current) {
      audio.play().catch(() => setIsPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, current?.audioUrl]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const playQueue = useCallback((items: Recording[], startIndex: number) => {
    const target = items[startIndex];
    if (!target) return;
    const audio = audioRef.current;
    // نفس التسجيل؟ يبقى toggle
    if (current && target.id === current.id && audio) {
      if (audio.paused) audio.play().catch(() => setIsPlaying(false));
      else audio.pause();
      return;
    }
    autoplay.current = true;
    resumeAt.current = 0;
    setQueue(items);
    setIndex(startIndex);
  }, [current]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current?.audioUrl) return;
    autoplay.current = true;
    if (audio.paused) audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [current]);

  const goTo = useCallback((i: number) => {
    if (i < 0 || i >= queue.length) return;
    autoplay.current = true;
    resumeAt.current = 0;
    setIndex(i);
  }, [queue.length]);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => {
    const audio = audioRef.current;
    // زي أي مشغّل: لو عدّى ٥ ثواني، "السابق" بيرجع لأول التسجيل
    if (audio && audio.currentTime > 5) {
      audio.currentTime = 0;
      return;
    }
    goTo(index - 1);
  }, [goTo, index]);

  const seek = useCallback((sec: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(sec)) return;
    audio.currentTime = Math.max(0, Math.min(sec, audio.duration || sec));
    setCurrentTime(audio.currentTime);
  }, []);

  const skip = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (audio) seek(audio.currentTime + delta);
  }, [seek]);

  const setRate = useCallback((r: number) => setRateState(r), []);

  // الصوت
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
  }, [volume, muted]);

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
      setSleep(null);
    }, Math.max(0, sleep.until - Date.now()));
    return () => window.clearTimeout(t);
  }, [sleep]);

  // التحكم من شاشة القفل وسماعات البلوتوث
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
        onEnded={() => {
          // تايمر "نهاية التلاوة": نقف هنا ومنكمّلش على اللي بعدها
          if (sleep?.kind === "end") {
            setSleep(null);
            setIsPlaying(false);
          } else if (index < queue.length - 1) next();
          else setIsPlaying(false);
        }}
        onError={() => {
          if (current?.audioUrl) {
            setIsLoading(false);
            setIsPlaying(false);
            setError("تعذّر تحميل التسجيل. اتأكد من الاتصال وجرّب تاني.");
          }
        }}
      />
    </PlayerContext.Provider>
  );
}
