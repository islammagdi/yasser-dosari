"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "yd-favorites-v1";
const EVENT = "yd-favorites-change";

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** المفضلة محفوظة في المتصفح، ومتزامنة بين أي كومبوننت بيستخدمها */
export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  // false لحد ما نقرا التخزين أول مرة، عشان منعرضش "المفضلة فاضية" غلط
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setIds(read());
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

  const toggle = useCallback((id: string) => {
    const current = read();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* التخزين مش متاح */
    }
    setIds(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, ready, isFavorite, toggle };
}