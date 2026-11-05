"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useKhatma } from "./useKhatma";
import { TOTAL_PAGES, daysBetween, localToday, pickToday, surahPages } from "./wird";

const KEY = "yd-wird-v1";
const EVENT = "yd-wird-change";

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
    doneToday: surahs.filter((n) => done.has(n)),
    finished: k.count >= 114,
    khatmaCount: k.count,
    start,
    stop,
    restart,
  };
}