"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useKhatma } from "./useKhatma";
import { TOTAL_PAGES, daysBetween, localToday, pickToday, surahPages } from "./wird";

const KEY = "yd-wird-v1";
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
  /** ورد النهارده بيتثبت أول ما يتحسب، عشان ميتغيرش وإنت بتسمع */
  today?: { date: string; surahs: number[] };
}

function read(): Plan | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return v && typeof v.days === "number" && typeof v.start === "string" ? (v as Plan) : null;
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

/**
 * الورد اليومي: خطة ختم المصحف في عدد أيام، مبنية على متابعة الختمة.
 * السورة بتتحسب في الورد لما تتسمع ٩٠٪ منها (نفس قاعدة الختمة).
 */
export function useWird() {
  const k = useKhatma();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setPlan(read());
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
  const done = useMemo(() => {
    const s = new Set<number>();
    for (let n = 1; n <= 114; n++) if (k.isDone(n)) s.add(n);
    return s;
  }, [k.isDone]); // eslint-disable-line react-hooks/exhaustive-deps

  // اليوم كام في الخطة (١ = أول يوم)، والأيام الباقية بما فيها النهارده
  const dayNumber = plan ? daysBetween(plan.start, today) + 1 : 0;
  const overdue = !!plan && dayNumber > plan.days;
  let daysLeft = plan ? Math.max(1, plan.days - dayNumber + 1) : 0;
  // المدة خلصت والختمة لسه: نكمّل بنفس معدّل الخطة الأصلي بدل ما نحط الباقي كله في يوم واحد
  if (plan && overdue) {
    let left = 0;
    for (let n = 1; n <= 114; n++) if (!done.has(n)) left += surahPages(n);
    daysLeft = Math.max(1, Math.ceil(left / (TOTAL_PAGES / plan.days)));
  }

  // أول مرة في اليوم: نحسب ورد النهارده ونثبّته
  useEffect(() => {
    if (!ready || !k.ready || !plan || plan.today?.date === today) return;
    write({ ...plan, today: { date: today, surahs: pickToday(done, daysLeft) } });
  }, [ready, k.ready, plan, today, done, daysLeft]);

  const surahs = plan?.today?.date === today ? plan.today.surahs : [];
  const doneToday = surahs.filter((n) => done.has(n));

  // ورد النهارده خلص: نسجّل اليوم في السلسلة
  const [days, setDays] = useState<string[]>([]);
  useEffect(() => setDays(readDays()), []);
  useEffect(() => {
    if (!surahs.length || doneToday.length < surahs.length || days.includes(today)) return;
    const next = [...days, today].sort().slice(-400);
    try {
      localStorage.setItem(STREAK_KEY, JSON.stringify(next));
    } catch {
      /* تجاهل */
    }
    setDays(next);
  }, [surahs.length, doneToday.length, days, today]);
  const streak = streaks(days, today);

  const start = useCallback((days: number) => write({ days, start: localToday() }), []);
  const stop = useCallback(() => write(null), []);
  /** ختمة جديدة من الأول: بيصفّر متابعة الختمة كمان */
  const restart = useCallback(
    (days: number) => {
      k.reset();
      write({ days, start: localToday() });
    },
    [k],
  );

  return {
    ready: ready && k.ready,
    plan,
    dayNumber,
    daysLeft,
    overdue,
    surahs,
    doneToday,
    finished: k.count >= 114,
    khatmaCount: k.count,
    completedKhatmas: k.completed,
    streak,
    start,
    stop,
    restart,
  };
}