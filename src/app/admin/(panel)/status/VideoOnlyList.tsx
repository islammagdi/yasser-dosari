"use client";

import { useMemo, useState } from "react";

export interface VideoOnlyItem {
  id: string;
  title: string;
  group: string;
}

/**
 * التسجيلات اللي لسه بتتشغّل كفيديو من يوتيوب (ملهاش ملف صوت على R2).
 * تقدر تنسخ الروابط أو تنزّلها كملف txt، وتديها لـ yt-dlp أو أداة التحويل عشان تنزّلها هي بالتحديد.
 */
export function VideoOnlyList({ items }: { items: VideoOnlyItem[] }) {
  const groups = useMemo(() => [...new Set(items.map((i) => i.group))], [items]);
  const [group, setGroup] = useState<string>("");
  const [note, setNote] = useState("");
  const shown = group ? items.filter((i) => i.group === group) : items;
  const urls = shown.map((i) => `https://www.youtube.com/watch?v=${i.id}`).join("\n");

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNote(`اتنسخ: ${label}`);
    } catch {
      setNote("النسخ مش شغال في المتصفح ده. استخدم «تنزيل txt».");
    }
    window.setTimeout(() => setNote(""), 2500);
  };

  if (!items.length) {
    return <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-muted">كل التسجيلات الظاهرة ليها ملف صوت ✓</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="القسم" className="min-h-10 rounded-xl border border-line-strong bg-ink px-3">
          <option value="">كل الأقسام ({items.length})</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g} ({items.filter((i) => i.group === g).length})
            </option>
          ))}
        </select>
        <button type="button" onClick={() => copy(urls, `${shown.length} رابط`)} className="min-h-10 rounded-full bg-accent px-4 font-semibold text-accent-ink hover:bg-accent-hover">
          نسخ الروابط
        </button>
        <button type="button" onClick={() => copy(shown.map((i) => i.id).join("\n"), `${shown.length} ID`)} className="min-h-10 rounded-full border border-line-strong px-4 font-semibold hover:border-gold/60">
          نسخ الـ IDs بس
        </button>
        <a
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(urls + "\n")}`}
          download={`video-only${group ? `-${group}` : ""}.txt`}
          className="flex min-h-10 items-center rounded-full border border-line-strong px-4 font-semibold hover:border-gold/60"
        >
          تنزيل txt
        </a>
        {note && <span className="text-gold-soft">{note}</span>}
      </div>

      <div className="max-h-[480px] overflow-auto rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-raised text-xs text-muted">
            <tr>
              <th className="px-3 py-2 text-start font-semibold">العنوان</th>
              <th className="px-3 py-2 text-start font-semibold">القسم</th>
              <th className="px-3 py-2 text-start font-semibold">ID</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((i) => (
              <tr key={i.id} className="border-t border-line">
                <td className="px-3 py-2">
                  <a href={`https://www.youtube.com/watch?v=${i.id}`} target="_blank" rel="noopener noreferrer" className="hover:text-gold-soft hover:underline">
                    {i.title}
                  </a>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-muted">{i.group}</td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => copy(i.id, i.id)} className="font-mono text-xs text-muted hover:text-text" dir="ltr" title="نسخ">
                    {i.id}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
