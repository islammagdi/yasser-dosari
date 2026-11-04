"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "yd-reading-v1";
const EVENT = "yd-reading-change";

/** أحجام خط القراءة (بالـ rem)، والافتراضي التالت */
export const READING_SIZES = [1.35, 1.6, 1.85, 2.15, 2.5, 2.9] as const;
const DEFAULT_SIZE = 2;

export interface Bookmark {
  surah: number;
  ayah: number;
}

interface Saved {
  /** آخر سورة اتفتحت للقراءة */
  last?: number;
  /** فهرس في READING_SIZES */
  size?: number;
  /** العلامة اللي الزائر حطها بنفسه على آية */
  bookmark?: Bookmark;
}

const validSurah = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 114;

function read(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Saved;
    const b = v.bookmark;
    return {
      last: validSurah(v.last) ? v.last : undefined,
      size: Number.isInteger(v.size) && v.size! >= 0 && v.size! < READING_SIZES.length ? v.size : undefined,
      bookmark: b && validSurah(b.surah) && Number.isInteger(b.ayah) && b.ayah >= 1 ? { surah: b.surah, ayah: b.ayah } : undefined,
    };
  } catch {
    return {};
  }
}

function write(patch: Partial<Saved>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch }));
  } catch {
    /* التخزين مش متاح */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** القراءة: آخر سورة، والعلامة، وحجم الخط، محفوظين على الجهاز */
export function useReading() {
  const [saved, setSaved] = useState<Saved>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setSaved(read());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const size = saved.size ?? DEFAULT_SIZE;
  const setLast = useCallback((surah: number) => write({ last: surah }), []);
  const setSize = useCallback((i: number) => write({ size: Math.min(READING_SIZES.length - 1, Math.max(0, i)) }), []);
  /** null = شيل العلامة */
  const setBookmark = useCallback((b: Bookmark | null) => write({ bookmark: b ?? undefined }), []);

  return { ready, last: saved.last, size, bookmark: saved.bookmark, setLast, setSize, setBookmark };
}