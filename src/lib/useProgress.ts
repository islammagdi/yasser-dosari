"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Recording } from "@/types";

/**
 * تقدّم الاستماع لكل تلاوة لوحدها، عشان "أكمل الاستماع" وشريط التقدّم على الكروت.
 * محفوظ في المتصفح بس (localStorage)، زي المفضلة والختمة.
 */
const KEY = "yd-progress-v1";
/** أقصى عدد تلاوات بنفتكر مكانها؛ الأقدم بيتشال */
const MAX_ENTRIES = 40;
/** أقل من كده يبقى لسه مبدأش فعليًا */
const MIN_SEC = 30;
/** لو وصل للنسبة دي تبقى خلصت، فبنشيلها */
const DONE_RATIO = 0.95;

export interface ProgressEntry {
  /** الثانية اللي وقف عندها */
  t: number;
  /** مدة التسجيل */
  d: number;
  /** آخر مرة اتسمعت (للترتيب) */
  at: number;
  /** نسخة من التسجيل عشان نعرضه في "أكمل الاستماع" من غير ما نجيبه تاني */
  rec: Recording;
}
type Store = Record<string, ProgressEntry>;

const EMPTY: Store = {};
let cache: Store | null = null;
const listeners = new Set<() => void>();

function load(): Store {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    cache = parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function commit(next: Store) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* التخزين مش متاح */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** بيتنادى من المشغّل وهو شغّال */
export function saveProgress(rec: Recording, t: number, d: number) {
  if (!Number.isFinite(t) || !Number.isFinite(d) || d <= 0) return;
  const store = load();
  const { [rec.id]: prev, ...rest } = store;

  // لسه في الأول أو خلّصها: مفيش مكان نفتكره
  if (t < MIN_SEC || t / d >= DONE_RATIO) {
    if (prev) commit(rest);
    return;
  }
  // فرق ثواني بسيط: مش مستاهل نكتب في التخزين
  if (prev && Math.abs(prev.t - t) < 5) return;

  const entries = Object.entries({ ...rest, [rec.id]: { t, d, at: Date.now(), rec } })
    .sort(([, a], [, b]) => b.at - a.at)
    .slice(0, MAX_ENTRIES);
  commit(Object.fromEntries(entries));
}

/** الثانية اللي التلاوة وقفت عندها، أو ٠ */
export function getProgressTime(id: string): number {
  return load()[id]?.t ?? 0;
}

export function clearProgress(id: string) {
  const { [id]: removed, ...rest } = load();
  if (removed) commit(rest);
}

/** نسبة التقدّم (٠ لـ ١) لتلاوة واحدة — للشريط على الكارت */
export function useProgressRatio(id: string): number {
  return useSyncExternalStore(
    subscribe,
    () => {
      const e = load()[id];
      return e ? e.t / e.d : 0;
    },
    () => 0,
  );
}

/** الثانية اللي وقف عندها في تلاوة واحدة — لزرار "أكمل من" */
export function useProgressTime(id: string): number {
  return useSyncExternalStore(subscribe, () => load()[id]?.t ?? 0, () => 0);
}

/** التلاوات اللي لسه مكملتش، الأحدث الأول */
export function useInProgress(limit = 4): ProgressEntry[] {
  const store = useSyncExternalStore(subscribe, load, () => EMPTY);
  return useMemo(
    () => Object.values(store).sort((a, b) => b.at - a.at).slice(0, limit),
    [store, limit],
  );
}