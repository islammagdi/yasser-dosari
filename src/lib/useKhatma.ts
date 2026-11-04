"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "yd-khatma-v1";
const EVENT = "yd-khatma-change";

interface Saved {
  done: number[];
  /** آخر سورة اتسمعت، عشان "كمّل" تبدأ من بعدها */
  last?: number;
}

function read(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Saved;
    return { done: Array.isArray(v.done) ? v.done : [], last: v.last };
  } catch {
    return { done: [] };
  }
}

function write(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* التخزين مش متاح */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** تتسجل السورة "مسموعة" لما المستمع يوصل لـ ٩٠٪ منها. بيتنده من المشغّل */
export function markSurahListened(surah: number) {
  const s = read();
  if (s.done.includes(surah) && s.last === surah) return;
  write({ done: s.done.includes(surah) ? s.done : [...s.done, surah], last: surah });
}

/** متابعة الختمة: السور اللي اتسمعت، محفوظة على الجهاز */
export function useKhatma() {
  const [state, setState] = useState<Saved>({ done: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setState(read());
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

  const reset = useCallback(() => write({ done: [] }), []);
  const isDone = useCallback((n: number) => state.done.includes(n), [state.done]);

  /** السورة اللي بعد آخر واحدة اتسمعت ومتسمعتش، وإلا أول سورة متسمعتش */
  const nextSurah = (() => {
    const from = state.last ?? 0;
    for (let n = from + 1; n <= 114; n++) if (!state.done.includes(n)) return n;
    for (let n = 1; n <= 114; n++) if (!state.done.includes(n)) return n;
    return null;
  })();

  return { ready, count: state.done.length, isDone, nextSurah, reset };
}