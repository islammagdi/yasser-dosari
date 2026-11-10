"use client";

import { useCallback, useEffect, useState } from "react";
import type { Recording } from "@/types";

/**
 * قوائم التشغيل الخاصة بالزائر: محفوظة على جهازه زي المفضلة.
 * كل قائمة بتحفظ نسخة من التسجيلات نفسها، عشان تتعرض وتتشغّل من غير ما نجيبها تاني.
 */
const KEY = "yd-playlists-v1";
const EVENT = "yd-playlists-change";

export interface Playlist {
  id: string;
  name: string;
  items: Recording[];
  createdAt: string;
}

function read(): Playlist[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((p) => p && typeof p.id === "string" && Array.isArray(p.items)) : [];
  } catch {
    return [];
  }
}

function write(lists: Playlist[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lists));
  } catch {
    /* التخزين مش متاح أو اتملى */
  }
  window.dispatchEvent(new Event(EVENT));
}

const update = (fn: (lists: Playlist[]) => Playlist[]) => write(fn(read()));

export function usePlaylists() {
  const [lists, setLists] = useState<Playlist[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setLists(read());
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

  /** بيرجّع ID القائمة الجديدة */
  const create = useCallback((name: string, first?: Recording) => {
    const id = Math.random().toString(36).slice(2, 10);
    update((l) => [...l, { id, name: name.trim() || "قائمة جديدة", items: first ? [first] : [], createdAt: new Date().toISOString() }]);
    return id;
  }, []);
  const rename = useCallback((id: string, name: string) => update((l) => l.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p))), []);
  const remove = useCallback((id: string) => update((l) => l.filter((p) => p.id !== id)), []);
  const toggleItem = useCallback(
    (id: string, rec: Recording) =>
      update((l) =>
        l.map((p) =>
          p.id !== id ? p : { ...p, items: p.items.some((r) => r.id === rec.id) ? p.items.filter((r) => r.id !== rec.id) : [...p.items, rec] },
        ),
      ),
    [],
  );
  const removeItem = useCallback((id: string, recId: string) => update((l) => l.map((p) => (p.id === id ? { ...p, items: p.items.filter((r) => r.id !== recId) } : p))), []);
  /** تحريك تسجيل لفوق (-1) أو لتحت (+1) جوه القائمة */
  const move = useCallback(
    (id: string, index: number, dir: -1 | 1) =>
      update((l) =>
        l.map((p) => {
          if (p.id !== id) return p;
          const to = index + dir;
          if (to < 0 || to >= p.items.length) return p;
          const items = [...p.items];
          [items[index], items[to]] = [items[to], items[index]];
          return { ...p, items };
        }),
      ),
    [],
  );

  return { lists, ready, create, rename, remove, toggleItem, removeItem, move };
}
