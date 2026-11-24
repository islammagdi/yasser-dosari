import { recordings } from "@/lib/api";
import { loadSurahIndex } from "@/lib/surahData";
import { memo } from "@/lib/memo";

type ListOpts = Parameters<typeof recordings.list>[0];

/** تسجيلات قسم، متخزنة في الذاكرة */
export const listRecordings = memo((opts: ListOpts) => recordings.list(opts));

/** فهرس السور، متخزن في الذاكرة (أتقل حاجة في الموقع) */
export const surahIndex = memo(() => loadSurahIndex());