/** تلاوة اليوم: نفس اليوم = نفس التلاوة عند كل الزوار، واليوم اللي بعده واحدة تانية */
export function pickForDate<T>(date: string, pool: T[]): T | undefined {
  if (pool.length === 0) return undefined;
  let h = 0;
  for (const c of date) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}
