"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { daysBetween, localToday } from "./wird";
import { WIRD_JUZ_DURATIONS, wirdPortion } from "./wirdJuz";

const KEY = "yd-wird-v2";
/** الخطة القديمة (بالسور): بنحوّلها مرة واحدة لخطة بالأجزاء بنفس المدة */
const OLD_KEY = "yd-wird-v1";
const KHATMAS_KEY = "yd-wird-khatmas";
const EVENT = "yd-wird-change";
/** الأيام اللي الورد فيها اكتمل: لسلسلة الأيام المتتالية */
const STREAK_KEY = "yd-wird-days-v1";

function readDays(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(STREAK_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((d) => typeof d === "string") : [];
  } catch {
    return [];
  }
}

/** السلسلة الحالية (لحد النهارده أو امبارح) وأطول سلسلة */
function streaks(days: string[], today: string): { current: number; best: number } {
  const set = new Set(days);
  const prev = (d: string) => {
    const t = new Date(`${d}T12:00:00Z`);
    t.setUTCDate(t.getUTCDate() - 1);
    return t.toISOString().slice(0, 10);
  };
  let start = set.has(today) ? today : prev(today);
  let current = 0;
  while (set.has(start)) {
    current++;
    start = prev(start);
  }
  let best = 0;
  for (const d of set) {
    if (set.has(prev(d))) continue; // مش أول يوم في سلسلة
    let n = 0;
    let x = d;
    while (set.has(x)) {
      n++;
      const t = new Date(`${x}T12:00:00Z`);
      t.setUTCDate(t.getUTCDate() + 1);
      x = t.toISOString().slice(0, 10);
    }
    best = Math.max(best, n);
  }
  return { current, best };
}

interface Plan {
  /** مدة الختمة بالأيام */
  days: number;
  /** أول يوم في الخطة */
  start: string;
  /** أرقام أيام الخطة اللي خلصت (من ٠) */
  done: number[];
}

function read(): Plan | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v && typeof v.days === "number" && typeof v.start === "string" && Array.isArray(v.done)) return v as Plan;
    // ترحيل من الخطة القديمة بالسور: نفس المدة، من النهارده
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? "null");
    if (old && typeof old.days === "number") {
      const days = (WIRD_JUZ_DURATIONS as readonly number[]).includes(old.days) ? old.days : 30;
      const plan: Plan = { days, start: localToday(), done: [] };
      localStorage.setItem(KEY, JSON.stringify(plan));
      localStorage.removeItem(OLD_KEY);
      return plan;
    }
    return null;
  } catch {
    return null;
  }
}

function write(p: Plan | null) {
  try {
    if (p) localStorage.setItem(KEY, JSON.stringify(p));
    else localStorage.removeItem(KEY);
  } catch {
    /* التخزين مش متاح */
  }
  window.dispatchEvent(new Event(EVENT));
}

function readKhatmas(): number {
  try {
    return Number(localStorage.getItem(KHATMAS_KEY)) || 0;
  } catch {
    return 0;
  }
}

/**
 * الورد اليومي بالأجزاء: خطة جاهزة بتقسم الـ ٣٠ جزء على المدة اللي الزائر اختارها.
 * ورد النهارده = أول يوم في الخطة لسه مخلصش، فلو فوّت يوم بيكمّل من مكانه.
 */
export function useWird() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [ready, setReady] = useState(false);
  const [khatmas, setKhatmas] = useState(0);

  useEffect(() => {
    const sync = () => {
      setPlan(read());
      setKhatmas(readKhatmas());
      setReady(true);
    };
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const today = localToday();
  const dayNumber = plan ? daysBetween(plan.start, today) + 1 : 0;
  const doneCount = plan ? plan.done.length : 0;
  const finished = !!plan && doneCount >= plan.days;
  // أول يوم في الخطة لسه مخلصش
  const nextIndex = useMemo(() => {
    if (!plan) return -1;
    const done = new Set(plan.done);
    for (let i = 0; i < plan.days; i++) if (!done.has(i)) return i;
    return -1;
  }, [plan]);
  const portion = plan && nextIndex >= 0 ? wirdPortion(plan.days, nextIndex) : null;
  /** متأخر كام يوم عن الخطة */
  const behind = plan ? Math.max(0, Math.min(plan.days, dayNumber) - 1 - doneCount) : 0;
  const daysLeft = plan ? Math.max(1, plan.days - doneCount) : 0;

  // سلسلة الأيام: اليوم بيتسجّل لما ورد يخلص فيه
  const [days, setDays] = useState<string[]>([]);
  useEffect(() => setDays(readDays()), []);
  const streak = streaks(days, today);
  const doneToday = days.includes(today);

  /** ورد النهارده خلص: بيتعلّم اليوم، وبيتسجّل في السلسلة، ولو ده آخر يوم بتتحسب ختمة */
  const markDone = useCallback(() => {
    const p = read();
    if (!p) return;
    const done = new Set(p.done);
    let i = 0;
    while (i < p.days && done.has(i)) i++;
    if (i >= p.days) return;
    done.add(i);
    const next = { ...p, done: [...done].sort((a, b) => a - b) };
    write(next);
    const d = readDays();
    if (!d.includes(localToday())) {
      try {
        localStorage.setItem(STREAK_KEY, JSON.stringify([...d, localToday()].sort().slice(-400)));
      } catch {
        /* تجاهل */
      }
      setDays([...d, localToday()]);
    }
    if (next.done.length >= next.days) {
      try {
        localStorage.setItem(KHATMAS_KEY, String(readKhatmas() + 1));
      } catch {
        /* تجاهل */
      }
      setKhatmas(readKhatmas());
    }
  }, []);

  const start = useCallback((days: number) => write({ days, start: localToday(), done: [] }), []);
  const stop = useCallback(() => write(null), []);
  const restart = start;

  return {
    ready,
    plan,
    dayNumber,
    daysLeft,
    behind,
    portion,
    doneCount,
    doneToday,
    finished,
    completedKhatmas: khatmas,
    streak,
    markDone,
    start,
    stop,
    restart,
  };
}
